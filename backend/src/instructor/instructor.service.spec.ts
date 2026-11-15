// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { InstructorService } from './instructor.service';

interface Options {
  ownsClassroom?: boolean;
  course?: { scope?: string; visibleLessons?: number; reviewStatus?: string; published?: boolean };
  role?: string;
  lesson?: { visible: boolean; published: boolean; reviewStatus?: string };
  otherVisible?: number;
  updated?: number;
}

function makeService(opts: Options = {}) {
  const prisma = {
    course: {
      findFirst: jest.fn().mockResolvedValue({
        id: 1,
        title: 'Intro to SOC work',
        scope: opts.course?.scope ?? 'PUBLIC',
        published: opts.course?.published ?? false,
        reviewStatus: opts.course?.reviewStatus ?? 'NONE',
        _count: { lessons: opts.course?.visibleLessons ?? 2 },
      }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: opts.updated ?? 1 }),
      create: jest.fn().mockResolvedValue({ id: 8, slug: 'new-course' }),
      delete: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ role: opts.role ?? 'INSTRUCTOR', displayName: 'Ms. Reyes' }),
      findMany: jest.fn().mockResolvedValue([{ id: 90 }, { id: 91 }]),
    },
    notification: {
      createMany: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
    classroom: {
      findFirst: jest.fn().mockResolvedValue(opts.ownsClassroom === false ? null : { id: 3 }),
    },
    lesson: {
      findFirst: jest.fn().mockResolvedValue({
        id: 5,
        courseId: 1,
        position: 2,
        visible: opts.lesson?.visible ?? true,
        course: {
          published: opts.lesson?.published ?? true,
          reviewStatus: opts.lesson?.reviewStatus ?? 'NONE',
        },
      }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(opts.otherVisible ?? 1),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id: 9, position: 3 }),
      delete: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn(),
  };
  // A transaction either runs the steps it is given, or hands its steps this same client.
  prisma.$transaction.mockImplementation((work: unknown) =>
    typeof work === 'function' ? (work as (tx: unknown) => unknown)(prisma) : Promise.all(work as Promise<unknown>[]),
  );
  return { service: new InstructorService(prisma as unknown as PrismaService), prisma };
}

describe('InstructorService.updateCourse: scope', () => {
  it('stops an instructor from moving a course between the public library and templates', async () => {
    const { service, prisma } = makeService({ role: 'INSTRUCTOR' });
    await expect(service.updateCourse(1, 7, { scope: 'TEMPLATE' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.course.update).not.toHaveBeenCalled();
  });

  it('lets an admin move a course, which starts its review over', async () => {
    const { service, prisma } = makeService({ role: 'ADMIN', course: { reviewStatus: 'REJECTED' } });
    await service.updateCourse(1, 7, { scope: 'TEMPLATE' });
    expect(prisma.course.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { scope: 'TEMPLATE', reviewStatus: 'NONE', reviewNote: null, reviewedById: null, reviewedAt: null },
    });
  });

  it('counts an admin moving a published course into the public library as that admin approving it', async () => {
    const { service, prisma } = makeService({ role: 'ADMIN', course: { scope: 'TEMPLATE', published: true } });
    await service.updateCourse(1, 7, { scope: 'PUBLIC' });
    const data = prisma.course.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ scope: 'PUBLIC', reviewStatus: 'APPROVED', reviewedById: 7 });
    expect(data.reviewedAt).toBeInstanceOf(Date);
  });

  it('does not ask for admin rights when the scope is not actually changing', async () => {
    const { service, prisma } = makeService({ role: 'INSTRUCTOR', course: { scope: 'PUBLIC' } });
    await service.updateCourse(1, 7, { scope: 'PUBLIC', title: 'New title' });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.course.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { title: 'New title' } });
  });
});

describe('InstructorService.updateCourse: publishing', () => {
  it('never publishes a public-library course directly, because only a review can do that', async () => {
    const { service, prisma } = makeService({ course: { scope: 'PUBLIC', visibleLessons: 2 } });
    await expect(service.updateCourse(1, 7, { published: true })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.updateCourse(1, 7, { published: false })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.course.update).not.toHaveBeenCalled();
  });

  it('still lets a classroom course be published directly, when it has a visible lesson', async () => {
    const { service, prisma } = makeService({ course: { scope: 'CLASSROOM', visibleLessons: 1 } });
    await service.updateCourse(1, 7, { published: true });
    expect(prisma.course.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { published: true } });
  });

  it('needs at least one visible lesson', async () => {
    const { service, prisma } = makeService({ course: { scope: 'CLASSROOM', visibleLessons: 0 } });
    await expect(service.updateCourse(1, 7, { published: true })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.course.update).not.toHaveBeenCalled();
  });
});

describe('InstructorService: a course in review or live is locked', () => {
  it.each(['PENDING', 'APPROVED'])('refuses every edit while the course is %s', async (reviewStatus) => {
    const course = { reviewStatus };
    const lesson = { visible: true, published: true, reviewStatus };

    const a = makeService({ course });
    await expect(a.service.updateCourse(1, 7, { title: 'Sneaky new title' })).rejects.toBeInstanceOf(ConflictException);
    await expect(a.service.updateCourse(1, 7, { summary: 'A sneaky new summary here' })).rejects.toBeInstanceOf(ConflictException);
    await expect(a.service.deleteCourse(1, 7)).rejects.toBeInstanceOf(ConflictException);
    await expect(a.service.createLesson(1, 7, { title: 'New', content: 'Text' })).rejects.toBeInstanceOf(ConflictException);
    expect(a.prisma.course.update).not.toHaveBeenCalled();
    expect(a.prisma.course.delete).not.toHaveBeenCalled();
    expect(a.prisma.lesson.create).not.toHaveBeenCalled();

    const b = makeService({ lesson });
    await expect(b.service.updateLesson(5, 7, { content: 'Swapped content' })).rejects.toBeInstanceOf(ConflictException);
    await expect(b.service.updateLesson(5, 7, { visible: false })).rejects.toBeInstanceOf(ConflictException);
    await expect(b.service.deleteLesson(5, 7)).rejects.toBeInstanceOf(ConflictException);
    await expect(b.service.moveLesson(5, 7, 'up')).rejects.toBeInstanceOf(ConflictException);
    expect(b.prisma.lesson.update).not.toHaveBeenCalled();
    expect(b.prisma.lesson.delete).not.toHaveBeenCalled();
  });

  it.each(['NONE', 'REJECTED'])('allows edits while the course is %s', async (reviewStatus) => {
    const { service, prisma } = makeService({ course: { reviewStatus } });
    await service.updateCourse(1, 7, { title: 'A fine new title' });
    expect(prisma.course.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { title: 'A fine new title' } });
  });

  it('tells the instructor how to get unlocked', async () => {
    const { service } = makeService({ course: { reviewStatus: 'APPROVED' } });
    await expect(service.updateCourse(1, 7, { title: 'Sneaky new title' })).rejects.toThrow(/Withdraw it/);
  });

  it('never locks a classroom course, which does not go through review', async () => {
    const { service, prisma } = makeService({ course: { scope: 'CLASSROOM', reviewStatus: 'NONE' } });
    await service.updateCourse(1, 7, { title: 'Edit freely, classmates' });
    expect(prisma.course.update).toHaveBeenCalled();
  });
});

describe('InstructorService.updateLesson: visibility', () => {
  it('refuses to hide the last visible lesson of a published course', async () => {
    const { service, prisma } = makeService({ lesson: { visible: true, published: true }, otherVisible: 0 });
    await expect(service.updateLesson(5, 7, { visible: false })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.lesson.update).not.toHaveBeenCalled();
  });

  it('hides a lesson when another one stays visible', async () => {
    const { service, prisma } = makeService({ lesson: { visible: true, published: true }, otherVisible: 2 });
    await service.updateLesson(5, 7, { visible: false });
    expect(prisma.lesson.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { visible: false } });
  });

  it('lets an instructor hide any lesson while the course is still a draft', async () => {
    const { service, prisma } = makeService({ lesson: { visible: true, published: false }, otherVisible: 0 });
    await service.updateLesson(5, 7, { visible: false });
    expect(prisma.lesson.count).not.toHaveBeenCalled();
    expect(prisma.lesson.update).toHaveBeenCalled();
  });

  it('shows a hidden lesson again without extra checks', async () => {
    const { service, prisma } = makeService({ lesson: { visible: false, published: true }, otherVisible: 0 });
    await service.updateLesson(5, 7, { visible: true });
    expect(prisma.lesson.update).toHaveBeenCalledWith({ where: { id: 5 }, data: { visible: true } });
  });
});

describe('InstructorService.createLesson', () => {
  it('makes new lessons visible unless told otherwise', async () => {
    const { service, prisma } = makeService();
    prisma.lesson.findFirst.mockResolvedValueOnce({ position: 2 });
    await service.createLesson(1, 7, { title: 'Intro', content: 'Hello' });
    expect(prisma.lesson.create.mock.calls[0][0].data).toMatchObject({ position: 3, visible: true });
  });
});

describe('InstructorService.updateCourse: classroom courses', () => {
  it('never moves a classroom course to the public library, even for an admin', async () => {
    const { service, prisma } = makeService({ role: 'ADMIN', course: { scope: 'CLASSROOM' } });
    await expect(service.updateCourse(1, 7, { scope: 'PUBLIC' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.course.update).not.toHaveBeenCalled();
  });
});

describe('InstructorService.createCourse', () => {
  const dto = { title: 'Intro to SOC work', summary: 'What a SOC analyst does all day.', level: 'BEGINNER' } as const;

  it('creates a classroom course inside a classroom the instructor runs', async () => {
    const { service, prisma } = makeService();
    await service.createCourse(7, { ...dto, classroomId: 3 });
    expect(prisma.classroom.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3, ownerId: 7 } }),
    );
    expect(prisma.course.create.mock.calls[0][0].data).toMatchObject({ scope: 'CLASSROOM', classroomId: 3 });
  });

  it("refuses somebody else's classroom", async () => {
    const { service, prisma } = makeService({ ownsClassroom: false });
    await expect(service.createCourse(7, { ...dto, classroomId: 99 })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.course.create).not.toHaveBeenCalled();
  });

  it('starts a public-library course as an unreviewed draft', async () => {
    const { service, prisma } = makeService();
    await service.createCourse(7, dto);
    const data = prisma.course.create.mock.calls[0][0].data;
    expect(data.scope).toBeUndefined();
    expect(data.classroomId).toBeUndefined();
    expect(data.published).toBeUndefined();
    expect(data.reviewStatus).toBeUndefined();
  });
});

describe('InstructorService.submitForReview', () => {
  it('sends an instructor\'s draft to the admins, and nowhere else', async () => {
    const { service, prisma } = makeService({ role: 'INSTRUCTOR', course: { visibleLessons: 2 } });
    await expect(service.submitForReview(1, 7)).resolves.toEqual({ reviewStatus: 'PENDING' });

    const call = prisma.course.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({
      id: 1,
      authorId: 7,
      scope: 'PUBLIC',
      reviewStatus: { in: ['NONE', 'REJECTED'] },
    });
    expect(call.data).toMatchObject({ reviewStatus: 'PENDING', reviewNote: null });
    expect(call.data.published).toBeUndefined(); // an instructor can never set this
    expect(call.data.submittedAt).toBeInstanceOf(Date);
  });

  it('tells every admin in the same step, with a link to the review', async () => {
    const { service, prisma } = makeService({ role: 'INSTRUCTOR' });
    await service.submitForReview(1, 7);

    const { data } = prisma.notification.createMany.mock.calls[0][0] as {
      data: { userId: number; type: string; message: string; link: string }[];
    };
    expect(data.map((row) => row.userId)).toEqual([90, 91]);
    expect(data[0]).toMatchObject({ type: 'COURSE_SUBMITTED', link: '/admin/reviews/1' });
    expect(data[0].message).toContain('Ms. Reyes');
    expect(data[0].message).toContain('Intro to SOC work');
  });

  it('does not notify anyone when an admin publishes their own course', async () => {
    const { service, prisma } = makeService({ role: 'ADMIN' });
    await service.submitForReview(1, 7);
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('notifies nobody if the submission did not go through', async () => {
    const { service, prisma } = makeService({ updated: 0 });
    await expect(service.submitForReview(1, 7)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('goes live straight away for an admin, who is the reviewer', async () => {
    const { service, prisma } = makeService({ role: 'ADMIN' });
    await expect(service.submitForReview(1, 7)).resolves.toEqual({ reviewStatus: 'APPROVED' });
    expect(prisma.course.updateMany.mock.calls[0][0].data).toMatchObject({
      reviewStatus: 'APPROVED',
      published: true,
      reviewedById: 7,
    });
  });

  it('can be resubmitted after a rejection', async () => {
    const { service } = makeService({ course: { reviewStatus: 'REJECTED' } });
    await expect(service.submitForReview(1, 7)).resolves.toEqual({ reviewStatus: 'PENDING' });
  });

  it('needs a visible lesson', async () => {
    const { service, prisma } = makeService({ course: { visibleLessons: 0 } });
    await expect(service.submitForReview(1, 7)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
  });

  it('only applies to public-library courses', async () => {
    const { service, prisma } = makeService({ course: { scope: 'CLASSROOM' } });
    await expect(service.submitForReview(1, 7)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
  });

  it.each(['PENDING', 'APPROVED'])('refuses a course that is already %s', async (reviewStatus) => {
    const { service, prisma } = makeService({ course: { reviewStatus } });
    await expect(service.submitForReview(1, 7)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
  });

  it('says so when the course changed while submitting', async () => {
    const { service } = makeService({ updated: 0 });
    await expect(service.submitForReview(1, 7)).rejects.toBeInstanceOf(ConflictException);
  });

  it("treats somebody else's course as not found", async () => {
    const { service, prisma } = makeService();
    prisma.course.findFirst.mockResolvedValue(null);
    await expect(service.submitForReview(1, 99)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('InstructorService.withdraw', () => {
  it('takes a pending or live course offline and unlocks it', async () => {
    const { service, prisma } = makeService({ course: { reviewStatus: 'APPROVED' } });
    await service.withdraw(1, 7);
    expect(prisma.course.updateMany).toHaveBeenCalledWith({
      where: { id: 1, authorId: 7, scope: 'PUBLIC', reviewStatus: { in: ['PENDING', 'APPROVED'] } },
      data: { reviewStatus: 'NONE', published: false, reviewNote: null },
    });
  });

  it('removes the admins\' unread "submitted" notices, which would now lead nowhere', async () => {
    const { service, prisma } = makeService({ course: { reviewStatus: 'PENDING' } });
    await service.withdraw(1, 7);
    expect(prisma.notification.deleteMany).toHaveBeenCalledWith({
      where: { type: 'COURSE_SUBMITTED', readAt: null, link: '/admin/reviews/1' },
    });
  });

  it('has nothing to do for a course that is neither pending nor live', async () => {
    const { service, prisma } = makeService({ updated: 0 });
    await expect(service.withdraw(1, 7)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.notification.deleteMany).not.toHaveBeenCalled();
  });
});
