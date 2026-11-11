import { BadRequestException } from '@nestjs/common';
import { gradeAttempt, type GradingQuestion } from './grading';

const questions: GradingQuestion[] = [
  { id: 1, optionIds: [11, 12, 13], correctOptionId: 12 },
  { id: 2, optionIds: [21, 22], correctOptionId: 21 },
  { id: 3, optionIds: [31, 32, 33, 34], correctOptionId: 34 },
];

describe('gradeAttempt', () => {
  it('scores a perfect attempt as 100% and passed', () => {
    const result = gradeAttempt(
      questions,
      [
        { questionId: 1, optionId: 12 },
        { questionId: 2, optionId: 21 },
        { questionId: 3, optionId: 34 },
      ],
      70,
    );
    expect(result).toMatchObject({ correct: 3, total: 3, percent: 100, passed: true });
    expect(result.answers.every((answer) => answer.isCorrect)).toBe(true);
  });

  it('marks wrong answers and rounds the percentage', () => {
    const result = gradeAttempt(
      questions,
      [
        { questionId: 1, optionId: 12 },
        { questionId: 2, optionId: 22 },
        { questionId: 3, optionId: 31 },
      ],
      70,
    );
    expect(result.correct).toBe(1);
    expect(result.percent).toBe(33);
    expect(result.passed).toBe(false);
    expect(result.answers.map((answer) => answer.isCorrect)).toEqual([true, false, false]);
  });

  it('passes exactly at the pass mark', () => {
    const result = gradeAttempt(
      questions.slice(0, 2),
      [
        { questionId: 1, optionId: 12 },
        { questionId: 2, optionId: 22 },
      ],
      50,
    );
    expect(result.percent).toBe(50);
    expect(result.passed).toBe(true);
  });

  it('keeps the questions in assessment order whatever order the answers arrive in', () => {
    const result = gradeAttempt(
      questions,
      [
        { questionId: 3, optionId: 34 },
        { questionId: 1, optionId: 12 },
        { questionId: 2, optionId: 21 },
      ],
      70,
    );
    expect(result.answers.map((answer) => answer.questionId)).toEqual([1, 2, 3]);
  });

  it('rejects a missing answer', () => {
    expect(() =>
      gradeAttempt(
        questions,
        [
          { questionId: 1, optionId: 12 },
          { questionId: 2, optionId: 21 },
        ],
        70,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects answering the same question twice', () => {
    expect(() =>
      gradeAttempt(
        questions,
        [
          { questionId: 1, optionId: 12 },
          { questionId: 1, optionId: 11 },
          { questionId: 2, optionId: 21 },
          { questionId: 3, optionId: 34 },
        ],
        70,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects a question that is not in the assessment', () => {
    expect(() =>
      gradeAttempt(
        questions,
        [
          { questionId: 1, optionId: 12 },
          { questionId: 2, optionId: 21 },
          { questionId: 3, optionId: 34 },
          { questionId: 99, optionId: 1 },
        ],
        70,
      ),
    ).toThrow(BadRequestException);
  });

  it("rejects an option that belongs to a different question", () => {
    expect(() =>
      gradeAttempt(
        questions,
        [
          { questionId: 1, optionId: 21 },
          { questionId: 2, optionId: 21 },
          { questionId: 3, optionId: 34 },
        ],
        70,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects an assessment with no questions', () => {
    expect(() => gradeAttempt([], [], 70)).toThrow(BadRequestException);
  });
});
