// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { InstructorService } from './instructor.service';

function makeService(opts: {
  ownsClassroom?: boolean;
  course?: { scope?: string; visibleLessons?: number };
  role?: string;
  lesson?: { visible: boolean; published: boolean };
  otherVisible?: number;
} = {}) {
  const prisma = {
    course: {
      findFirst: jest.fn().mockResolvedValue({
        id: 1,
        scope: opts.course?.scope ?? 'PUBLIC',
        _count: { lessons: opts.course?.visibleLessons ?? 2 },
      }),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id: 8, slug: 'new-course' }),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    user: { findUnique: jest.fn().mockResolvedValue({ role: opts.role ?? 'INSTRUCTOR' }) },
    classroom: {
      findFirst: jest.fn().mockResolvedValue(opts.ownsClassroom === false ? null : { id: 3 }),
    },
    lesson: {
      findFirst: jest.fn().mockResolvedValue({
        id: 5,
        courseId: 1,
        position: 2,
        visible: opts.lesson?.visible ?? true,
        course: { published: opts.lesson?.published ?? true },
      }),
      count: jest.fn().mockResolvedValue(opts.otherVisible ?? 1),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id: 9, position: 3 }),
    },
  };
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

  it('lets an admin change the scope', async () => {
    const { service, prisma } = makeService({ role: 'ADMIN' });
    await service.updateCourse(1, 7, { scope: 'TEMPLATE' });
    expect(prisma.course.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { scope: 'TEMPLATE' } });
  });

  it('does not ask for admin rights when the scope is not actually changing', async () => {
    const { service, prisma } = makeService({ role: 'INSTRUCTOR', course: { scope: 'PUBLIC' } });
    await service.updateCourse(1, 7, { scope: 'PUBLIC', title: 'New title' });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.course.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { title: 'New title' } });
  });
});

describe('InstructorService.updateCourse: publishing', () => {
  it('needs at least one visible lesson', async () => {
    const { service, prisma } = makeService({ course: { visibleLessons: 0 } });
    await expect(service.updateCourse(1, 7, { published: true })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.course.update).not.toHaveBeenCalled();
  });

  it('works when a visible lesson exists', async () => {
    const { service, prisma } = makeService({ course: { visibleLessons: 1 } });
    await service.updateCourse(1, 7, { published: true });
    expect(prisma.course.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { published: true } });
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

  it('keeps courses without a classroom in the public library as before', async () => {
    const { service, prisma } = makeService();
    await service.createCourse(7, dto);
    const data = prisma.course.create.mock.calls[0][0].data;
    expect(data.scope).toBeUndefined();
    expect(data.classroomId).toBeUndefined();
  });
});
