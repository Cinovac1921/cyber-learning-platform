// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { InstructorClassroomsService } from './instructor-classrooms.service';

interface Options {
  owns?: boolean;
  courses?: number;
  members?: unknown[];
  courseRows?: unknown[];
}

function makeService(opts: Options = {}) {
  const prisma = {
    classroom: {
      findFirst: jest.fn().mockResolvedValue(opts.owns === false ? null : { id: 3, name: 'Net Sec A' }),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 3 }),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    classroomMember: {
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue(opts.members ?? []),
    },
    course: {
      count: jest.fn().mockResolvedValue(opts.courses ?? 0),
      findMany: jest.fn().mockResolvedValue(opts.courseRows ?? []),
    },
    lessonProgress: { findMany: jest.fn().mockResolvedValue([]) },
    attempt: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { service: new InstructorClassroomsService(prisma as unknown as PrismaService), prisma };
}

describe('InstructorClassroomsService', () => {
  it('creates a classroom owned by the instructor with a fresh join code', async () => {
    const { service, prisma } = makeService();
    await service.create(7, { name: '  Net Sec A  ' });

    const data = prisma.classroom.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ ownerId: 7, name: 'Net Sec A', description: '' });
    expect(data.joinCode).toMatch(/^[A-Z2-9]{8}$/);
  });

  it('rejects a name that is only spaces', async () => {
    const { service, prisma } = makeService();
    await expect(service.create(7, { name: '     ' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.classroom.create).not.toHaveBeenCalled();
  });

  it('keeps asking for a code until it finds one nobody uses', async () => {
    const { service, prisma } = makeService();
    prisma.classroom.findUnique.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null);
    await service.create(7, { name: 'Net Sec A' });
    expect(prisma.classroom.findUnique).toHaveBeenCalledTimes(2);
  });

  it('treats a classroom run by someone else as not found, for every action', async () => {
    const { service, prisma } = makeService({ owns: false });
    await expect(service.get(3, 55)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(3, 55, { name: 'Hacked' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.regenerateJoinCode(3, 55)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.removeMember(3, 55, 9)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(3, 55)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.progress(3, 55)).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.classroom.update).not.toHaveBeenCalled();
    expect(prisma.classroomMember.deleteMany).not.toHaveBeenCalled();
    expect(prisma.classroom.delete).not.toHaveBeenCalled();
  });

  it('replaces the join code and shows it in the ABCD-EFGH form', async () => {
    const { service, prisma } = makeService();
    const { joinCode } = await service.regenerateJoinCode(3, 7);
    expect(joinCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(prisma.classroom.update.mock.calls[0][0].data.joinCode).toBe(joinCode.replace('-', ''));
  });

  it('can close joining without touching members', async () => {
    const { service, prisma } = makeService();
    await service.update(3, 7, { joinOpen: false });
    expect(prisma.classroom.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { joinOpen: false } });
    expect(prisma.classroomMember.deleteMany).not.toHaveBeenCalled();
  });

  it('removes one student from this classroom only', async () => {
    const { service, prisma } = makeService();
    await service.removeMember(3, 7, 9);
    expect(prisma.classroomMember.deleteMany).toHaveBeenCalledWith({ where: { classroomId: 3, userId: 9 } });
  });

  it('will not delete a classroom that still has courses', async () => {
    const { service, prisma } = makeService({ courses: 2 });
    await expect(service.remove(3, 7)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.classroom.delete).not.toHaveBeenCalled();
  });

  it('deletes an empty classroom', async () => {
    const { service, prisma } = makeService({ courses: 0 });
    await service.remove(3, 7);
    expect(prisma.classroom.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });
});

describe('InstructorClassroomsService.progress', () => {
  const member = { joinedAt: new Date('2026-11-01'), user: { id: 7, displayName: 'Sam', email: 'sam@example.com' } };
  const courseRow = {
    id: 10,
    title: 'Packets',
    _count: { lessons: 3 },
    assessments: [{ id: 80, title: 'Packets quiz', passPercent: 70 }],
  };

  it("only shows this classroom's own published courses and quizzes", async () => {
    const { service, prisma } = makeService({ members: [member], courseRows: [courseRow] });
    await service.progress(3, 7);

    const courseQuery = prisma.course.findMany.mock.calls[0][0];
    expect(courseQuery.where).toEqual({ classroomId: 3, published: true });
    expect(courseQuery.select.assessments.where).toEqual({ published: true });
  });

  it("only looks at the classroom's own students, and only at the classroom's own courses and quizzes", async () => {
    const { service, prisma } = makeService({ members: [member], courseRows: [courseRow] });
    await service.progress(3, 7);

    expect(prisma.classroomMember.findMany.mock.calls[0][0].where).toEqual({ classroomId: 3 });
    expect(prisma.lessonProgress.findMany.mock.calls[0][0].where).toEqual({
      userId: { in: [7] },
      lesson: { visible: true, courseId: { in: [10] } },
    });
    expect(prisma.attempt.findMany.mock.calls[0][0].where).toEqual({
      userId: { in: [7] },
      assessmentId: { in: [80] },
    });
  });

  it('returns the classroom, its courses and quizzes, and a row per student', async () => {
    const { service, prisma } = makeService({ members: [member], courseRows: [courseRow] });
    prisma.lessonProgress.findMany.mockResolvedValue([
      { userId: 7, completedAt: new Date('2026-11-05'), lesson: { courseId: 10 } },
    ]);
    prisma.attempt.findMany.mockResolvedValue([
      { userId: 7, assessmentId: 80, percent: 80, passed: true, createdAt: new Date('2026-11-06') },
    ]);

    const result = await service.progress(3, 7);
    expect(result.classroom).toEqual({ id: 3, name: 'Net Sec A' });
    expect(result.courses).toEqual([{ id: 10, title: 'Packets', lessonCount: 3, finishedCount: 0 }]);
    expect(result.quizzes[0]).toMatchObject({ id: 80, courseId: 10, passedCount: 1 });
    expect(result.students[0]).toMatchObject({
      userId: 7,
      displayName: 'Sam',
      courses: [{ courseId: 10, completedLessons: 1 }],
      quizzes: [{ assessmentId: 80, attempts: 1, bestPercent: 80, passed: true }],
    });
  });

  it('does not ask for progress when there are no students or no courses', async () => {
    const noStudents = makeService({ members: [], courseRows: [courseRow] });
    await expect(noStudents.service.progress(3, 7)).resolves.toMatchObject({ students: [] });
    expect(noStudents.prisma.lessonProgress.findMany).not.toHaveBeenCalled();

    const noCourses = makeService({ members: [member], courseRows: [] });
    const result = await noCourses.service.progress(3, 7);
    expect(result.students).toHaveLength(1);
    expect(noCourses.prisma.lessonProgress.findMany).not.toHaveBeenCalled();
    expect(noCourses.prisma.attempt.findMany).not.toHaveBeenCalled();
  });

  it('skips the quiz lookup for a classroom with courses but no published quizzes', async () => {
    const { service, prisma } = makeService({
      members: [member],
      courseRows: [{ ...courseRow, assessments: [] }],
    });
    await service.progress(3, 7);
    expect(prisma.lessonProgress.findMany).toHaveBeenCalled();
    expect(prisma.attempt.findMany).not.toHaveBeenCalled();
  });
});
