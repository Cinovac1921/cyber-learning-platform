import {
  approvedMessage,
  decisionEmail,
  oneLine,
  rejectedMessage,
  submittedMessage,
  takenDownMessage,
} from './notification-texts';

describe('notification texts', () => {
  it('writes a clear message for each event', () => {
    expect(submittedMessage('Ms. Reyes', 'Intro to SOC work')).toBe('Ms. Reyes submitted "Intro to SOC work" for review.');
    expect(approvedMessage('Intro')).toBe('"Intro" was approved and is now live in the public library.');
    expect(rejectedMessage('Intro', 'Fix lesson 2.')).toBe('"Intro" was sent back. Reason: Fix lesson 2.');
    expect(takenDownMessage('Intro', 'Wrong facts.')).toBe('"Intro" was taken offline. Reason: Wrong facts.');
  });

  it('collapses line breaks, so a title can never break a message or an email header', () => {
    expect(oneLine('  Intro\r\nBcc: x@evil.test \n\n to SOC  ')).toBe('Intro Bcc: x@evil.test to SOC');
    expect(approvedMessage('A\nB')).not.toContain('\n');
    expect(decisionEmail('APPROVED', 'A\r\nBcc: x@evil.test', null, 'http://x').subject).not.toMatch(/[\r\n]/);
  });

  it('always fits the database column, however long the title and reason are', () => {
    const title = 'T'.repeat(120);
    const reason = 'R'.repeat(500);
    expect(rejectedMessage(title, reason).length).toBeLessThanOrEqual(500);
    expect(takenDownMessage(title, reason).length).toBeLessThanOrEqual(500);
    expect(submittedMessage('N'.repeat(300), title).length).toBeLessThanOrEqual(500);
  });

  it('puts the whole reason and a link in the email, even when the notification shortens it', () => {
    const reason = `${'x'.repeat(400)} END`;
    const email = decisionEmail('REJECTED', 'Intro', reason, 'http://localhost:5173/instructor/courses/3');
    expect(email.text).toContain(reason);
    expect(email.text).toContain('http://localhost:5173/instructor/courses/3');
    expect(email.subject).toContain('sent back');
  });

  it('has a different subject for each decision', () => {
    const subjects = (['APPROVED', 'REJECTED', 'TAKEN_DOWN'] as const).map(
      (decision) => decisionEmail(decision, 'Intro', 'why', 'http://x').subject,
    );
    expect(new Set(subjects).size).toBe(3);
  });
});
