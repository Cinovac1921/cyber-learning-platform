// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import type { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

function makeService() {
  const prisma = {
    notification: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([
        { id: 2, type: 'COURSE_APPROVED', message: 'm2', link: '/a', readAt: null, createdAt: new Date('2026-11-12') },
        { id: 1, type: 'COURSE_REJECTED', message: 'm1', link: '/b', readAt: new Date('2026-11-11'), createdAt: new Date('2026-11-10') },
      ]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  return { service: new NotificationsService(prisma as unknown as PrismaService), prisma };
}

describe('NotificationsService', () => {
  it("lists only the signed-in person's own notifications, newest first, with the unread count", async () => {
    const { service, prisma } = makeService();
    const result = await service.list(7);

    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { userId: 7, readAt: null } });
    const query = prisma.notification.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ userId: 7 });
    expect(query.orderBy).toEqual({ createdAt: 'desc' });
    expect(query.take).toBe(20);

    expect(result.unreadCount).toBe(2);
    expect(result.items.map((item) => [item.id, item.read])).toEqual([
      [2, false],
      [1, true],
    ]);
    expect(result.items[0]).not.toHaveProperty('readAt');
  });

  it('marks only this person\'s unread notifications as read', async () => {
    const { service, prisma } = makeService();
    await service.markAllRead(7);
    const call = prisma.notification.updateMany.mock.calls[0][0];
    expect(call.where).toEqual({ userId: 7, readAt: null });
    expect(call.data.readAt).toBeInstanceOf(Date);
  });

  it("can't touch someone else's notification: the id is always paired with the caller's own id", async () => {
    const { service, prisma } = makeService();
    await service.markRead(55, 7);
    expect(prisma.notification.updateMany.mock.calls[0][0].where).toEqual({ id: 55, userId: 7, readAt: null });
  });
});
