// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { InstructorGuard } from '../instructor/instructor.guard';
import { AdminGuard } from './admin.guard';

function contextFor(userId?: number) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: userId === undefined ? undefined : { sub: userId, role: 'STUDENT' } }),
    }),
  } as unknown as ExecutionContext;
}

function prismaWithRole(role: string | null) {
  return {
    user: { findUnique: jest.fn().mockResolvedValue(role ? { role } : null) },
  } as unknown as PrismaService;
}

describe('AdminGuard', () => {
  it('lets an admin through', async () => {
    await expect(new AdminGuard(prismaWithRole('ADMIN')).canActivate(contextFor(1))).resolves.toBe(true);
  });

  it.each(['STUDENT', 'INSTRUCTOR'])('blocks a %s', async (role) => {
    await expect(new AdminGuard(prismaWithRole(role)).canActivate(contextFor(1))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks an account that no longer exists', async () => {
    await expect(new AdminGuard(prismaWithRole(null)).canActivate(contextFor(1))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks a request with no signed-in user', async () => {
    await expect(new AdminGuard(prismaWithRole('ADMIN')).canActivate(contextFor())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe('InstructorGuard', () => {
  it.each(['INSTRUCTOR', 'ADMIN'])('lets a %s through', async (role) => {
    await expect(new InstructorGuard(prismaWithRole(role)).canActivate(contextFor(1))).resolves.toBe(true);
  });

  it('blocks a student', async () => {
    await expect(new InstructorGuard(prismaWithRole('STUDENT')).canActivate(contextFor(1))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
