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
