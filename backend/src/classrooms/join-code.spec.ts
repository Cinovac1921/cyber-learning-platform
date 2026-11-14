import { formatJoinCode, generateJoinCode, JOIN_CODE_LENGTH, normalizeJoinCode } from './join-code';

describe('join codes', () => {
  it('makes codes of the right length from the safe alphabet only', () => {
    for (let index = 0; index < 500; index += 1) {
      const code = generateJoinCode();
      expect(code).toHaveLength(JOIN_CODE_LENGTH);
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]+$/);
    }
  });

  it('does not repeat itself', () => {
    const codes = new Set(Array.from({ length: 2000 }, () => generateJoinCode()));
    expect(codes.size).toBe(2000);
  });

  it('accepts what people type: any case, dashes, spaces', () => {
    expect(normalizeJoinCode(' abcd-efgh ')).toBe('ABCDEFGH');
    expect(normalizeJoinCode('ab cd ef gh')).toBe('ABCDEFGH');
  });

  it('shows codes as two groups of four', () => {
    expect(formatJoinCode('ABCDEFGH')).toBe('ABCD-EFGH');
  });
});
