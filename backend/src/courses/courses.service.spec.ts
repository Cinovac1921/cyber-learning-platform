// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from './courses.service';
import { PUBLIC_COURSE, VISIBLE_LESSON } from './visibility';

type Where = { position?: { lt?: number; gt?: number } };

function makeService(overrides: {
  lessonRow?: unknown;
  course?: unknown;
  progress?: unknown[];
  visibleBefore?: number;
  neighbours?: { previous?: number; next?: number };
} = {}) {
  const lessonFindFirst = jest.fn(({ where }: { where: Where }) => {
    if (where.position?.lt !== undefined) {
      return Promise.resolve(
        overrides.neighbours?.previous ? { position: overrides.neighbours.previous } : null,
      );
    }
    if (where.position?.gt !== undefined) {
      return Promise.resolve(overrides.neighbours?.next ? { position: overrides.neighbours.next } : null);
    }
    return Promise.resolve('lessonRow' in overrides ? overrides.lessonRow : null);
  });
  const prisma = {
    course: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue('course' in overrides ? overrides.course : null),
    },
    lesson: {
      findFirst: lessonFindFirst,
      count: jest.fn().mockResolvedValue(overrides.visibleBefore ?? 0),
    },
    lessonProgress: {
      findMany: jest.fn().mockResolvedValue(overrides.progress ?? []),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
  };
  return { service: new CoursesService(prisma as unknown as PrismaService), prisma };
}

describe('CoursesService.list', () => {
  it('only lists public courses and counts only visible lessons', async () => {
    const { service, prisma } = makeService();
    await service.list(7);

    const query = prisma.course.findMany.mock.calls[0][0];
    expect(query.where).toEqual(PUBLIC_COURSE);
    expect(query.select._count.select.lessons).toEqual({ where: VISIBLE_LESSON });

    const progress = prisma.lessonProgress.findMany.mock.calls[0][0];
    expect(progress.where.lesson).toEqual({ ...VISIBLE_LESSON, course: PUBLIC_COURSE });
  });
});

describe('CoursesService.findBySlug', () => {
  it('asks only for public courses and visible lessons', async () => {
    const { service, prisma } = makeService({ course: null });
    await expect(service.findBySlug('web', 7)).rejects.toBeInstanceOf(NotFoundException);

    const query = prisma.course.findFirst.mock.calls[0][0];
    expect(query.where).toEqual({ slug: 'web', ...PUBLIC_COURSE });
    expect(query.select.lessons.where).toEqual(VISIBLE_LESSON);
  });

  it('numbers lessons in a row even when a hidden lesson leaves a gap in positions', async () => {
    const { service } = makeService({
      course: {
        id: 1,
        title: 'Web',
        slug: 'web',
        summary: 's',
        level: 'BEGINNER',
        // Position 2 is hidden, so the database never returns it.
        lessons: [
          { id: 10, position: 1, title: 'A' },
          { id: 12, position: 3, title: 'B' },
          { id: 13, position: 4, title: 'C' },
        ],
      },
      progress: [{ lessonId: 12 }],
    });

    const course = await service.findBySlug('web', 7);
    expect(course.lessons.map((lesson) => [lesson.position, lesson.number])).toEqual([
      [1, 1],
      [3, 2],
      [4, 3],
    ]);
    expect(course.lessons.map((lesson) => lesson.completed)).toEqual([false, true, false]);
    expect(course.completedLessons).toBe(1);
  });
});

describe('CoursesService.findLesson', () => {
  const lessonRow = {
    id: 12,
    courseId: 1,
    position: 3,
    title: 'B',
    content: 'text',
    course: { title: 'Web', slug: 'web' },
  };

  it('treats a hidden lesson like one that does not exist', async () => {
    const { service, prisma } = makeService({ lessonRow: null });
    await expect(service.findLesson('web', 2, 7)).rejects.toBeInstanceOf(NotFoundException);

    const query = prisma.lesson.findFirst.mock.calls[0][0];
    expect(query.where).toEqual({
      position: 2,
      ...VISIBLE_LESSON,
      course: { slug: 'web', ...PUBLIC_COURSE },
    });
  });

  it('skips hidden lessons for previous/next and counts only visible ones for its number', async () => {
    const { service, prisma } = makeService({
      lessonRow,
      visibleBefore: 1, // only lesson 1 is visible before position 3
      neighbours: { previous: 1, next: 4 },
    });

    const lesson = await service.findLesson('web', 3, 7);
    expect(lesson.number).toBe(2);
    expect(lesson.previousPosition).toBe(1);
    expect(lesson.nextPosition).toBe(4);

    for (const [{ where }] of prisma.lesson.findFirst.mock.calls.slice(1)) {
      expect(where).toMatchObject(VISIBLE_LESSON);
    }
    expect(prisma.lesson.count.mock.calls[0][0].where).toMatchObject(VISIBLE_LESSON);
  });
});

describe('CoursesService.setLessonCompleted', () => {
  it('does not record progress on a hidden lesson', async () => {
    const { service, prisma } = makeService({ lessonRow: null });
    await expect(service.setLessonCompleted('web', 2, 7, true)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.lessonProgress.upsert).not.toHaveBeenCalled();
  });
});
