import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertEditable } from './course-lock';
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
        reviewStatus: true,
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
        reviewStatus: true,
        reviewNote: true,
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
      reviewStatus?: 'NONE' | 'APPROVED';
      reviewNote?: null;
      reviewedAt?: Date | null;
      reviewedById?: number | null;
    } = {};

    if (dto.title !== undefined || dto.summary !== undefined || dto.level !== undefined) {
      assertEditable(course.reviewStatus);
    }
    if (dto.title !== undefined) data.title = clean(dto.title, 'Title');
    if (dto.summary !== undefined) data.summary = clean(dto.summary, 'Summary');
    if (dto.level !== undefined) data.level = dto.level;

    if (dto.published !== undefined) {
      if (course.scope === 'PUBLIC') {
        // Only a review (or an admin's own publish) can put a course in the public library.
        throw new BadRequestException(
          'Public courses go live through review. Use "Submit for review", or "Withdraw" to take one offline.',
        );
      }
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
      // Moving a course starts its review over. An admin who moves a published course into the
      // public library is approving it in the same step.
      data.reviewNote = null;
      if (dto.scope === 'PUBLIC' && course.published) {
        data.reviewStatus = 'APPROVED';
        data.reviewedById = userId;
        data.reviewedAt = new Date();
      } else {
        data.reviewStatus = 'NONE';
        data.reviewedById = null;
        data.reviewedAt = null;
      }
    }

    await this.prisma.course.update({ where: { id: courseId }, data });
    return { ok: true };
  }

  /**
   * Sends a public-library course to the admins. An admin's own course goes live straight away,
   * since admins are the reviewers. Either way the course is locked from now on.
   */
  async submitForReview(courseId: number, userId: number) {
    const course = await this.ownCourse(courseId, userId);

    if (course.scope !== 'PUBLIC') {
      throw new BadRequestException('Only courses for the public library go through review.');
    }
    if (course.reviewStatus === 'PENDING') {
      throw new BadRequestException('This course is already waiting for review.');
    }
    if (course.reviewStatus === 'APPROVED') {
      throw new BadRequestException('This course is already live.');
    }
    if (course._count.lessons === 0) {
      throw new BadRequestException('Add at least one visible lesson before submitting.');
    }

    const now = new Date();
    const admin = await this.isAdmin(userId);
    const data = admin
      ? {
          reviewStatus: 'APPROVED' as const,
          published: true,
          submittedAt: now,
          reviewedAt: now,
          reviewedById: userId,
          reviewNote: null,
        }
      : {
          reviewStatus: 'PENDING' as const,
          submittedAt: now,
          reviewedAt: null,
          reviewedById: null,
          reviewNote: null,
        };

    // One database step that only succeeds from a draft or a rejection, so two clicks can't both win.
    const result = await this.prisma.course.updateMany({
      where: { id: courseId, authorId: userId, scope: 'PUBLIC', reviewStatus: { in: ['NONE', 'REJECTED'] } },
      data,
    });
    if (result.count !== 1) {
      throw new ConflictException('This course changed while you were submitting it. Reload and try again.');
    }
    return { reviewStatus: data.reviewStatus };
  }

  /** Takes a pending or live public course back to a draft, which unlocks it for editing. */
  async withdraw(courseId: number, userId: number) {
    await this.ownCourse(courseId, userId);

    const result = await this.prisma.course.updateMany({
      where: { id: courseId, authorId: userId, scope: 'PUBLIC', reviewStatus: { in: ['PENDING', 'APPROVED'] } },
      data: { reviewStatus: 'NONE', published: false, reviewNote: null },
    });
    if (result.count !== 1) {
      throw new BadRequestException("This course isn't waiting for review or live, so there is nothing to withdraw.");
    }
    return { ok: true };
  }

  /** Deleting a course also deletes its lessons and students' progress on them. */
  async deleteCourse(courseId: number, userId: number) {
    const course = await this.ownCourse(courseId, userId);
    assertEditable(course.reviewStatus);
    await this.prisma.course.delete({ where: { id: courseId } });
    return { ok: true };
  }

  // ---------- lessons ----------

  /** Adds a lesson at the end of the course. */
  async createLesson(courseId: number, userId: number, dto: CreateLessonDto) {
    const course = await this.ownCourse(courseId, userId);
    assertEditable(course.reviewStatus);

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
    assertEditable(lesson.course.reviewStatus);

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
    assertEditable(lesson.course.reviewStatus);

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
    assertEditable(lesson.course.reviewStatus);

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
        published: true,
        reviewStatus: true,
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
        course: { select: { published: true, reviewStatus: true } },
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
  private async isAdmin(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === 'ADMIN';
  }

  private async assertAdmin(userId: number) {
    if (!(await this.isAdmin(userId))) {
      throw new ForbiddenException('Only admins can change where a course appears.');
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