import type { Prisma } from '../generated/prisma/client';

/**
 * What instructors can borrow from. Two pools, with different rules:
 *
 * - TEMPLATE courses are starter material that admins prepare. Instructors can copy their lessons and their quizzes.
 * - PUBLIC courses are the live public library. Instructors can copy their lessons, but never their quizzes:
 *   public quizzes are practice quizzes that every student can already take and see the answers to, so a
 *   classroom quiz copied from one would be a cheat sheet.
 *
 * A template only counts once an admin has marked it published ("ready"). Classroom courses and other
 * people's drafts are never part of the library.
 */

/** A template that is ready for instructors to use. */
export const TEMPLATE_COURSE = { scope: 'TEMPLATE', published: true } as const;

/** A course in the live public library. */
export const LIVE_PUBLIC_COURSE = { scope: 'PUBLIC', published: true, reviewStatus: 'APPROVED' } as const;

/** Any course in the library: a ready template, or a live public course. */
export const LIBRARY_COURSE: Prisma.CourseWhereInput = {
  OR: [TEMPLATE_COURSE, LIVE_PUBLIC_COURSE],
};
