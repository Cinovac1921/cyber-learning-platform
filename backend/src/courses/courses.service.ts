import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Published courses, oldest first, with how many lessons each has. */
  async list() {
    const courses = await this.prisma.course.findMany({
      where: { published: true },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        level: true,
        _count: { select: { lessons: true } },
      },
    });

    return courses.map(({ _count, ...course }) => ({
      ...course,
      lessonCount: _count.lessons,
    }));
  }

  /** One course with its lesson titles (no lesson text). */
  async findBySlug(slug: string) {
    const course = await this.prisma.course.findFirst({
      where: { slug, published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        summary: true,
        level: true,
        lessons: {
          orderBy: { position: 'asc' },
          select: { id: true, position: true, title: true },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    return course;
  }

  /** One lesson with its text and the positions of its neighbours. */
  async findLesson(slug: string, position: number) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { position, course: { slug, published: true } },
      select: {
        id: true,
        courseId: true,
        position: true,
        title: true,
        content: true,
        course: { select: { title: true, slug: true } },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found.');
    }

    const [previous, next] = await Promise.all([
      this.prisma.lesson.findFirst({
        where: { courseId: lesson.courseId, position: { lt: position } },
        orderBy: { position: 'desc' },
        select: { position: true },
      }),
      this.prisma.lesson.findFirst({
        where: { courseId: lesson.courseId, position: { gt: position } },
        orderBy: { position: 'asc' },
        select: { position: true },
      }),
    ]);

    return {
      id: lesson.id,
      position: lesson.position,
      title: lesson.title,
      content: lesson.content,
      course: lesson.course,
      previousPosition: previous?.position ?? null,
      nextPosition: next?.position ?? null,
    };
  }
}