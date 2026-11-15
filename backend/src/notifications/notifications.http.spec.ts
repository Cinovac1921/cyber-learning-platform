// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('Notifications over HTTP', () => {
  let app: INestApplication;
  let server: Server;
  const notifications = {
    list: jest.fn().mockResolvedValue({ unreadCount: 1, items: [] }),
    markAllRead: jest.fn().mockResolvedValue({ ok: true }),
    markRead: jest.fn().mockResolvedValue({ ok: true }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: notifications }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => { user?: unknown } } }) => {
          context.switchToHttp().getRequest().user = { sub: 7, role: 'INSTRUCTOR' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterEach(() => app.close());

  it('always acts for the signed-in person, whatever the request says', async () => {
    await request(server).get('/notifications?userId=99').expect(200);
    expect(notifications.list).toHaveBeenCalledWith(7);

    await request(server).post('/notifications/read-all').expect(200);
    expect(notifications.markAllRead).toHaveBeenCalledWith(7);

    await request(server).post('/notifications/12/read').expect(200);
    expect(notifications.markRead).toHaveBeenCalledWith(12, 7);
  });

  it('rejects a notification id that is not a number', async () => {
    await request(server).post('/notifications/abc/read').expect(400);
    expect(notifications.markRead).not.toHaveBeenCalled();
  });
});
