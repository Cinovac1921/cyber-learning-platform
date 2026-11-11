import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { gradeAttempt } from './grading';

/** Only assessments a student may see: published, inside a published course. */
const VISIBLE = { published: true, course: { published: true } } as const;

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Every visible assessment with the student's best score and number of tries. */
  async list(userId: number) {
    const [assessments, attempts] = await Promise.all([
      this.prisma.assessment.findMany({
        where: { ...VISIBLE, questions: { some: {} } },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          passPercent: true,
          course: { select: { title: true, slug: true } },
          _count: { select: { questions: true } },
        },
      }),
      this.prisma.attempt.findMany({
        where: { userId, assessment: VISIBLE },
        select: { assessmentId: true, percent: true, passed: true },
      }),
    ]);

    const summaries = new Map<number, { tries: number; bestPercent: number; passed: boolean }>();
    for (const attempt of attempts) {
      const current = summaries.get(attempt.assessmentId) ?? { tries: 0, bestPercent: 0, passed: false };
      summaries.set(attempt.assessmentId, {
        tries: current.tries + 1,
        bestPercent: Math.max(current.bestPercent, attempt.percent),
        passed: current.passed || attempt.passed,
      });
    }

    return assessments.map(({ _count, ...assessment }) => ({
      ...assessment,
      questionCount: _count.questions,
      tries: summaries.get(assessment.id)?.tries ?? 0,
      bestPercent: summaries.get(assessment.id)?.bestPercent ?? null,
      passed: summaries.get(assessment.id)?.passed ?? false,
    }));
  }

  /** The quiz to take. The options never say which one is correct. */
  async findOne(assessmentId: number, userId: number) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, ...VISIBLE },
      select: {
        id: true,
        title: true,
        description: true,
        passPercent: true,
        course: { select: { title: true, slug: true } },
        questions: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            position: true,
            prompt: true,
            options: { orderBy: { position: 'asc' }, select: { id: true, text: true } },
          },
        },
      },
    });

    if (!assessment || assessment.questions.length === 0) {
      throw new NotFoundException('Assessment not found.');
    }

    const best = await this.prisma.attempt.aggregate({
      where: { userId, assessmentId },
      _count: true,
      _max: { percent: true },
    });

    return { ...assessment, tries: best._count, bestPercent: best._max.percent };
  }

  /** Grades the answers on the server, saves the attempt and returns the full result. */
  async submit(assessmentId: number, userId: number, dto: SubmitAttemptDto) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, ...VISIBLE },
      select: {
        id: true,
        passPercent: true,
        questions: {
          orderBy: { position: 'asc' },
          select: { id: true, options: { select: { id: true, isCorrect: true } } },
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found.');
    }

    const result = gradeAttempt(
      assessment.questions.map((question) => ({
        id: question.id,
        optionIds: question.options.map((option) => option.id),
        correctOptionId: question.options.find((option) => option.isCorrect)?.id ?? -1,
      })),
      dto.answers,
      assessment.passPercent,
    );

    const attempt = await this.prisma.attempt.create({
      data: {
        userId,
        assessmentId,
        correct: result.correct,
        total: result.total,
        percent: result.percent,
        passed: result.passed,
        answers: { create: result.answers },
      },
      select: { id: true },
    });

    return this.findAttempt(assessmentId, attempt.id, userId);
  }

  /** One finished attempt with, for each question, what was picked and what was right. */
  async findAttempt(assessmentId: number, attemptId: number, userId: number) {
    const attempt = await this.prisma.attempt.findFirst({
      where: { id: attemptId, assessmentId, userId },
      select: {
        id: true,
        correct: true,
        total: true,
        percent: true,
        passed: true,
        createdAt: true,
        answers: { select: { questionId: true, optionId: true, isCorrect: true } },
        assessment: {
          select: {
            id: true,
            title: true,
            passPercent: true,
            course: { select: { title: true, slug: true } },
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
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Result not found.');
    }

    const answerByQuestion = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
    const { questions, ...assessment } = attempt.assessment;

    return {
      id: attempt.id,
      correct: attempt.correct,
      total: attempt.total,
      percent: attempt.percent,
      passed: attempt.passed,
      createdAt: attempt.createdAt,
      assessment,
      review: questions.map((question) => {
        const answer = answerByQuestion.get(question.id);
        return {
          id: question.id,
          position: question.position,
          prompt: question.prompt,
          explanation: question.explanation,
          selectedOptionId: answer?.optionId ?? null,
          correctOptionId: question.options.find((option) => option.isCorrect)?.id ?? null,
          isCorrect: answer?.isCorrect ?? false,
          options: question.options.map(({ id, text }) => ({ id, text })),
        };
      }),
    };
  }
}
