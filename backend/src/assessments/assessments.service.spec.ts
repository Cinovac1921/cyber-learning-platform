// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { NotFoundException } from '@nestjs/common';
import { courseVisibleTo } from '../courses/visibility';
import type { PrismaService } from '../prisma/prisma.service';
import { AssessmentsService } from './assessments.service';

function makeService() {
  const prisma = {
    assessment: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
    attempt: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
  };
  return { service: new AssessmentsService(prisma as unknown as PrismaService), prisma };
}

describe('AssessmentsService: who may see a quiz', () => {
  it('opens a quiz only when its course is visible to this student', async () => {
    const { service, prisma } = makeService();
    await expect(service.findOne(5, 7)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.assessment.findFirst.mock.calls[0][0].where).toEqual({
      id: 5,
      published: true,
      course: courseVisibleTo(7),
    });
  });

  it('does not grade answers for a quiz the student cannot see', async () => {
    const { service, prisma } = makeService();
    await expect(service.submit(5, 7, { answers: [] })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.attempt.create).not.toHaveBeenCalled();
  });

  it('lists only quizzes from courses this student can open', async () => {
    const { service, prisma } = makeService();
    await service.list(7);
    expect(prisma.assessment.findMany.mock.calls[0][0].where).toMatchObject({
      published: true,
      course: courseVisibleTo(7),
    });
  });
});
