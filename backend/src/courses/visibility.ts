import type { Prisma } from '../generated/prisma/client';

/**
 * What a student is allowed to see. Every student-facing query uses these
 * pieces, so the rules live in one place instead of being repeated.
 */

/**
 * A course in the public library: published, meant for everyone, and approved by an admin.
 * Asking for approval here as well as for `published` means a course can't reach students
 * without a review, even if some other code path were to set `published` by mistake.
 */
export const PUBLIC_COURSE = { published: true, scope: 'PUBLIC', reviewStatus: 'APPROVED' } as const;

/** A lesson the instructor has not hidden. */
export const VISIBLE_LESSON = { visible: true } as const;

/**
 * Every course this person may open: the approved public ones, plus the published
 * courses of classrooms they belong to (or run). A classroom course is
 * invisible to everyone else, so asking for it looks exactly like asking for
 * a course that does not exist.
 */
export function courseVisibleTo(userId: number): Prisma.CourseWhereInput {
  return {
    published: true,
    OR: [
      { scope: 'PUBLIC', reviewStatus: 'APPROVED' },
      {
        scope: 'CLASSROOM',
        classroom: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      },
    ],
  };
}
