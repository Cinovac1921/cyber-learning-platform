// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import type { MailService } from '../mail/mail.service';
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
const target = { id: 3, title: 'Intro to SOC work', author: { id: 5, email: 'reyes@example.com' } };

interface Options {
  /** What the approve check finds (a pending course with its lesson count). */
  pending?: unknown;
  detail?: unknown;
  /** What the decision looks up. */
  target?: unknown;
  updated?: number;
  mailFails?: boolean;
}

function makeService(opts: Options = {}) {
  const prisma = {
    course: {
      findMany: jest.fn().mockResolvedValue([row]),
      count: jest.fn().mockResolvedValue(2),
      findFirst: jest.fn((args: { select: Record<string, unknown> }) => {
        if (args.select._count) return Promise.resolve('pending' in opts ? opts.pending : null);
        if (args.select.lessons) return Promise.resolve('detail' in opts ? opts.detail : null);
        return Promise.resolve('target' in opts ? opts.target : target);
      }),
      updateMany: jest.fn().mockResolvedValue({ count: opts.updated ?? 1 }),
    },
    notification: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((work: (tx: unknown) => unknown) => work(prisma));

  const mail = {
    appUrl: 'http://localhost:5173',
    send: opts.mailFails ? jest.fn().mockRejectedValue(new Error('SMTP down')) : jest.fn().mockResolvedValue(undefined),
  };
  const service = new AdminReviewsService(prisma as unknown as PrismaService, mail as unknown as MailService);
  return { service, prisma, mail };
}

/** The email is sent after the decision, without making the admin wait, so let it finish first. */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

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

describe('AdminReviewsService.pendingCount', () => {
  it('counts the public courses waiting for a decision', async () => {
    const { service, prisma } = makeService();
    await expect(service.pendingCount()).resolves.toEqual({ pending: 2 });
    expect(prisma.course.count).toHaveBeenCalledWith({ where: { scope: 'PUBLIC', reviewStatus: 'PENDING' } });
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
  const pending = { id: 3, _count: { lessons: 2 } };

  it('puts a pending course live and records who decided', async () => {
    const { service, prisma } = makeService({ pending });
    await service.approve(3, 99);

    const call = prisma.course.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ id: 3, scope: 'PUBLIC', reviewStatus: 'PENDING' });
    expect(call.data).toMatchObject({ reviewStatus: 'APPROVED', published: true, reviewNote: null, reviewedById: 99 });
    expect(call.data.reviewedAt).toBeInstanceOf(Date);
  });

  it('tells the instructor in the same transaction, and emails them', async () => {
    const { service, prisma, mail } = makeService({ pending });
    await service.approve(3, 99);
    await flush();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const { data } = prisma.notification.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data).toMatchObject({ userId: 5, type: 'COURSE_APPROVED', link: '/instructor/courses/3' });
    expect(String(data.message)).toContain('Intro to SOC work');

    expect(mail.send).toHaveBeenCalledTimes(1);
    const email = mail.send.mock.calls[0][0] as { to: string; subject: string; text: string };
    expect(email.to).toBe('reyes@example.com');
    expect(email.subject).toContain('approved');
    expect(email.text).toContain('http://localhost:5173/instructor/courses/3');
  });

  it('refuses a course that is not waiting for review, with no notification or email', async () => {
    const { service, prisma, mail } = makeService({ pending: null });
    await expect(service.approve(3, 99)).rejects.toBeInstanceOf(ConflictException);
    await flush();
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('refuses a course with no visible lessons', async () => {
    const { service, prisma } = makeService({ pending: { id: 3, _count: { lessons: 0 } } });
    await expect(service.approve(3, 99)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.course.updateMany).not.toHaveBeenCalled();
  });

  it('loses gracefully when the instructor withdrew it at the same moment: no notification, no email', async () => {
    const { service, prisma, mail } = makeService({ pending, updated: 0 });
    await expect(service.approve(3, 99)).rejects.toBeInstanceOf(ConflictException);
    await flush();
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('is not undone when the email cannot be sent', async () => {
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { service, prisma, mail } = makeService({ pending, mailFails: true });

    await expect(service.approve(3, 99)).resolves.toEqual({ ok: true });
    await flush();

    expect(prisma.notification.create).toHaveBeenCalled();
    expect(mail.send).toHaveBeenCalled();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
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

  it('puts the reason in the notification and the full reason in the email', async () => {
    const { service, prisma, mail } = makeService();
    const reason = `Lesson 2 copies another site. ${'More detail. '.repeat(40)}`.trim();
    await service.reject(3, 99, reason);
    await flush();

    const { data } = prisma.notification.create.mock.calls[0][0] as { data: { type: string; message: string } };
    expect(data.type).toBe('COURSE_REJECTED');
    expect(data.message).toContain('Lesson 2 copies another site.');
    expect(data.message.length).toBeLessThanOrEqual(500);

    const email = mail.send.mock.calls[0][0] as { subject: string; text: string };
    expect(email.subject).toContain('sent back');
    expect(email.text).toContain(reason);
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

  it('says so when the course is not waiting for review at all', async () => {
    const { service, prisma } = makeService({ target: null });
    await expect(service.reject(3, 99, 'Not suitable for the library.')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.notification.create).not.toHaveBeenCalled();
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

  it('notifies and emails the instructor that it was taken offline', async () => {
    const { service, prisma, mail } = makeService();
    await service.takedown(3, 99, 'Reported as inaccurate.');
    await flush();

    expect(prisma.notification.create.mock.calls[0][0].data).toMatchObject({ type: 'COURSE_TAKEN_DOWN' });
    expect(mail.send.mock.calls[0][0].subject).toContain('offline');
  });

  it('says so when the course is no longer live', async () => {
    const { service } = makeService({ updated: 0 });
    await expect(service.takedown(3, 99, 'Reported as inaccurate.')).rejects.toBeInstanceOf(ConflictException);
  });
});
