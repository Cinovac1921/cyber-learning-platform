// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { AdminReviewsService } from './admin-reviews.service';

const row = {
  id: 3,
  title: 'Intro to SOC work',
  slug: 'intro-to-soc-work',
  summary: 's',
  level: 'BEGINNER',
  submittedAt: new Date('2026-11-10'),
  reviewedAt: null,
  author: { displayName: 'Ms. Reyes', email: 'reyes@example.com' },
  _count: { lessons: 4 },
};

function makeService(opts: { pending?: unknown; detail?: unknown; updated?: number } = {}) {
  const prisma = {
    course: {
      findMany: jest.fn().mockResolvedValue([row]),
      findFirst: jest.fn().mockResolvedValue('pending' in opts ? opts.pending : 'detail' in opts ? opts.detail : null),
      updateMany: jest.fn().mockResolvedValue({ count: opts.updated ?? 1 }),
    },
  };
  return { service: new AdminReviewsService(prisma as unknown as PrismaService), prisma };
}

describe('AdminReviewsService.list', () => {
  it('lists pending courses oldest first, and the live ones newest first', async () => {
    const { service, prisma } = makeService();
    const result = await service.list();

    const [pendingCall, liveCall] = prisma.course.findMany.mock.calls.map((call) => call[0]);
    expect(pendingCall.where).toEqual({ scope: 'PUBLIC', reviewStatus: 'PENDING' });
    expect(pendingCall.orderBy).toEqual({ submittedAt: 'asc' });
    expect(liveCall.where).toEqual({ scope: 'PUBLIC', reviewStatus: 'APPROVED' });
    expect(liveCall.orderBy).toEqual({ reviewedAt: 'desc' });
    expect(result.pending[0]).toMatchObject({ id: 3, lessonCount: 4, author: { displayName: 'Ms. Reyes' } });
    expect(result.pending[0]).not.toHaveProperty('_count');
  });
});

describe('AdminReviewsService.detail', () => {
  it('says "not found" for a course that is not in review, such as a draft or a classroom course', async () => {
    const { service, prisma } = makeService({ detail: null });
    await expect(service.detail(3)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.course.findFirst.mock.calls[0][0].where).toEqual({
      id: 3,
      scope: 'PUBLIC',
      reviewStatus: { in: ['PENDING', 'APPROVED', 'REJECTED'] },
    });
  });
});

describe('AdminReviewsService.approve', () => {
  it('puts a pending course live and records who decided', async () => {
    const { service, prisma } = makeService({ pending: { id: 3, _count: { lessons: 2 } } });
    await service.approve(3, 99);

    const call = prisma.course.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 3, scope: 'PUBLIC', reviewStatus: 'PENDING' });
    expect(call.data).toMatchObject({ reviewStatus: 'APPROVED', published: true, reviewNote: null, reviewedById: 99 });
    expect(call.data.reviewedAt).toBeInstanceOf(Date);
  });

  it('refuses a course that is not waiting for review', async () => {
    const { service, prisma } = makeService({ pending: null });
    await expect(service.approve(3, 99)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
  });

  it('refuses a course with no visible lessons', async () => {
    const { service, prisma } = makeService({ pending: { id: 3, _count: { lessons: 0 } } });
    await expect(service.approve(3, 99)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
  });

  it('loses gracefully when the instructor withdrew it at the same moment', async () => {
    const { service } = makeService({ pending: { id: 3, _count: { lessons: 2 } }, updated: 0 });
    await expect(service.approve(3, 99)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('AdminReviewsService.reject', () => {
  it('sends the course back with the reason, and keeps it offline', async () => {
    const { service, prisma } = makeService();
    await service.reject(3, 99, '  Lesson 2 copies another site word for word.  ');

    const call = prisma.course.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 3, scope: 'PUBLIC', reviewStatus: 'PENDING' });
    expect(call.data).toMatchObject({
      reviewStatus: 'REJECTED',
      published: false,
      reviewNote: 'Lesson 2 copies another site word for word.',
      reviewedById: 99,
    });
  });

  it('insists on a real reason', async () => {
    const { service, prisma } = makeService();
    await expect(service.reject(3, 99, '    ')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
  });

  it('says so when someone else already decided', async () => {
    const { service } = makeService({ updated: 0 });
    await expect(service.reject(3, 99, 'Not suitable for the library.')).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('AdminReviewsService.takedown', () => {
  it('takes a live course offline with a reason, and only from the live state', async () => {
    const { service, prisma } = makeService();
    await service.takedown(3, 99, 'Reported as inaccurate.');

    const call = prisma.course.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 3, scope: 'PUBLIC', reviewStatus: 'APPROVED' });
    expect(call.data).toMatchObject({ reviewStatus: 'REJECTED', published: false, reviewNote: 'Reported as inaccurate.' });
  });

  it('says so when the course is no longer live', async () => {
    const { service } = makeService({ updated: 0 });
    await expect(service.takedown(3, 99, 'Reported as inaccurate.')).rejects.toBeInstanceOf(ConflictException);
  });
});
