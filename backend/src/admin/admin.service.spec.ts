// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

const student = {
  id: 2,
  email: 'student@example.com',
  displayName: 'Sam',
  role: 'STUDENT',
  createdAt: new Date('2026-11-01'),
};

function makeService(found: unknown = student) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(found),
      findMany: jest.fn().mockResolvedValue([student]),
      update: jest.fn().mockImplementation(({ data }: { data: object }) =>
        Promise.resolve({ ...student, ...data }),
      ),
    },
  };
  return { service: new AdminService(prisma as unknown as PrismaService), prisma };
}

describe('AdminService.changeRole', () => {
  it('promotes another account', async () => {
    const { service, prisma } = makeService();
    const updated = await service.changeRole(1, 2, 'INSTRUCTOR');
    expect(updated.role).toBe('INSTRUCTOR');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 2 }, data: { role: 'INSTRUCTOR' } }),
    );
  });

  it('refuses to change your own role', async () => {
    const { service, prisma } = makeService();
    await expect(service.changeRole(1, 1, 'STUDENT')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('says so when the account does not exist', async () => {
    const { service, prisma } = makeService(null);
    await expect(service.changeRole(1, 99, 'ADMIN')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not write when the role is already the one requested', async () => {
    const { service, prisma } = makeService();
    await expect(service.changeRole(1, 2, 'STUDENT')).resolves.toEqual(student);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('AdminService.listUsers', () => {
  it('lists everyone when there is no search', async () => {
    const { service, prisma } = makeService();
    await service.listUsers();
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
  });

  it('searches email and name, ignoring surrounding spaces', async () => {
    const { service, prisma } = makeService();
    await service.listUsers('  sam ');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ email: { contains: 'sam' } }, { displayName: { contains: 'sam' } }] },
      }),
    );
  });
});
