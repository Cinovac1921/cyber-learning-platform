import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VISIBLE_LESSON } from '../courses/visibility';
import { PrismaService } from '../prisma/prisma.service';

const listSelect = {
  id: true,
  title: true,
  slug: true,
  summary: true,
  level: true,
  submittedAt: true,
  reviewedAt: true,
  author: { select: { displayName: true, email: true } },
  _count: { select: { lessons: { where: VISIBLE_LESSON } } },
} as const;

const LIVE_LIST_SIZE = 100;

/** The admin's side of public-course review. Every method is behind AdminGuard. */
@Injectable()
export class AdminReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Courses waiting for a decision (oldest first), and the ones currently live in the public library. */
  async list() {
    const [pending, live] = await Promise.all([
      this.prisma.course.findMany({
        where: { scope: 'PUBLIC', reviewStatus: 'PENDING' },
        orderBy: { submittedAt: 'asc' },
        select: listSelect,
      }),
      this.prisma.course.findMany({
        where: { scope: 'PUBLIC', reviewStatus: 'APPROVED' },
        orderBy: { reviewedAt: 'desc' },
        take: LIVE_LIST_SIZE,
        select: listSelect,
      }),
    ]);

    const flatten = ({ _count, ...course }: (typeof pending)[number]) => ({
      ...course,
      lessonCount: _count.lessons,
    });
    return { pending: pending.map(flatten), live: live.map(flatten) };
  }

  /** Everything a reviewer needs to judge a course: all lessons (hidden ones marked) and every quiz with its answers. */
  async detail(courseId: number) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, scope: 'PUBLIC', reviewStatus: { in: ['PENDING', 'APPROVED', 'REJECTED'] } },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        level: true,
        reviewStatus: true,
        reviewNote: true,
        submittedAt: true,
        reviewedAt: true,
        author: { select: { displayName: true, email: true } },
        lessons: {
          orderBy: { position: 'asc' },
          select: { id: true, position: true, title: true, content: true, visible: true },
        },
        assessments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            passPercent: true,
            published: true,
            questions: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                prompt: true,
                explanation: true,
                options: { orderBy: { position: 'asc' }, select: { id: true, text: true, isCorrect: true } },
              },
            },
          },
        },
      },
    });
    if (!course) {
      throw new NotFoundException('Course not found, or it is not in review.');
    }
    return course;
  }

  /** Puts a pending course live in the public library. */
  async approve(courseId: number, adminId: number) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, scope: 'PUBLIC', reviewStatus: 'PENDING' },
      select: { id: true, _count: { select: { lessons: { where: VISIBLE_LESSON } } } },
    });
    if (!course) {
      throw new ConflictException('This course is no longer waiting for review.');
    }
    if (course._count.lessons === 0) {
      throw new BadRequestException('This course has no visible lessons, so it cannot go live.');
    }

    await this.decide(courseId, 'PENDING', {
      reviewStatus: 'APPROVED',
      published: true,
      reviewNote: null,
      reviewedAt: new Date(),
      reviewedById: adminId,
    });
    return { ok: true };
  }

  /** Sends a pending course back to its instructor with a reason. They can fix it and submit again. */
  async reject(courseId: number, adminId: number, note: string) {
    await this.decide(courseId, 'PENDING', {
      reviewStatus: 'REJECTED',
      published: false,
      reviewNote: cleanNote(note),
      reviewedAt: new Date(),
      reviewedById: adminId,
    });
    return { ok: true };
  }

  /** Takes a live course offline with a reason. It becomes editable again, and must be resubmitted. */
  async takedown(courseId: number, adminId: number, note: string) {
    await this.decide(courseId, 'APPROVED', {
      reviewStatus: 'REJECTED',
      published: false,
      reviewNote: cleanNote(note),
      reviewedAt: new Date(),
      reviewedById: adminId,
    });
    return { ok: true };
  }

  /**
   * One database step that only works from the expected state. If the instructor withdrew the course
   * a moment ago, or another admin already decided, nothing changes and the admin is told so.
   */
  private async decide(
    courseId: number,
    from: 'PENDING' | 'APPROVED',
    data: {
      reviewStatus: 'APPROVED' | 'REJECTED';
      published: boolean;
      reviewNote: string | null;
      reviewedAt: Date;
      reviewedById: number;
    },
  ) {
    const result = await this.prisma.course.updateMany({
      where: { id: courseId, scope: 'PUBLIC', reviewStatus: from },
      data,
    });
    if (result.count !== 1) {
      throw new ConflictException(
        from === 'PENDING'
          ? 'This course is no longer waiting for review. It may have been withdrawn or already decided.'
          : 'This course is no longer live. It may have been withdrawn or already taken down.',
      );
    }
  }
}

function cleanNote(note: string): string {
  const trimmed = note.trim();
  if (trimmed.length < 3) {
    throw new BadRequestException('Write a short reason for the instructor.');
  }
  return trimmed;
}
