// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { InstructorClassroomsService } from './instructor-classrooms.service';

function makeService(opts: { owns?: boolean; courses?: number } = {}) {
  const prisma = {
    classroom: {
      findFirst: jest.fn().mockResolvedValue(opts.owns === false ? null : { id: 3 }),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 3 }),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    classroomMember: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    course: { count: jest.fn().mockResolvedValue(opts.courses ?? 0) },
  };
  return { service: new InstructorClassroomsService(prisma as unknown as PrismaService), prisma };
}

describe('InstructorClassroomsService', () => {
  it('creates a classroom owned by the instructor with a fresh join code', async () => {
    const { service, prisma } = makeService();
    await service.create(7, { name: '  Net Sec A  ' });

    const data = prisma.classroom.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ ownerId: 7, name: 'Net Sec A', description: '' });
    expect(data.joinCode).toMatch(/^[A-Z2-9]{8}$/);
  });

  it('rejects a name that is only spaces', async () => {
    const { service, prisma } = makeService();
    await expect(service.create(7, { name: '     ' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.classroom.create).not.toHaveBeenCalled();
  });

  it('keeps asking for a code until it finds one nobody uses', async () => {
    const { service, prisma } = makeService();
    prisma.classroom.findUnique.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null);
    await service.create(7, { name: 'Net Sec A' });
    expect(prisma.classroom.findUnique).toHaveBeenCalledTimes(2);
  });

  it('treats a classroom run by someone else as not found, for every action', async () => {
    const { service, prisma } = makeService({ owns: false });
    await expect(service.get(3, 55)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(3, 55, { name: 'Hacked' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.regenerateJoinCode(3, 55)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.removeMember(3, 55, 9)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(3, 55)).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.classroom.update).not.toHaveBeenCalled();
    expect(prisma.classroomMember.deleteMany).not.toHaveBeenCalled();
    expect(prisma.classroom.delete).not.toHaveBeenCalled();
  });

  it('replaces the join code and shows it in the ABCD-EFGH form', async () => {
    const { service, prisma } = makeService();
    const { joinCode } = await service.regenerateJoinCode(3, 7);
    expect(joinCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(prisma.classroom.update.mock.calls[0][0].data.joinCode).toBe(joinCode.replace('-', ''));
  });

  it('can close joining without touching members', async () => {
    const { service, prisma } = makeService();
    await service.update(3, 7, { joinOpen: false });
    expect(prisma.classroom.update).toHaveBeenCalledWith({ where: { id: 3 }, data: { joinOpen: false } });
    expect(prisma.classroomMember.deleteMany).not.toHaveBeenCalled();
  });

  it('removes one student from this classroom only', async () => {
    const { service, prisma } = makeService();
    await service.removeMember(3, 7, 9);
    expect(prisma.classroomMember.deleteMany).toHaveBeenCalledWith({ where: { classroomId: 3, userId: 9 } });
  });

  it('will not delete a classroom that still has courses', async () => {
    const { service, prisma } = makeService({ courses: 2 });
    await expect(service.remove(3, 7)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.classroom.delete).not.toHaveBeenCalled();
  });

  it('deletes an empty classroom', async () => {
    const { service, prisma } = makeService({ courses: 0 });
    await service.remove(3, 7);
    expect(prisma.classroom.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });
});
