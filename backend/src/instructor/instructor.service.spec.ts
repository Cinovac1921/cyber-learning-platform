// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { InstructorService } from './instructor.service';

function makeService(opts: {
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
    },
    user: { findUnique: jest.fn().mockResolvedValue({ role: opts.role ?? 'INSTRUCTOR' }) },
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
