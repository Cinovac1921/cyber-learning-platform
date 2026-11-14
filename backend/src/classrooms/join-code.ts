import { randomInt } from 'node:crypto';

/** No I, L, O, 0 or 1, so a code read out loud or copied by hand is hard to get wrong. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const JOIN_CODE_LENGTH = 8;

/** A random code. About 850 billion are possible, and it uses the operating system's secure random numbers. */
export function generateJoinCode(): string {
  let code = '';
  for (let index = 0; index < JOIN_CODE_LENGTH; index += 1) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

/** Accepts what a person types: any case, with or without the dash or spaces. */
export function normalizeJoinCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** The way a code is shown: ABCD-EFGH. */
export function formatJoinCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
