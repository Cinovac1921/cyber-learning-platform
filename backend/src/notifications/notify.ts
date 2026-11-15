import type { Prisma } from '../generated/prisma/client';

export interface NotificationData {
  type: 'COURSE_SUBMITTED' | 'COURSE_APPROVED' | 'COURSE_REJECTED' | 'COURSE_TAKEN_DOWN';
  message: string;
  link: string;
}

/**
 * These take the database client of a transaction, so a notification is saved in the same step as the
 * thing it reports. A decision can't happen without its notification, and a notification can't exist
 * for a decision that was rolled back.
 */

export async function notifyUser(tx: Prisma.TransactionClient, userId: number, data: NotificationData) {
  await tx.notification.create({ data: { userId, ...data } });
}

/** One notification for every admin. */
export async function notifyAdmins(tx: Prisma.TransactionClient, data: NotificationData) {
  const admins = await tx.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
  if (admins.length === 0) return;
  await tx.notification.createMany({ data: admins.map((admin) => ({ userId: admin.id, ...data })) });
}
