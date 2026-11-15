import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const RECENT = 20;

/** A person's own notifications. Every query is limited to the signed-in person's id. */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number) {
    const [unreadCount, items] = await Promise.all([
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: RECENT,
        select: { id: true, type: true, message: true, link: true, readAt: true, createdAt: true },
      }),
    ]);

    return {
      unreadCount,
      items: items.map(({ readAt, ...item }) => ({ ...item, read: readAt !== null })),
    };
  }

  async markAllRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  /** Someone else's notification id simply matches nothing, so there is nothing to leak or change. */
  async markRead(notificationId: number, userId: number) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }
}
