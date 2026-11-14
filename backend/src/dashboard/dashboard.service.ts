import { Injectable } from '@nestjs/common';
import { courseVisibleTo, PUBLIC_COURSE, VISIBLE_LESSON } from '../courses/visibility';
import { PrismaService } from '../prisma/prisma.service';
import { startOfWeek, weekdayIndex } from './week';

const WEEKLY_TARGET = 5;
/** How many public courses the dashboard suggests. */
const LIBRARY_SIZE = 6;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: number, tzOffsetMinutes: number, now = new Date()) {
    // Keep the offset within real-world limits (UTC-12 to UTC+14).
    const offset = Math.max(-840, Math.min(720, tzOffsetMinutes));

    const progress = await this.prisma.lessonProgress.findMany({
      where: { userId, lesson: { ...VISIBLE_LESSON, course: courseVisibleTo(userId) } },
      select: {
        lessonId: true,
        completedAt: true,
        lesson: { select: { courseId: true } },
      },
    });

    const doneLessonIds = new Set(progress.map((entry) => entry.lessonId));
    const courseIds = [...new Set(progress.map((entry) => entry.lesson.courseId))];

    const courses =
      courseIds.length === 0
        ? []
        : await this.prisma.course.findMany({
            where: { id: { in: courseIds }, ...courseVisibleTo(userId) },
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              title: true,
              slug: true,
              lessons: {
                where: VISIBLE_LESSON,
                orderBy: { position: 'asc' },
                select: { id: true, position: true, title: true },
              },
            },
          });

    const summaries = courses.map((course) => {
      const nextIndex = course.lessons.findIndex((lesson) => !doneLessonIds.has(lesson.id));
      const next = nextIndex === -1 ? null : course.lessons[nextIndex];
      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        completedLessons: course.lessons.filter((lesson) => doneLessonIds.has(lesson.id)).length,
        totalLessons: course.lessons.length,
        // `number` is what the student reads (visible lessons only); `position` is the lesson's URL.
        nextLesson: next
          ? { id: next.id, number: nextIndex + 1, position: next.position, title: next.title }
          : null,
      };
    });

    // Courses still in progress first; finished ones go to the end.
    summaries.sort((a, b) => Number(a.nextLesson === null) - Number(b.nextLesson === null));

    const weekStart = startOfWeek(now, offset);
    const activeDays = Array<boolean>(7).fill(false);
    let completedThisWeek = 0;
    for (const entry of progress) {
      if (entry.completedAt >= weekStart) {
        completedThisWeek += 1;
        activeDays[weekdayIndex(entry.completedAt, offset)] = true;
      }
    }

    // Public courses the student has not started yet, skipping any with nothing to read.
    const suggestions = await this.prisma.course.findMany({
      where: { ...PUBLIC_COURSE, id: { notIn: courseIds }, lessons: { some: VISIBLE_LESSON } },
      orderBy: { createdAt: 'asc' },
      take: LIBRARY_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        level: true,
        _count: { select: { lessons: { where: VISIBLE_LESSON } } },
      },
    });
    const library = suggestions.map(({ _count, ...course }) => ({
      ...course,
      lessonCount: _count.lessons,
    }));

    return {
      courses: summaries,
      library,
      weeklyGoal: { target: WEEKLY_TARGET, completed: completedThisWeek, activeDays },
    };
  }
}