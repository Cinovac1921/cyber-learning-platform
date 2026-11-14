import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassroomDto, UpdateClassroomDto } from './dto/classroom.dto';
import { formatJoinCode, generateJoinCode } from './join-code';

/** Trims text and rejects values that are only spaces. */
function cleanName(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new BadRequestException("Name can't be empty.");
  }
  return trimmed;
}

/** The instructor's side of classrooms. Every method only touches classrooms the instructor runs. */
@Injectable()
export class InstructorClassroomsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number) {
    const classrooms = await this.prisma.classroom.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        joinOpen: true,
        _count: { select: { members: true, courses: true } },
      },
    });

    return classrooms.map(({ _count, ...classroom }) => ({
      ...classroom,
      memberCount: _count.members,
      courseCount: _count.courses,
    }));
  }

  async create(userId: number, dto: CreateClassroomDto) {
    return this.prisma.classroom.create({
      data: {
        ownerId: userId,
        name: cleanName(dto.name),
        description: dto.description?.trim() ?? '',
        joinCode: await this.freshJoinCode(),
      },
      select: { id: true },
    });
  }

  /** One classroom with its join code, its students and its courses. */
  async get(classroomId: number, userId: number) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, ownerId: userId },
      select: {
        id: true,
        name: true,
        description: true,
        joinCode: true,
        joinOpen: true,
        members: {
          orderBy: { joinedAt: 'asc' },
          select: {
            joinedAt: true,
            user: { select: { id: true, displayName: true, email: true } },
          },
        },
        courses: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            published: true,
            _count: { select: { lessons: true } },
          },
        },
      },
    });
    if (!classroom) {
      throw new NotFoundException('Classroom not found.');
    }

    return {
      id: classroom.id,
      name: classroom.name,
      description: classroom.description,
      joinCode: formatJoinCode(classroom.joinCode),
      joinOpen: classroom.joinOpen,
      members: classroom.members.map((member) => ({
        userId: member.user.id,
        displayName: member.user.displayName,
        email: member.user.email,
        joinedAt: member.joinedAt,
      })),
      courses: classroom.courses.map(({ _count, ...course }) => ({
        ...course,
        lessonCount: _count.lessons,
      })),
    };
  }

  async update(classroomId: number, userId: number, dto: UpdateClassroomDto) {
    await this.ownClassroom(classroomId, userId);

    const data: { name?: string; description?: string; joinOpen?: boolean } = {};
    if (dto.name !== undefined) data.name = cleanName(dto.name);
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.joinOpen !== undefined) data.joinOpen = dto.joinOpen;

    await this.prisma.classroom.update({ where: { id: classroomId }, data });
    return { ok: true };
  }

  /** Replaces the join code. The old code stops working at once. Current students stay. */
  async regenerateJoinCode(classroomId: number, userId: number) {
    await this.ownClassroom(classroomId, userId);
    const code = await this.freshJoinCode();
    await this.prisma.classroom.update({ where: { id: classroomId }, data: { joinCode: code } });
    return { joinCode: formatJoinCode(code) };
  }

  /** Removes a student. Their lesson progress is kept. */
  async removeMember(classroomId: number, userId: number, memberUserId: number) {
    await this.ownClassroom(classroomId, userId);
    await this.prisma.classroomMember.deleteMany({ where: { classroomId, userId: memberUserId } });
    return { ok: true };
  }

  /** A classroom can only be deleted once its courses are gone, so nothing is lost by accident. */
  async remove(classroomId: number, userId: number) {
    await this.ownClassroom(classroomId, userId);

    const courses = await this.prisma.course.count({ where: { classroomId } });
    if (courses > 0) {
      throw new BadRequestException(
        'This classroom still has courses. Delete them first, then delete the classroom.',
      );
    }

    await this.prisma.classroom.delete({ where: { id: classroomId } });
    return { ok: true };
  }

  // ---------- helpers ----------

  /** A classroom that exists and belongs to this instructor, or a 404. */
  private async ownClassroom(classroomId: number, userId: number) {
    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, ownerId: userId },
      select: { id: true },
    });
    if (!classroom) {
      throw new NotFoundException('Classroom not found.');
    }
    return classroom;
  }

  /** A random code nobody is using yet. */
  private async freshJoinCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateJoinCode();
      const taken = await this.prisma.classroom.findUnique({
        where: { joinCode: code },
        select: { id: true },
      });
      if (!taken) return code;
    }
    throw new Error('Could not find an unused join code.');
  }
}
