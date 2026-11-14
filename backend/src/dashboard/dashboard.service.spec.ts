// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PUBLIC_COURSE, VISIBLE_LESSON } from '../courses/visibility';
import type { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

const NOW = new Date('2026-11-14T08:00:00Z');

function makeService(opts: { progress?: unknown[]; courses?: unknown[]; suggestions?: unknown[] }) {
  // Call order inside the service: progress, then the started courses, then the suggestions.
  const courseFindMany = jest.fn();
  if (opts.courses) courseFindMany.mockResolvedValueOnce(opts.courses);
  courseFindMany.mockResolvedValueOnce(opts.suggestions ?? []);

  const prisma = {
    lessonProgress: { findMany: jest.fn().mockResolvedValue(opts.progress ?? []) },
    course: { findMany: courseFindMany },
  };
  return { service: new DashboardService(prisma as unknown as PrismaService), prisma };
}

describe('DashboardService.get', () => {
  it('points next-lesson at the real position but numbers it by visible lessons', async () => {
    const { service } = makeService({
      progress: [
        { lessonId: 10, completedAt: NOW, lesson: { courseId: 1 } },
      ],
      courses: [
        {
          id: 1,
          title: 'Web',
          slug: 'web',
          // Position 2 is hidden, so it never comes back from the database.
          lessons: [
            { id: 10, position: 1, title: 'A' },
            { id: 12, position: 3, title: 'B' },
          ],
        },
      ],
    });

    const data = await service.get(7, 0, NOW);
    expect(data.courses[0].totalLessons).toBe(2);
    expect(data.courses[0].completedLessons).toBe(1);
    expect(data.courses[0].nextLesson).toEqual({ id: 12, number: 2, position: 3, title: 'B' });
  });

  it('only counts progress on public courses and visible lessons', async () => {
    const { service, prisma } = makeService({});
    await service.get(7, 0, NOW);
    expect(prisma.lessonProgress.findMany.mock.calls[0][0].where.lesson).toEqual({
      ...VISIBLE_LESSON,
      course: PUBLIC_COURSE,
    });
  });

  it('suggests public courses the student has not started, and nothing empty', async () => {
    const { service, prisma } = makeService({
      progress: [{ lessonId: 10, completedAt: NOW, lesson: { courseId: 1 } }],
      courses: [{ id: 1, title: 'Web', slug: 'web', lessons: [{ id: 10, position: 1, title: 'A' }] }],
      suggestions: [
        {
          id: 2,
          title: 'Networks',
          slug: 'networks',
          summary: 'Addresses and ports.',
          level: 'BEGINNER',
          _count: { lessons: 3 },
        },
      ],
    });

    const data = await service.get(7, 0, NOW);
    expect(data.library).toEqual([
      { id: 2, title: 'Networks', slug: 'networks', summary: 'Addresses and ports.', level: 'BEGINNER', lessonCount: 3 },
    ]);

    const suggestionQuery = prisma.course.findMany.mock.calls[1][0];
    expect(suggestionQuery.where).toEqual({
      ...PUBLIC_COURSE,
      id: { notIn: [1] },
      lessons: { some: VISIBLE_LESSON },
    });
    expect(suggestionQuery.take).toBe(6);
  });

  it('still shows the library to a student with no progress yet', async () => {
    const { service, prisma } = makeService({
      suggestions: [
        { id: 2, title: 'N', slug: 'n', summary: 's', level: 'BEGINNER', _count: { lessons: 1 } },
      ],
    });
    const data = await service.get(7, 0, NOW);
    expect(data.courses).toEqual([]);
    expect(data.library).toHaveLength(1);
    // With no started courses there is nothing to look up, only the suggestions query runs.
    expect(prisma.course.findMany).toHaveBeenCalledTimes(1);
  });
});
