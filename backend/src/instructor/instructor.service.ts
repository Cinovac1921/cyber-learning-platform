import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto, type CourseScopeValue, UpdateCourseDto } from './dto/course.dto';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { slugify } from './slug';

/** Trims text and rejects values that are only spaces. */
function clean(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new BadRequestException(`${label} can't be empty.`);
  }
  return trimmed;
}

@Injectable()
export class InstructorService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- courses ----------

  /** Every course the instructor wrote, drafts included. */
  async listCourses(userId: number) {
    const courses = await this.prisma.course.findMany({
      where: { authorId: userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        level: true,
        published: true,
        scope: true,
        classroom: { select: { name: true } },
        updatedAt: true,
        _count: { select: { lessons: true } },
      },
    });

    return courses.map(({ _count, ...course }) => ({
      ...course,
      lessonCount: _count.lessons,
    }));
  }

  async createCourse(userId: number, dto: CreateCourseDto) {
    const title = clean(dto.title, 'Title');
    const summary = clean(dto.summary, 'Summary');
    const slug = await this.uniqueSlug(slugify(title));

    // A course made for a classroom belongs to it from the start and stays private to it.
    const classroomId =
      dto.classroomId === undefined ? null : await this.ownClassroomId(dto.classroomId, userId);

    return this.prisma.course.create({
      data: {
        title,
        slug,
        summary,
        level: dto.level,
        authorId: userId,
        ...(classroomId === null ? {} : { scope: 'CLASSROOM' as const, classroomId }),
      },
      select: { id: true, slug: true },
    });
  }

  /** One course with every lesson's full text, for the editor. */
  async getCourse(courseId: number, userId: number) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, authorId: userId },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        level: true,
        published: true,
        scope: true,
        classroom: { select: { id: true, name: true } },
        lessons: {
          orderBy: { position: 'asc' },
          select: { id: true, position: true, title: true, content: true, visible: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    return course;
  }

  async updateCourse(courseId: number, userId: number, dto: UpdateCourseDto) {
    const course = await this.ownCourse(courseId, userId);

    const data: {
      title?: string;
      summary?: string;
      level?: UpdateCourseDto['level'];
      published?: boolean;
      scope?: CourseScopeValue;
    } = {};
    if (dto.title !== undefined) data.title = clean(dto.title, 'Title');
    if (dto.summary !== undefined) data.summary = clean(dto.summary, 'Summary');
    if (dto.level !== undefined) data.level = dto.level;
    if (dto.published !== undefined) {
      if (dto.published && course._count.lessons === 0) {
        throw new BadRequestException('Add at least one visible lesson before publishing.');
      }
      data.published = dto.published;
    }
    if (dto.scope !== undefined && dto.scope !== course.scope) {
      if (course.scope === 'CLASSROOM') {
        // Moving it out would make the classroom's lessons and graded quizzes public.
        throw new BadRequestException(
          "A classroom course stays inside its classroom. It can't move to the public library or the templates.",
        );
      }
      await this.assertAdmin(userId);
      data.scope = dto.scope;
    }

    await this.prisma.course.update({ where: { id: courseId }, data });
    return { ok: true };
  }

  /** Deleting a course also deletes its lessons and students' progress on them. */
  async deleteCourse(courseId: number, userId: number) {
    await this.ownCourse(courseId, userId);
    await this.prisma.course.delete({ where: { id: courseId } });
    return { ok: true };
  }

  // ---------- lessons ----------

  /** Adds a lesson at the end of the course. */
  async createLesson(courseId: number, userId: number, dto: CreateLessonDto) {
    await this.ownCourse(courseId, userId);

    const last = await this.prisma.lesson.findFirst({
      where: { courseId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    return this.prisma.lesson.create({
      data: {
        courseId,
        position: (last?.position ?? 0) + 1,
        title: clean(dto.title, 'Title'),
        content: clean(dto.content, 'Lesson text'),
        visible: dto.visible ?? true,
      },
      select: { id: true, position: true },
    });
  }

  async updateLesson(lessonId: number, userId: number, dto: UpdateLessonDto) {
    const lesson = await this.ownLesson(lessonId, userId);

    const data: { title?: string; content?: string; visible?: boolean } = {};
    if (dto.title !== undefined) data.title = clean(dto.title, 'Title');
    if (dto.content !== undefined) data.content = clean(dto.content, 'Lesson text');
    if (dto.visible !== undefined) {
      if (!dto.visible && lesson.visible && lesson.course.published) {
        // A published course must keep something for students to read.
        const otherVisible = await this.prisma.lesson.count({
          where: { courseId: lesson.courseId, visible: true, id: { not: lessonId } },
        });
        if (otherVisible === 0) {
          throw new BadRequestException(
            'A published course needs at least one visible lesson. Keep another lesson visible, or unpublish the course first.',
          );
        }
      }
      data.visible = dto.visible;
    }

    await this.prisma.lesson.update({ where: { id: lessonId }, data });
    return { ok: true };
  }

  /** Deletes a lesson and closes the gap in the numbering. */
  async deleteLesson(lessonId: number, userId: number) {
    const lesson = await this.ownLesson(lessonId, userId);

    const following = await this.prisma.lesson.findMany({
      where: { courseId: lesson.courseId, position: { gt: lesson.position } },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    });

    // Runs in order inside one transaction: each lesson moves into the slot just freed.
    await this.prisma.$transaction([
      this.prisma.lesson.delete({ where: { id: lessonId } }),
      ...following.map((next) =>
        this.prisma.lesson.update({
          where: { id: next.id },
          data: { position: next.position - 1 },
        }),
      ),
    ]);
    return { ok: true };
  }

  /** Swaps a lesson with the one above or below it. */
  async moveLesson(lessonId: number, userId: number, direction: 'up' | 'down') {
    const lesson = await this.ownLesson(lessonId, userId);

    const neighbour = await this.prisma.lesson.findFirst({
      where: {
        courseId: lesson.courseId,
        position: direction === 'up' ? { lt: lesson.position } : { gt: lesson.position },
      },
      orderBy: { position: direction === 'up' ? 'desc' : 'asc' },
      select: { id: true, position: true },
    });

    if (!neighbour) {
      return { ok: true }; // already first or last
    }

    // Position 0 is never used by a real lesson, so it works as a temporary spot.
    await this.prisma.$transaction([
      this.prisma.lesson.update({ where: { id: lesson.id }, data: { position: 0 } }),
      this.prisma.lesson.update({ where: { id: neighbour.id }, data: { position: lesson.position } }),
      this.prisma.lesson.update({ where: { id: lesson.id }, data: { position: neighbour.position } }),
    ]);
    return { ok: true };
  }

  // ---------- helpers ----------

  /** A course that exists and belongs to this instructor, or a 404. */
  private async ownCourse(courseId: number, userId: number) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, authorId: userId },
      // `lessons` counts only visible lessons: that is what publishing depends on.
      select: {
        id: true,
        scope: true,
        _count: { select: { lessons: { where: { visible: true } } } },
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    return course;
  }

  private async ownLesson(lessonId: number, userId: number) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, course: { authorId: userId } },
      select: {
        id: true,
        courseId: true,
        position: true,
        visible: true,
        course: { select: { published: true } },
      },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }
    return lesson;
  }

  /** A classroom that exists and belongs to this instructor, or a 404. */
  private async ownClassroomId(classroomId: number, userId: number): Promise<number> {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, ownerId: userId },
      select: { id: true },
    });
    if (!classroom) {
      throw new NotFoundException('Classroom not found.');
    }
    return classroom.id;
  }

  /** Reads the role from the database (not the token), so a demoted admin is stopped at once. */
  private async assertAdmin(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (user?.role !== 'ADMIN') {
      throw new ForbiddenException("Only admins can change where a course appears.");
    }
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