import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { VISIBLE_LESSON } from '../courses/visibility';
import { PrismaService } from '../prisma/prisma.service';
import { assertEditable } from './course-lock';
import { LIBRARY_COURSE, LIVE_PUBLIC_COURSE, TEMPLATE_COURSE } from './library';
import { slugify } from './slug';

/** Quizzes can only be taken from ready templates, so a public course's quizzes are never even loaded. */
const LIBRARY_QUIZ = { published: true, course: { scope: 'TEMPLATE' } } as const;

const quizContent = {
  title: true,
  description: true,
  passPercent: true,
  questions: {
    orderBy: { position: 'asc' },
    select: {
      position: true,
      prompt: true,
      explanation: true,
      options: { orderBy: { position: 'asc' }, select: { position: true, text: true, isCorrect: true } },
    },
  },
} as const;

type QuizContent = {
  title: string;
  description: string;
  passPercent: number;
  questions: {
    position: number;
    prompt: string;
    explanation: string;
    options: { position: number; text: string; isCorrect: boolean }[];
  }[];
};

/** The shape Prisma wants for creating a copy of a quiz. It always starts unpublished. */
function copyOfQuiz(quiz: QuizContent) {
  return {
    title: quiz.title,
    description: quiz.description,
    passPercent: quiz.passPercent,
    published: false,
    questions: {
      create: quiz.questions.map((question) => ({
        position: question.position,
        prompt: question.prompt,
        explanation: question.explanation,
        options: {
          create: question.options.map((option) => ({
            position: option.position,
            text: option.text,
            isCorrect: option.isCorrect,
          })),
        },
      })),
    },
  };
}

/**
 * The library an instructor can borrow from, and the copy tools. Everything is copied, never linked, so an
 * instructor can change their copy freely and later edits to the original never reach a running classroom.
 * Copies arrive hidden (lessons) or unpublished (quizzes), so nothing reaches students before the instructor
 * has looked it over.
 */
@Injectable()
export class InstructorLibraryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ready templates and live public courses. Only counts what an instructor could actually copy. */
  async list() {
    const select = {
      id: true,
      title: true,
      summary: true,
      level: true,
      scope: true,
      author: { select: { displayName: true } },
      _count: {
        select: {
          lessons: { where: VISIBLE_LESSON },
          assessments: { where: LIBRARY_QUIZ },
        },
      },
    } as const;

    const [templates, publicCourses] = await Promise.all([
      this.prisma.course.findMany({ where: TEMPLATE_COURSE, orderBy: { title: 'asc' }, select }),
      this.prisma.course.findMany({ where: LIVE_PUBLIC_COURSE, orderBy: { title: 'asc' }, select }),
    ]);

    const flatten = ({ _count, ...course }: (typeof templates)[number]) => ({
      ...course,
      lessonCount: _count.lessons,
      quizCount: _count.assessments,
    });
    return { templates: templates.map(flatten), publicCourses: publicCourses.map(flatten) };
  }

  /** One library course to look at before copying: its lessons, and for templates its quizzes. */
  async detail(courseId: number) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, ...LIBRARY_COURSE },
      select: {
        id: true,
        title: true,
        summary: true,
        level: true,
        scope: true,
        author: { select: { displayName: true } },
        lessons: {
          where: VISIBLE_LESSON,
          orderBy: { position: 'asc' },
          select: { id: true, position: true, title: true, content: true },
        },
        assessments: {
          where: LIBRARY_QUIZ,
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            passPercent: true,
            _count: { select: { questions: true } },
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('That course is not in the library.');
    }

    const { assessments, ...rest } = course;
    return {
      ...rest,
      assessments: assessments.map(({ _count, ...quiz }) => ({ ...quiz, questionCount: _count.questions })),
    };
  }

  /** Copies one lesson into a course of the instructor's. It arrives hidden. */
  async copyLesson(targetCourseId: number, userId: number, lessonId: number) {
    const target = await this.ownCourse(targetCourseId, userId);
    assertEditable(target.reviewStatus);

    const source = await this.prisma.lesson.findFirst({
      where: { id: lessonId, ...VISIBLE_LESSON, course: LIBRARY_COURSE },
      select: { title: true, content: true },
    });
    if (!source) {
      throw new NotFoundException('That lesson is not in the library.');
    }

    const last = await this.prisma.lesson.findFirst({
      where: { courseId: target.id },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    return this.prisma.lesson.create({
      data: {
        courseId: target.id,
        position: (last?.position ?? 0) + 1,
        title: source.title,
        content: source.content,
        visible: false,
      },
      select: { id: true, position: true },
    });
  }

  /**
   * Copies one template quiz, with its questions and answers, into a classroom course of the instructor's.
   * It arrives unpublished. A classroom course is the only possible target, so a graded-ready quiz can never
   * be copied into the public library.
   */
  async copyAssessment(targetCourseId: number, userId: number, assessmentId: number) {
    const target = await this.ownCourse(targetCourseId, userId);
    if (target.scope !== 'CLASSROOM') {
      throw new BadRequestException(
        'Quizzes can only be copied into a classroom course. A quiz made for grading must never end up in the public library.',
      );
    }
    assertEditable(target.reviewStatus);

    const source = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, ...LIBRARY_QUIZ },
      select: quizContent,
    });
    if (!source) {
      throw new NotFoundException('That quiz is not in the template library.');
    }

    return this.prisma.assessment.create({
      data: { courseId: target.id, ...copyOfQuiz(source) },
      select: { id: true },
    });
  }

  /** Makes a new classroom course from a library course: all its lessons (hidden), and a template's quizzes (unpublished). */
  async copyCourse(classroomId: number, userId: number, courseId: number) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, ownerId: userId },
      select: { id: true },
    });
    if (!classroom) {
      throw new NotFoundException('Classroom not found.');
    }

    const source = await this.prisma.course.findFirst({
      where: { id: courseId, ...LIBRARY_COURSE },
      select: {
        id: true,
        title: true,
        summary: true,
        level: true,
        lessons: {
          where: VISIBLE_LESSON,
          orderBy: { position: 'asc' },
          select: { title: true, content: true },
        },
        assessments: { where: LIBRARY_QUIZ, orderBy: { createdAt: 'asc' }, select: quizContent },
      },
    });
    if (!source) {
      throw new NotFoundException('That course is not in the library.');
    }

    return this.prisma.course.create({
      data: {
        title: source.title,
        slug: await this.uniqueSlug(slugify(source.title)),
        summary: source.summary,
        level: source.level,
        authorId: userId,
        scope: 'CLASSROOM',
        classroomId: classroom.id,
        copiedFromId: source.id,
        lessons: {
          create: source.lessons.map((lesson, index) => ({
            position: index + 1,
            title: lesson.title,
            content: lesson.content,
            visible: false,
          })),
        },
        assessments: { create: source.assessments.map(copyOfQuiz) },
      },
      select: { id: true },
    });
  }

  // ---------- helpers ----------

  /** A course that belongs to this instructor, or a 404. */
  private async ownCourse(courseId: number, userId: number) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, authorId: userId },
      select: { id: true, scope: true, reviewStatus: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    return course;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let attempt = 1;
    while (await this.prisma.course.findUnique({ where: { slug }, select: { id: true } })) {
      attempt += 1;
      slug = `${base}-${attempt}`;
    }
    return slug;
  }
}
