import type { Role } from '../../types/api'

export const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'Student',
  INSTRUCTOR: 'Instructor',
  ADMIN: 'Admin',
}

export const ROLE_OPTIONS: Role[] = ['STUDENT', 'INSTRUCTOR', 'ADMIN']

/** Admins can do everything instructors can. */
export function canTeach(role: Role | undefined): boolean {
  return role === 'INSTRUCTOR' || role === 'ADMIN'
}

/**
 * Where to go after signing in. A signed-out visitor is sent back to the page they
 * were heading for, but only when the account that just signed in is allowed there.
 * Otherwise (for example switching from an admin to an instructor) it is the home page.
 */
export function destinationFor(from: string, role: Role | undefined): string {
  if (from.startsWith('/admin') && role !== 'ADMIN') return '/'
  if (from.startsWith('/instructor') && !canTeach(role)) return '/'
  return from
}
