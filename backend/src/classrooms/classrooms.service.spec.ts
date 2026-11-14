// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { ClassroomsService } from './classrooms.service';

function makeService(opts: { classroom?: unknown } = {}) {
  const prisma = {
    classroom: {
      findFirst: jest.fn().mockResolvedValue('classroom' in opts ? opts.classroom : null),
    },
    classroomMember: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    lessonProgress: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { service: new ClassroomsService(prisma as unknown as PrismaService), prisma };
}

describe('ClassroomsService.join', () => {
  it('joins with a code typed in lower case with a dash', async () => {
    const { service, prisma } = makeService({ classroom: { id: 3, ownerId: 1, name: 'Net Sec A' } });
    await expect(service.join(7, 'abcd-efgh')).resolves.toEqual({ id: 3, name: 'Net Sec A' });

    expect(prisma.classroom.findFirst.mock.calls[0][0].where).toEqual({ joinCode: 'ABCDEFGH', joinOpen: true });
    expect(prisma.classroomMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: { classroomId: 3, userId: 7 } }),
    );
  });

  it('gives one answer for a wrong code and a closed classroom', async () => {
    const { service, prisma } = makeService({ classroom: null });
    await expect(service.join(7, 'ZZZZ-ZZZZ')).rejects.toBeInstanceOf(NotFoundException);
    // Closed classrooms are filtered out by the same query, so they look exactly like a wrong code.
    expect(prisma.classroom.findFirst.mock.calls[0][0].where.joinOpen).toBe(true);
    expect(prisma.classroomMember.upsert).not.toHaveBeenCalled();
  });

  it('stops an instructor from joining their own classroom', async () => {
    const { service, prisma } = makeService({ classroom: { id: 3, ownerId: 7, name: 'Mine' } });
    await expect(service.join(7, 'ABCDEFGH')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.classroomMember.upsert).not.toHaveBeenCalled();
  });
});

describe('ClassroomsService.findOne', () => {
  it('only lets the owner or a member look, and says "not found" to everyone else', async () => {
    const { service, prisma } = makeService({ classroom: null });
    await expect(service.findOne(3, 55)).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.classroom.findFirst.mock.calls[0][0].where).toEqual({
      id: 3,
      OR: [{ ownerId: 55 }, { members: { some: { userId: 55 } } }],
    });
  });

  it('shows published courses with how many lessons this student finished', async () => {
    const { service, prisma } = makeService({
      classroom: {
        id: 3,
        name: 'Net Sec A',
        description: '',
        owner: { displayName: 'Ms. Reyes' },
        courses: [
          { id: 10, title: 'Packets', slug: 'packets', summary: 's', level: 'BEGINNER', _count: { lessons: 4 } },
        ],
      },
    });
    prisma.lessonProgress.findMany.mockResolvedValue([
      { lesson: { courseId: 10 } },
      { lesson: { courseId: 10 } },
    ]);

    const classroom = await service.findOne(3, 7);
    expect(classroom.instructorName).toBe('Ms. Reyes');
    expect(classroom.courses).toEqual([
      { id: 10, title: 'Packets', slug: 'packets', summary: 's', level: 'BEGINNER', lessonCount: 4, completedLessons: 2 },
    ]);
    expect(prisma.classroom.findFirst.mock.calls[0][0].select.courses.where).toEqual({ published: true });
  });
});

describe('ClassroomsService.leave', () => {
  it('only removes the caller\'s own membership', async () => {
    const { service, prisma } = makeService();
    await service.leave(3, 7);
    expect(prisma.classroomMember.deleteMany).toHaveBeenCalledWith({ where: { classroomId: 3, userId: 7 } });
  });
});
