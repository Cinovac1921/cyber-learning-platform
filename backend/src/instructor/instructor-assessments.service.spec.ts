// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ConflictException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { InstructorAssessmentsService } from './instructor-assessments.service';

const question = { prompt: 'Which port does HTTPS use?', options: [{ text: '443', isCorrect: true }, { text: '80', isCorrect: false }] };

function makeService(reviewStatus: string) {
  const course = { reviewStatus };
  const prisma = {
    course: { findFirst: jest.fn().mockResolvedValue({ id: 1, ...course }) },
    assessment: {
      findFirst: jest.fn().mockResolvedValue({
        id: 4,
        course,
        title: 'Quiz',
        _count: { questions: 2, attempts: 0 },
        questions: [],
      }),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 4 }),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    question: {
      findFirst: jest.fn().mockResolvedValue({ id: 6, assessmentId: 4, position: 1, assessment: { course } }),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 6, position: 1 }),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    option: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
  };
  return { service: new InstructorAssessmentsService(prisma as unknown as PrismaService), prisma };
}

describe('InstructorAssessmentsService: quizzes of a course in review or live are locked too', () => {
  it.each(['PENDING', 'APPROVED'])('refuses every change while the course is %s', async (status) => {
    const { service, prisma } = makeService(status);

    await expect(service.create(1, 7, { title: 'New quiz' })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.update(4, 7, { title: 'Renamed' })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.update(4, 7, { published: true })).rejects.toBeInstanceOf(ConflictException);
    await expect(service.remove(4, 7)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.addQuestion(4, 7, question)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.updateQuestion(6, 7, question)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.deleteQuestion(6, 7)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.moveQuestion(6, 7, 'down')).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.assessment.create).not.toHaveBeenCalled();
    expect(prisma.assessment.update).not.toHaveBeenCalled();
    expect(prisma.assessment.delete).not.toHaveBeenCalled();
    expect(prisma.question.create).not.toHaveBeenCalled();
    expect(prisma.question.update).not.toHaveBeenCalled();
    expect(prisma.question.delete).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['NONE', 'REJECTED'])('allows changes while the course is %s', async (status) => {
    const { service, prisma } = makeService(status);
    await service.create(1, 7, { title: 'New quiz' });
    await service.update(4, 7, { title: 'Renamed' });
    await service.addQuestion(4, 7, question);
    expect(prisma.assessment.create).toHaveBeenCalled();
    expect(prisma.assessment.update).toHaveBeenCalled();
    expect(prisma.question.create).toHaveBeenCalled();
  });

  it('still lets the instructor read a locked course\'s quizzes', async () => {
    const { service } = makeService('APPROVED');
    await expect(service.listForCourse(1, 7)).resolves.toEqual([]);
    await expect(service.findOne(4, 7)).resolves.toBeDefined();
  });
});
