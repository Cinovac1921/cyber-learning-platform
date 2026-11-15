// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest, JwtPayload } from './auth.types';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeGuard(opts: { payload?: JwtPayload; invalid?: boolean; account?: { tokenVersion: number } | null }) {
  const jwt = {
    verifyAsync: jest.fn(() =>
      opts.invalid ? Promise.reject(new Error('bad signature')) : Promise.resolve(opts.payload),
    ),
  };
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue('account' in opts ? opts.account : { tokenVersion: 0 }),
    },
  };
  const request: AuthenticatedRequest = { headers: { authorization: 'Bearer some.jwt.token' } };
  const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  const guard = new JwtAuthGuard(jwt as unknown as JwtService, prisma as unknown as PrismaService);
  return { guard, context, request, prisma };
}

describe('JwtAuthGuard', () => {
  it('lets a token through when its version matches the account', async () => {
    const { guard, context, request, prisma } = makeGuard({
      payload: { sub: 7, role: 'STUDENT', ver: 2 },
      account: { tokenVersion: 2 },
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ sub: 7, role: 'STUDENT', ver: 2 });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 7 }, select: { tokenVersion: true } });
  });

  it('rejects a token made before the password was reset', async () => {
    const { guard, context, request } = makeGuard({
      payload: { sub: 7, role: 'STUDENT', ver: 2 },
      account: { tokenVersion: 3 },
    });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(request.user).toBeUndefined();
  });

  it('keeps sessions from before versions existed working, as version 0', async () => {
    const { guard, context } = makeGuard({ payload: { sub: 7, role: 'STUDENT' }, account: { tokenVersion: 0 } });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('ends those old sessions as soon as the password is reset', async () => {
    const { guard, context } = makeGuard({ payload: { sub: 7, role: 'STUDENT' }, account: { tokenVersion: 1 } });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token for an account that no longer exists', async () => {
    const { guard, context } = makeGuard({ payload: { sub: 7, role: 'STUDENT', ver: 0 }, account: null });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a forged or expired token without touching the database', async () => {
    const { guard, context, prisma } = makeGuard({ invalid: true });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a request with no token', async () => {
    const { guard, context, request } = makeGuard({ payload: { sub: 7, role: 'STUDENT', ver: 0 } });
    request.headers = {};
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
