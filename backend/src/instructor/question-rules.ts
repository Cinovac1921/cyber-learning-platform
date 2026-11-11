import { BadRequestException } from '@nestjs/common';

export interface OptionDraft {
  text: string;
  isCorrect: boolean;
}

/**
 * Checks the options of a question and returns them trimmed.
 * A question needs 2 to 6 distinct, non-empty options and exactly one correct one.
 */
export function checkOptions(options: OptionDraft[]): OptionDraft[] {
  if (options.length < 2 || options.length > 6) {
    throw new BadRequestException('A question needs between 2 and 6 options.');
  }

  const cleaned = options.map((option) => ({ text: option.text.trim(), isCorrect: option.isCorrect }));

  if (cleaned.some((option) => option.text.length === 0)) {
    throw new BadRequestException("Options can't be empty.");
  }

  const seen = new Set(cleaned.map((option) => option.text.toLowerCase()));
  if (seen.size !== cleaned.length) {
    throw new BadRequestException('Each option needs different text.');
  }

  if (cleaned.filter((option) => option.isCorrect).length !== 1) {
    throw new BadRequestException('Mark exactly one option as correct.');
  }

  return cleaned;
}
