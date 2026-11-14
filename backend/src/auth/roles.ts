/** Every role an account can have. ADMIN can also do everything an INSTRUCTOR can. */
export const ROLES = ['STUDENT', 'INSTRUCTOR', 'ADMIN'] as const;
export type RoleValue = (typeof ROLES)[number];
