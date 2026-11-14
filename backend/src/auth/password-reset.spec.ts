import {
  buildResetLink,
  generateResetToken,
  hashResetToken,
  RESET_TOKEN_TTL_MINUTES,
  resetEmailText,
} from './password-reset';

describe('password reset tokens', () => {
  it('makes long random tokens that never repeat', () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => generateResetToken().token));
    expect(tokens.size).toBe(1000);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    }
  });

  it('stores a hash that is not the token and always comes out the same for the same token', () => {
    const { token, tokenHash } = generateResetToken();
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).not.toContain(token);
    expect(hashResetToken(token)).toBe(tokenHash);
    expect(hashResetToken(`${token}x`)).not.toBe(tokenHash);
  });

  it('builds a link to the frontend with the token in it', () => {
    expect(buildResetLink('http://localhost:5173', 'abc_-123')).toBe(
      'http://localhost:5173/reset-password?token=abc_-123',
    );
  });

  it('tells the reader how long the link works and what to do if it was not them', () => {
    const text = resetEmailText('http://x/reset-password?token=t');
    expect(text).toContain('http://x/reset-password?token=t');
    expect(text).toContain(`${RESET_TOKEN_TTL_MINUTES} minutes`);
    expect(text).toContain("didn't ask");
  });
});
