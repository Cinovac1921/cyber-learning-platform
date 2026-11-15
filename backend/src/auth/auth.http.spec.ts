// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { Server } from 'node:http';
import { MailService } from '../mail/mail.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RESET_REQUESTED_MESSAGE } from './password-reset';

describe('Forgot and reset password over HTTP', () => {
  let app: INestApplication;
  let server: Server;
  const requestPasswordReset = jest.fn().mockResolvedValue(undefined);
  const isResetLinkUsable = jest.fn().mockResolvedValue(true);
  const resetPassword = jest.fn().mockResolvedValue({ message: 'Your password has been changed. You can sign in now.' });

  // A fresh app for every test, so the rate limit's counter starts at zero each time.
  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: { requestPasswordReset, resetPassword, isResetLinkUsable } },
        { provide: JwtService, useValue: {} },
        { provide: MailService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    // The same settings as main.ts.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterEach(() => app.close());

  it('gives the same answer for any valid email, so it cannot be used to find accounts', async () => {
    const known = await request(server).post('/auth/forgot-password').send({ email: 'sam@example.com' });
    const unknown = await request(server).post('/auth/forgot-password').send({ email: 'nobody@example.com' });

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body).toEqual({ message: RESET_REQUESTED_MESSAGE });
    expect(unknown.body).toEqual(known.body);
    expect(requestPasswordReset).toHaveBeenCalledWith('sam@example.com');
  });

  it('answers before the email work is finished', async () => {
    let finish: () => void = () => undefined;
    requestPasswordReset.mockReturnValueOnce(new Promise<void>((resolve) => (finish = resolve)));

    const response = await request(server).post('/auth/forgot-password').send({ email: 'sam@example.com' });
    expect(response.status).toBe(200);
    finish();
  });

  it('rejects something that is not an email', async () => {
    await request(server).post('/auth/forgot-password').send({ email: 'not-an-email' }).expect(400);
    await request(server).post('/auth/forgot-password').send({}).expect(400);
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it('refuses extra fields', async () => {
    await request(server)
      .post('/auth/forgot-password')
      .send({ email: 'sam@example.com', role: 'ADMIN' })
      .expect(400);
  });

  it('limits how often one person can ask: 3 a minute', async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(server).post('/auth/forgot-password').send({ email: 'sam@example.com' }).expect(200);
    }
    await request(server).post('/auth/forgot-password').send({ email: 'sam@example.com' }).expect(429);
    expect(requestPasswordReset).toHaveBeenCalledTimes(3);
  });

  it('tells the reset page whether a link still works', async () => {
    const token = 'a'.repeat(43);
    isResetLinkUsable.mockResolvedValueOnce(false);
    const dead = await request(server).post('/auth/reset-password/check').send({ token });
    const alive = await request(server).post('/auth/reset-password/check').send({ token });

    expect(dead.status).toBe(200);
    expect(dead.body).toEqual({ valid: false });
    expect(alive.body).toEqual({ valid: true });
  });

  it('does not even look up a token that is clearly not one', async () => {
    await request(server).post('/auth/reset-password/check').send({ token: 'tiny' }).expect(400);
    await request(server).post('/auth/reset-password/check').send({}).expect(400);
    expect(isResetLinkUsable).not.toHaveBeenCalled();
  });

  it('resets with a token and a long enough password', async () => {
    const token = 'a'.repeat(43);
    const response = await request(server)
      .post('/auth/reset-password')
      .send({ token, password: 'a-brand-new-password' });

    expect(response.status).toBe(200);
    expect(resetPassword).toHaveBeenCalledWith(token, 'a-brand-new-password');
  });

  it('enforces the same password rules as registering, before anything is looked up', async () => {
    const token = 'a'.repeat(43);
    await request(server).post('/auth/reset-password').send({ token, password: 'short' }).expect(400);
    await request(server).post('/auth/reset-password').send({ token: 'tiny', password: 'a-brand-new-password' }).expect(400);
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
