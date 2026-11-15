/** What notifications and emails say. One place, so the bell and the email always agree. */

const MAX_MESSAGE = 500;
const MAX_NOTE_IN_MESSAGE = 280;

/** Collapses line breaks and runs of spaces, so a title can never break a message or an email header. */
export function oneLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Keeps a message inside its database column, whatever a title or reason contains. */
function fit(message: string): string {
  return truncate(message, MAX_MESSAGE);
}

export function submittedMessage(authorName: string, title: string): string {
  return fit(`${oneLine(authorName)} submitted "${oneLine(title)}" for review.`);
}

export function approvedMessage(title: string): string {
  return fit(`"${oneLine(title)}" was approved and is now live in the public library.`);
}

export function rejectedMessage(title: string, note: string): string {
  return fit(`"${oneLine(title)}" was sent back. Reason: ${truncate(oneLine(note), MAX_NOTE_IN_MESSAGE)}`);
}

export function takenDownMessage(title: string, note: string): string {
  return fit(`"${oneLine(title)}" was taken offline. Reason: ${truncate(oneLine(note), MAX_NOTE_IN_MESSAGE)}`);
}

export interface DecisionEmail {
  subject: string;
  text: string;
}

type Decision = 'APPROVED' | 'REJECTED' | 'TAKEN_DOWN';

/** The email an instructor gets when an admin decides about their course. The full reason is included. */
export function decisionEmail(decision: Decision, title: string, note: string | null, courseUrl: string): DecisionEmail {
  const name = oneLine(title);
  const reason = note ? `\n\nReason from the reviewer:\n${note.trim()}` : '';

  if (decision === 'APPROVED') {
    return {
      subject: `Your course "${name}" was approved`,
      text: `Good news: "${name}" was approved and is now live in the public library.\n\nOpen it: ${courseUrl}`,
    };
  }
  if (decision === 'REJECTED') {
    return {
      subject: `Your course "${name}" was sent back`,
      text: `An admin reviewed "${name}" and sent it back.${reason}\n\nYou can fix it and submit it again: ${courseUrl}`,
    };
  }
  return {
    subject: `Your course "${name}" was taken offline`,
    text: `An admin took "${name}" offline.${reason}\n\nYou can fix it and submit it again: ${courseUrl}`,
  };
}
