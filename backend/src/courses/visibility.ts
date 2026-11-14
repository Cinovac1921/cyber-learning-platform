import type { Prisma } from '../generated/prisma/client';

/**
 * What a student is allowed to see. Every student-facing query uses these
 * pieces, so the rules live in one place instead of being repeated.
 */

/** A course in the public library: published, and meant for everyone. */
export const PUBLIC_COURSE = { published: true, scope: 'PUBLIC' } as const;

/** A lesson the instructor has not hidden. */
export const VISIBLE_LESSON = { visible: true } as const;

/**
 * Every course this person may open: the public ones, plus the published
 * courses of classrooms they belong to (or run). A classroom course is
 * invisible to everyone else, so asking for it looks exactly like asking for
 * a course that does not exist.
 */
export function courseVisibleTo(userId: number): Prisma.CourseWhereInput {
  return {
    published: true,
    OR: [
      { scope: 'PUBLIC' },
      {
        scope: 'CLASSROOM',
        classroom: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      },
    ],
  };
}
