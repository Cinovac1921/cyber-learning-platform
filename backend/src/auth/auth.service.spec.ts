// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { JwtService } from '@nestjs/jwt';
import type { MailService } from '../mail/mail.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { hashResetToken, RESET_LINK_INVALID_MESSAGE } from './password-reset';

function makeService(opts: { user?: unknown; recent?: unknown; tokenRecord?: unknown; spent?: number } = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue('user' in opts ? opts.user : null),
      update: jest.fn().mockResolvedValue({}),
    },
    passwordResetToken: {
      findFirst: jest.fn().mockResolvedValue(opts.recent ?? null),
      findUnique: jest.fn().mockResolvedValue('tokenRecord' in opts ? opts.tokenRecord : null),
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: opts.spent ?? 1 }),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  const mail = { appUrl: 'http://localhost:5173', send: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    {} as JwtService,
    mail as unknown as MailService,
  );
  return { service, prisma, mail };
}

const sam = { id: 7, email: 'sam@example.com' };

describe('AuthService.requestPasswordReset', () => {
  it('does nothing, quietly, when no account uses the email', async () => {
    const { service, prisma, mail } = makeService({ user: null });
    await expect(service.requestPasswordReset('nobody@example.com')).resolves.toBeUndefined();
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('looks the account up in lower case, like register does', async () => {
    const { service, prisma } = makeService({ user: null });
    await service.requestPasswordReset('Sam@Example.COM');
    expect(prisma.user.findUnique.mock.calls[0][0].where).toEqual({ email: 'sam@example.com' });
  });

  it('emails a link and stores only the hash of its token', async () => {
    const { service, prisma, mail } = makeService({ user: sam });
    await service.requestPasswordReset('sam@example.com');

    const text: string = mail.send.mock.calls[0][0].text;
    const token = /token=([A-Za-z0-9_-]+)/.exec(text)?.[1] ?? '';
    expect(token).toHaveLength(43);
    expect(mail.send.mock.calls[0][0].to).toBe('sam@example.com');

    const stored = prisma.passwordResetToken.create.mock.calls[0][0].data;
    expect(stored.tokenHash).toBe(hashResetToken(token));
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it('makes the link last about 30 minutes and cancels any earlier link', async () => {
    const { service, prisma } = makeService({ user: sam });
    const before = Date.now();
    await service.requestPasswordReset('sam@example.com');

    const { expiresAt } = prisma.passwordResetToken.create.mock.calls[0][0].data as { expiresAt: Date };
    const minutes = (expiresAt.getTime() - before) / 60_000;
    expect(minutes).toBeGreaterThan(29.9);
    expect(minutes).toBeLessThan(30.1);
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
  });

  it('does not send a second email within a minute', async () => {
    const { service, prisma, mail } = makeService({ user: sam, recent: { id: 1 } });
    await service.requestPasswordReset('sam@example.com');
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('never throws, even when the email cannot be sent', async () => {
    const logged = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { service, mail } = makeService({ user: sam });
    mail.send.mockRejectedValue(new Error('SMTP down'));
    await expect(service.requestPasswordReset('sam@example.com')).resolves.toBeUndefined();
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });
});

describe('AuthService.resetPassword', () => {
  const token = 'a'.repeat(43);

  it('finds the link by the hash of its token, never the token itself', async () => {
    const { service, prisma } = makeService({ tokenRecord: null });
    await expect(service.resetPassword(token, 'a-brand-new-password')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.passwordResetToken.findUnique.mock.calls[0][0].where).toEqual({ tokenHash: hashResetToken(token) });
  });

  it('gives one answer for an unknown, used or expired link, and changes nothing', async () => {
    const unknown = makeService({ tokenRecord: null });
    await expect(unknown.service.resetPassword(token, 'a-brand-new-password')).rejects.toThrow(RESET_LINK_INVALID_MESSAGE);

    // The link exists but was spent or expired by the time it is used: the one-step spend deletes nothing.
    const spent = makeService({ tokenRecord: { id: 5, userId: 7 }, spent: 0 });
    await expect(spent.service.resetPassword(token, 'a-brand-new-password')).rejects.toThrow(RESET_LINK_INVALID_MESSAGE);

    expect(unknown.prisma.user.update).not.toHaveBeenCalled();
    expect(spent.prisma.user.update).not.toHaveBeenCalled();
  });

  it('only spends a link that has not expired', async () => {
    const { service, prisma } = makeService({ tokenRecord: { id: 5, userId: 7 } });
    await service.resetPassword(token, 'a-brand-new-password');
    const where = prisma.passwordResetToken.deleteMany.mock.calls[0][0].where as {
      id: number;
      expiresAt: { gt: Date };
    };
    expect(where.id).toBe(5);
    expect(where.expiresAt.gt).toBeInstanceOf(Date);
  });

  it('saves the new password as a hash and removes every link for that account', async () => {
    const { service, prisma } = makeService({ tokenRecord: { id: 5, userId: 7 } });
    const result = await service.resetPassword(token, 'a-brand-new-password');

    expect(result.message).toContain('changed');
    const saved = prisma.user.update.mock.calls[0][0] as { where: { id: number }; data: { passwordHash: string } };
    expect(saved.where).toEqual({ id: 7 });
    expect(saved.data.passwordHash).not.toContain('a-brand-new-password');
    await expect(argon2.verify(saved.data.passwordHash, 'a-brand-new-password')).resolves.toBe(true);
    expect(prisma.passwordResetToken.deleteMany).toHaveBeenLastCalledWith({ where: { userId: 7 } });
  });
});
