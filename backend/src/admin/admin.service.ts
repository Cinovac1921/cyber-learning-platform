import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { RoleValue } from '../auth/roles';
import { PrismaService } from '../prisma/prisma.service';

const MAX_USERS = 200;
const MAX_SEARCH_LENGTH = 100;

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  createdAt: true,
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lists accounts, oldest first. `search` matches part of the email or the name. */
  listUsers(search?: string) {
    const term = search?.trim().slice(0, MAX_SEARCH_LENGTH);
    return this.prisma.user.findMany({
      where: term
        ? { OR: [{ email: { contains: term } }, { displayName: { contains: term } }] }
        : undefined,
      orderBy: { createdAt: 'asc' },
      take: MAX_USERS,
      select: userSelect,
    });
  }

  /**
   * Changes one account's role. Admins cannot change their own role, so the
   * platform can never be left without an admin by a misclick.
   */
  async changeRole(actorId: number, targetId: number, role: RoleValue) {
    if (actorId === targetId) {
      throw new ForbiddenException('You cannot change your own role.');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: userSelect,
    });
    if (!target) {
      throw new NotFoundException('That account does not exist.');
    }
    if (target.role === role) {
      return target;
    }

    return this.prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: userSelect,
    });
  }
}
