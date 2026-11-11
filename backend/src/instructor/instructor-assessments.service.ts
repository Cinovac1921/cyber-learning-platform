import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAssessmentDto,
  QuestionInputDto,
  UpdateAssessmentDto,
} from './dto/assessment.dto';
import { checkOptions } from './question-rules';

/** Trims text and rejects values that are only spaces. */
function clean(value: string, label: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new BadRequestException(`${label} can't be empty.`);
  }
  return trimmed;
}

@Injectable()
export class InstructorAssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every assessment of one of the instructor's courses, drafts included. */
  async listForCourse(courseId: number, userId: number) {
    await this.ownCourse(courseId, userId);

    const assessments = await this.prisma.assessment.findMany({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        passPercent: true,
        published: true,
        _count: { select: { questions: true, attempts: true } },
      },
    });

    return assessments.map(({ _count, ...assessment }) => ({
      ...assessment,
      questionCount: _count.questions,
      attemptCount: _count.attempts,
    }));
  }

  async create(courseId: number, userId: number, dto: CreateAssessmentDto) {
    await this.ownCourse(courseId, userId);

    return this.prisma.assessment.create({
      data: {
        courseId,
        title: clean(dto.title, 'Title'),
        description: dto.description?.trim() ?? '',
        passPercent: dto.passPercent ?? 70,
      },
      select: { id: true },
    });
  }

  /** One assessment with every question and which option is correct, for the editor. */
  async findOne(assessmentId: number, userId: number) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, course: { authorId: userId } },
      select: {
        id: true,
        title: true,
        description: true,
        passPercent: true,
        published: true,
        course: { select: { id: true, title: true } },
        _count: { select: { attempts: true } },
        questions: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            position: true,
            prompt: true,
            explanation: true,
            options: {
              orderBy: { position: 'asc' },
              select: { id: true, text: true, isCorrect: true },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    const { _count, ...rest } = assessment;
    return { ...rest, attemptCount: _count.attempts };
  }

  async update(assessmentId: number, userId: number, dto: UpdateAssessmentDto) {
    const assessment = await this.ownAssessment(assessmentId, userId);

    const data: {
      title?: string;
      description?: string;
      passPercent?: number;
      published?: boolean;
    } = {};
    if (dto.title !== undefined) data.title = clean(dto.title, 'Title');
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.passPercent !== undefined) data.passPercent = dto.passPercent;
    if (dto.published !== undefined) {
      if (dto.published && assessment._count.questions === 0) {
        throw new BadRequestException('Add at least one question before publishing.');
      }
      data.published = dto.published;
    }

    await this.prisma.assessment.update({ where: { id: assessmentId }, data });
    return { ok: true };
  }

  /** Deleting an assessment also deletes its questions and every student's attempts. */
  async remove(assessmentId: number, userId: number) {
    await this.ownAssessment(assessmentId, userId);
    await this.prisma.assessment.delete({ where: { id: assessmentId } });
    return { ok: true };
  }

  // ---------- questions ----------

  /** Adds a question at the end of the assessment. */
  async addQuestion(assessmentId: number, userId: number, dto: QuestionInputDto) {
    await this.ownAssessment(assessmentId, userId);
    const options = checkOptions(dto.options);

    const last = await this.prisma.question.findFirst({
      where: { assessmentId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    return this.prisma.question.create({
      data: {
        assessmentId,
        position: (last?.position ?? 0) + 1,
        prompt: clean(dto.prompt, 'Question'),
        explanation: dto.explanation?.trim() ?? '',
        options: {
          create: options.map((option, index) => ({ ...option, position: index + 1 })),
        },
      },
      select: { id: true, position: true },
    });
  }

  /**
   * Replaces a question's text and options. Options are updated in place by position,
   * so students' earlier answers keep pointing at the same slot.
   */
  async updateQuestion(questionId: number, userId: number, dto: QuestionInputDto) {
    const question = await this.ownQuestion(questionId, userId);
    const options = checkOptions(dto.options);

    const existing = await this.prisma.option.findMany({
      where: { questionId },
      orderBy: { position: 'asc' },
      select: { id: true },
    });

    await this.prisma.$transaction([
      this.prisma.question.update({
        where: { id: question.id },
        data: { prompt: clean(dto.prompt, 'Question'), explanation: dto.explanation?.trim() ?? '' },
      }),
      ...options.map((option, index) =>
        existing[index]
          ? this.prisma.option.update({ where: { id: existing[index].id }, data: option })
          : this.prisma.option.create({ data: { ...option, questionId, position: index + 1 } }),
      ),
      this.prisma.option.deleteMany({
        where: { id: { in: existing.slice(options.length).map((option) => option.id) } },
      }),
    ]);
    return { ok: true };
  }

  /** Deletes a question and closes the gap in the numbering. */
  async deleteQuestion(questionId: number, userId: number) {
    const question = await this.ownQuestion(questionId, userId);

    const following = await this.prisma.question.findMany({
      where: { assessmentId: question.assessmentId, position: { gt: question.position } },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    });

    // Runs in order inside one transaction: each question moves into the slot just freed.
    await this.prisma.$transaction([
      this.prisma.question.delete({ where: { id: questionId } }),
      ...following.map((next) =>
        this.prisma.question.update({ where: { id: next.id }, data: { position: next.position - 1 } }),
      ),
    ]);
    return { ok: true };
  }

  /** Swaps a question with the one above or below it. */
  async moveQuestion(questionId: number, userId: number, direction: 'up' | 'down') {
    const question = await this.ownQuestion(questionId, userId);

    const neighbour = await this.prisma.question.findFirst({
      where: {
        assessmentId: question.assessmentId,
        position: direction === 'up' ? { lt: question.position } : { gt: question.position },
      },
      orderBy: { position: direction === 'up' ? 'desc' : 'asc' },
      select: { id: true, position: true },
    });

    if (!neighbour) {
      return { ok: true }; // already first or last
    }

    // Position 0 is never used by a real question, so it works as a temporary spot.
    await this.prisma.$transaction([
      this.prisma.question.update({ where: { id: question.id }, data: { position: 0 } }),
      this.prisma.question.update({ where: { id: neighbour.id }, data: { position: question.position } }),
      this.prisma.question.update({ where: { id: question.id }, data: { position: neighbour.position } }),
    ]);
    return { ok: true };
  }

  // ---------- helpers ----------

  private async ownCourse(courseId: number, userId: number) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, authorId: userId },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found.');
    }
    return course;
  }

  private async ownAssessment(assessmentId: number, userId: number) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, course: { authorId: userId } },
      select: { id: true, _count: { select: { questions: true } } },
    });
    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }
    return assessment;
  }

  private async ownQuestion(questionId: number, userId: number) {
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, assessment: { course: { authorId: userId } } },
      select: { id: true, assessmentId: true, position: true },
    });
    if (!question) {
      throw new NotFoundException('Question not found.');
    }
    return question;
  }
}
