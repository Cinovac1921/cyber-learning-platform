import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfWeek, weekdayIndex } from './week';

const WEEKLY_TARGET = 5;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: number, tzOffsetMinutes: number, now = new Date()) {
    // Keep the offset within real-world limits (UTC-12 to UTC+14).
    const offset = Math.max(-840, Math.min(720, tzOffsetMinutes));

    const progress = await this.prisma.lessonProgress.findMany({
      where: { userId, lesson: { course: { published: true } } },
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
            where: { id: { in: courseIds }, published: true },
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              title: true,
              slug: true,
              lessons: {
                orderBy: { position: 'asc' },
                select: { id: true, position: true, title: true },
              },
            },
          });

    const summaries = courses.map((course) => {
      const next = course.lessons.find((lesson) => !doneLessonIds.has(lesson.id));
      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        completedLessons: course.lessons.filter((lesson) => doneLessonIds.has(lesson.id)).length,
        totalLessons: course.lessons.length,
        nextLesson: next ? { id: next.id, number: next.position, title: next.title } : null,
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

    return {
      courses: summaries,
      weeklyGoal: { target: WEEKLY_TARGET, completed: completedThisWeek, activeDays },
    };
  }
}