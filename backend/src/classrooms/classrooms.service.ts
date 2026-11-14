import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { VISIBLE_LESSON } from '../courses/visibility';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeJoinCode } from './join-code';

/** The student's side of classrooms: joining, looking around, leaving. */
@Injectable()
export class ClassroomsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Classrooms the user has joined, newest first. */
  async listMine(userId: number) {
    const memberships = await this.prisma.classroomMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'desc' },
      select: {
        classroom: {
          select: {
            id: true,
            name: true,
            description: true,
            owner: { select: { displayName: true } },
            _count: { select: { courses: { where: { published: true } } } },
          },
        },
      },
    });

    return memberships.map(({ classroom }) => ({
      id: classroom.id,
      name: classroom.name,
      description: classroom.description,
      instructorName: classroom.owner.displayName,
      courseCount: classroom._count.courses,
    }));
  }

  /**
   * Joins a classroom by its code. A wrong code and a closed classroom get the
   * same answer, so nobody can tell which codes exist.
   */
  async join(userId: number, rawCode: string) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { joinCode: normalizeJoinCode(rawCode), joinOpen: true },
      select: { id: true, ownerId: true, name: true },
    });
    if (!classroom) {
      throw new NotFoundException('No open classroom matches that code.');
    }
    if (classroom.ownerId === userId) {
      throw new BadRequestException('You run this classroom, so there is nothing to join.');
    }

    await this.prisma.classroomMember.upsert({
      where: { classroomId_userId: { classroomId: classroom.id, userId } },
      update: {},
      create: { classroomId: classroom.id, userId },
    });
    return { id: classroom.id, name: classroom.name };
  }

  /** One classroom with its published courses. Only its members and its instructor may look. */
  async findOne(classroomId: number, userId: number) {
    const classroom = await this.prisma.classroom.findFirst({
      where: {
        id: classroomId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      select: {
        id: true,
        name: true,
        description: true,
        owner: { select: { displayName: true } },
        courses: {
          where: { published: true },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            level: true,
            _count: { select: { lessons: { where: VISIBLE_LESSON } } },
          },
        },
      },
    });
    if (!classroom) {
      throw new NotFoundException('Classroom not found.');
    }

    const done = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: { ...VISIBLE_LESSON, courseId: { in: classroom.courses.map((course) => course.id) } },
      },
      select: { lesson: { select: { courseId: true } } },
    });
    const doneByCourse = new Map<number, number>();
    for (const { lesson } of done) {
      doneByCourse.set(lesson.courseId, (doneByCourse.get(lesson.courseId) ?? 0) + 1);
    }

    return {
      id: classroom.id,
      name: classroom.name,
      description: classroom.description,
      instructorName: classroom.owner.displayName,
      courses: classroom.courses.map(({ _count, ...course }) => ({
        ...course,
        lessonCount: _count.lessons,
        completedLessons: doneByCourse.get(course.id) ?? 0,
      })),
    };
  }

  /** Leaves a classroom. Lesson progress is kept in case the student rejoins. */
  async leave(classroomId: number, userId: number) {
    await this.prisma.classroomMember.deleteMany({ where: { classroomId, userId } });
    return { ok: true };
  }
}
