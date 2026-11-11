import { BadRequestException } from '@nestjs/common';
import { checkOptions } from './question-rules';

describe('checkOptions', () => {
  it('accepts a valid set and trims the text', () => {
    const result = checkOptions([
      { text: '  200  ', isCorrect: true },
      { text: '404', isCorrect: false },
    ]);
    expect(result).toEqual([
      { text: '200', isCorrect: true },
      { text: '404', isCorrect: false },
    ]);
  });

  it('rejects fewer than two options', () => {
    expect(() => checkOptions([{ text: 'Only one', isCorrect: true }])).toThrow(BadRequestException);
  });

  it('rejects more than six options', () => {
    const many = Array.from({ length: 7 }, (_, index) => ({ text: `Option ${index}`, isCorrect: index === 0 }));
    expect(() => checkOptions(many)).toThrow(BadRequestException);
  });

  it('rejects options that are only spaces', () => {
    expect(() =>
      checkOptions([
        { text: 'Real answer', isCorrect: true },
        { text: '   ', isCorrect: false },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects duplicate options, ignoring case and spaces around them', () => {
    expect(() =>
      checkOptions([
        { text: 'Yes', isCorrect: true },
        { text: ' yes ', isCorrect: false },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects when no option is marked correct', () => {
    expect(() =>
      checkOptions([
        { text: 'A', isCorrect: false },
        { text: 'B', isCorrect: false },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects when more than one option is marked correct', () => {
    expect(() =>
      checkOptions([
        { text: 'A', isCorrect: true },
        { text: 'B', isCorrect: true },
      ]),
    ).toThrow(BadRequestException);
  });
});
