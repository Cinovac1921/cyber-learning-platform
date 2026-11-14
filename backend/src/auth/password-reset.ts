import { createHash, randomBytes } from 'node:crypto';

/** A reset link works for 30 minutes, then it is useless. */
export const RESET_TOKEN_TTL_MINUTES = 30;

/** Asking again within this many seconds does not send another email. It stops someone flooding an inbox. */
export const RESET_COOLDOWN_SECONDS = 60;

/** The same answer for every bad link (wrong, used, expired), so a link tells an attacker nothing. */
export const RESET_LINK_INVALID_MESSAGE = 'This reset link is invalid or has expired. Request a new one.';

/** The same answer whether or not an account exists, so nobody can use this form to find out who has one. */
export const RESET_REQUESTED_MESSAGE = 'If an account uses that email, a reset link is on its way. It works for 30 minutes.';

/** A new random token (what goes in the email) and its hash (what goes in the database). */
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashResetToken(token) };
}

/** Only this hash is stored. The token itself exists in the email and nowhere else. */
export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function buildResetLink(appUrl: string, token: string): string {
  return `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export function resetEmailText(link: string): string {
  return [
    'Someone asked to reset the password for your Cyber Learning account.',
    '',
    `Open this link to choose a new password. It works for ${RESET_TOKEN_TTL_MINUTES} minutes and only once:`,
    link,
    '',
    "If you didn't ask for this, you can ignore this email. Your password has not changed.",
  ].join('\n');
}
