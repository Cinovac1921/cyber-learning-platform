import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** Whitespace around a submitted flag is ignored. Case still matters. */
export function normalizeFlag(flag: string): string {
  return flag.trim();
}

function digest(flag: string, salt: string): Buffer {
  return createHmac('sha256', salt).update(normalizeFlag(flag)).digest();
}

/** Makes a salted hash of a flag. Only the salt and the hash are stored, never the flag. */
export function hashFlag(flag: string): { flagSalt: string; flagHash: string } {
  const flagSalt = randomBytes(16).toString('hex');
  return { flagSalt, flagHash: digest(flag, flagSalt).toString('hex') };
}

/** True when `submitted` is the flag that produced `flagHash`. Compares in constant time. */
export function checkFlag(
  submitted: string,
  flagSalt: string,
  flagHash: string,
): boolean {
  const expected = Buffer.from(flagHash, 'hex');
  const actual = digest(submitted, flagSalt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
