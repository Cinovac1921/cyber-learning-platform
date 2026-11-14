import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { courseVisibleTo, PUBLIC_COURSE, VISIBLE_LESSON } from './visibility';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public courses with visible-lesson counts and how many the user finished. */
  async list(userId: number) {
    const [courses, progress] = await Promise.all([
      this.prisma.course.findMany({
        where: PUBLIC_COURSE,
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          title: true,
          slug: true,
          summary: true,
          level: true,
          _count: { select: { lessons: { where: VISIBLE_LESSON } } },
        },
      }),
      this.prisma.lessonProgress.findMany({
        where: { userId, lesson: { ...VISIBLE_LESSON, course: PUBLIC_COURSE } },
        select: { lesson: { select: { courseId: true } } },
      }),
    ]);

    const doneByCourse = new Map<number, number>();
    for (const { lesson } of progress) {
      doneByCourse.set(lesson.courseId, (doneByCourse.get(lesson.courseId) ?? 0) + 1);
    }

    return courses.map(({ _count, ...course }) => ({
      ...course,
      lessonCount: _count.lessons,
      completedLessons: doneByCourse.get(course.id) ?? 0,
    }));
  }

  /** One course (public, or from one of the user's classrooms) with its lessons and which they finished. */
  async findBySlug(slug: string, userId: number) {
    const course = await this.prisma.course.findFirst({
      where: { slug, ...courseVisibleTo(userId) },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        level: true,
        lessons: {
          where: VISIBLE_LESSON,
          orderBy: { position: 'asc' },
          select: { id: true, position: true, title: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }

    const done = await this.prisma.lessonProgress.findMany({
      where: { userId, lesson: { courseId: course.id, ...VISIBLE_LESSON } },
      select: { lessonId: true },
    });
    const doneIds = new Set(done.map((entry) => entry.lessonId));

    return {
      ...course,
      completedLessons: doneIds.size,
      // `position` is the lesson's place in the course (and its URL); `number` counts only
      // the lessons students can see, so hiding one never leaves a gap in what they read.
      lessons: course.lessons.map((lesson, index) => ({
        ...lesson,
        number: index + 1,
        completed: doneIds.has(lesson.id),
      })),
    };
  }

  /** One lesson with its text, neighbours and whether the user finished it. */
  async findLesson(slug: string, position: number, userId: number) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { position, ...VISIBLE_LESSON, course: { slug, ...courseVisibleTo(userId) } },
      select: {
        id: true,
        courseId: true,
        position: true,
        title: true,
        content: true,
        course: { select: { title: true, slug: true } },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }

    const [previous, next, before, progress] = await Promise.all([
      this.prisma.lesson.findFirst({
        where: { courseId: lesson.courseId, ...VISIBLE_LESSON, position: { lt: position } },
        orderBy: { position: 'desc' },
        select: { position: true },
      }),
      this.prisma.lesson.findFirst({
        where: { courseId: lesson.courseId, ...VISIBLE_LESSON, position: { gt: position } },
        orderBy: { position: 'asc' },
        select: { position: true },
      }),
      this.prisma.lesson.count({
        where: { courseId: lesson.courseId, ...VISIBLE_LESSON, position: { lt: position } },
      }),
      this.prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
        select: { id: true },
      }),
    ]);

    return {
      id: lesson.id,
      position: lesson.position,
      number: before + 1,
      title: lesson.title,
      content: lesson.content,
      course: lesson.course,
      completed: progress !== null,
      previousPosition: previous?.position ?? null,
      nextPosition: next?.position ?? null,
    };
  }

  /** Marks a lesson done (or not done) for the user. Safe to repeat. */
  async setLessonCompleted(slug: string, position: number, userId: number, completed: boolean) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { position, ...VISIBLE_LESSON, course: { slug, ...courseVisibleTo(userId) } },
      select: { id: true },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }

    if (completed) {
      await this.prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
        update: {},
        create: { userId, lessonId: lesson.id },
      });
    } else {
      await this.prisma.lessonProgress.deleteMany({
        where: { userId, lessonId: lesson.id },
      });
    }

    return { completed };
  }
}