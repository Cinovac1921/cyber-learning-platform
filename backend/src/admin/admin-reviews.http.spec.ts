// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminReviewsController } from './admin-reviews.controller';
import { AdminReviewsService } from './admin-reviews.service';
import { AdminGuard } from './admin.guard';

describe('Course review over HTTP', () => {
  let app: INestApplication;
  let server: Server;
  const reviews = {
    list: jest.fn().mockResolvedValue({ pending: [], live: [] }),
    detail: jest.fn(),
    approve: jest.fn().mockResolvedValue({ ok: true }),
    reject: jest.fn().mockResolvedValue({ ok: true }),
    takedown: jest.fn().mockResolvedValue({ ok: true }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminReviewsController],
      providers: [{ provide: AdminReviewsService, useValue: reviews }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => { user?: unknown } } }) => {
          context.switchToHttp().getRequest().user = { sub: 99, role: 'ADMIN' };
          return true;
        },
      })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    // The same settings as main.ts.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterEach(() => app.close());

  it('records the signed-in admin as the one who decided', async () => {
    await request(server).post('/admin/reviews/3/approve').expect(200);
    expect(reviews.approve).toHaveBeenCalledWith(3, 99);

    await request(server).post('/admin/reviews/3/reject').send({ note: 'Please fix lesson 2.' }).expect(200);
    expect(reviews.reject).toHaveBeenCalledWith(3, 99, 'Please fix lesson 2.');

    await request(server).post('/admin/reviews/3/takedown').send({ note: 'Reported as wrong.' }).expect(200);
    expect(reviews.takedown).toHaveBeenCalledWith(3, 99, 'Reported as wrong.');
  });

  it('will not reject or take down without a reason', async () => {
    await request(server).post('/admin/reviews/3/reject').send({}).expect(400);
    await request(server).post('/admin/reviews/3/reject').send({ note: 'no' }).expect(400);
    await request(server).post('/admin/reviews/3/takedown').send({ note: 'x'.repeat(501) }).expect(400);
    expect(reviews.reject).not.toHaveBeenCalled();
    expect(reviews.takedown).not.toHaveBeenCalled();
  });

  it('refuses extra fields and a course id that is not a number', async () => {
    await request(server).post('/admin/reviews/3/reject').send({ note: 'Please fix it.', reviewedById: 1 }).expect(400);
    await request(server).post('/admin/reviews/abc/approve').expect(400);
    expect(reviews.approve).not.toHaveBeenCalled();
  });
});
