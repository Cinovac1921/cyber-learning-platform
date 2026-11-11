import { BadRequestException } from '@nestjs/common';

export interface GradingQuestion {
  id: number;
  /** Ids of every option the question has. */
  optionIds: number[];
  /** The one correct option. */
  correctOptionId: number;
}

export interface SubmittedAnswer {
  questionId: number;
  optionId: number;
}

export interface GradedAnswer {
  questionId: number;
  optionId: number;
  isCorrect: boolean;
}

export interface GradeResult {
  correct: number;
  total: number;
  percent: number;
  passed: boolean;
  answers: GradedAnswer[];
}

/**
 * Grades one attempt on the server, so the client never needs to know the answers.
 * Every question must be answered exactly once with one of its own options.
 */
export function gradeAttempt(
  questions: GradingQuestion[],
  submitted: SubmittedAnswer[],
  passPercent: number,
): GradeResult {
  if (questions.length === 0) {
    throw new BadRequestException('This assessment has no questions yet.');
  }

  const byQuestion = new Map<number, number>();
  for (const answer of submitted) {
    if (byQuestion.has(answer.questionId)) {
      throw new BadRequestException('Each question can only be answered once.');
    }
    byQuestion.set(answer.questionId, answer.optionId);
  }

  const known = new Set(questions.map((question) => question.id));
  for (const questionId of byQuestion.keys()) {
    if (!known.has(questionId)) {
      throw new BadRequestException('One of the answers is for a question that is not in this assessment.');
    }
  }

  const answers: GradedAnswer[] = questions.map((question) => {
    const optionId = byQuestion.get(question.id);
    if (optionId === undefined) {
      throw new BadRequestException('Answer every question before you submit.');
    }
    if (!question.optionIds.includes(optionId)) {
      throw new BadRequestException('One of the answers is not an option of its question.');
    }
    return { questionId: question.id, optionId, isCorrect: optionId === question.correctOptionId };
  });

  const correct = answers.filter((answer) => answer.isCorrect).length;
  const total = questions.length;
  const percent = Math.round((correct / total) * 100);

  return { correct, total, percent, passed: percent >= passPercent, answers };
}
