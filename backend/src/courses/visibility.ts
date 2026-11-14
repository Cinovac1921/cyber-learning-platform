/**
 * What a student is allowed to see. Every student-facing query uses these two
 * pieces, so the rules live in one place instead of being repeated.
 */

/** A course students can browse: published, and in the public library. */
export const PUBLIC_COURSE = { published: true, scope: 'PUBLIC' } as const;

/** A lesson the instructor has not hidden. */
export const VISIBLE_LESSON = { visible: true } as const;
