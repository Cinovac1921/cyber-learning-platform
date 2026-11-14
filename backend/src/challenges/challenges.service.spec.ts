// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import {
  ChallengesService,
  isDuplicateError,
  rankScores,
} from './challenges.service';
import type { FileStorage } from './file-storage';
import { hashFlag } from './flag';

const secret = hashFlag('flag{correct}');

function makeService(
  overrides: { solve?: unknown; create?: jest.Mock; challenge?: unknown } = {},
) {
  const create = overrides.create ?? jest.fn().mockResolvedValue({});
  const prisma = {
    challenge: {
      findFirst: jest
        .fn()
        .mockResolvedValue(
          'challenge' in overrides
            ? overrides.challenge
            : { id: 1, points: 150, ...secret },
        ),
    },
    challengeSolve: {
      findUnique: jest.fn().mockResolvedValue(overrides.solve ?? null),
      create,
    },
  };
  const service = new ChallengesService(
    prisma as unknown as PrismaService,
    {} as FileStorage,
  );
  return { service, prisma, create };
}

describe('ChallengesService.submit', () => {
  it('records the solve and awards points on the first correct flag', async () => {
    const { service, create } = makeService();
    await expect(service.submit(1, 7, 'flag{correct}')).resolves.toEqual({
      correct: true,
      alreadySolved: false,
      points: 150,
    });
    expect(create).toHaveBeenCalledWith({
      data: { userId: 7, challengeId: 1, points: 150 },
    });
  });

  it('says a wrong flag is wrong and records nothing', async () => {
    const { service, create } = makeService();
    await expect(service.submit(1, 7, 'flag{nope}')).resolves.toEqual({
      correct: false,
      alreadySolved: false,
      points: 0,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('gives no points again for a challenge already solved', async () => {
    const { service, create } = makeService({ solve: { id: 3 } });
    await expect(service.submit(1, 7, 'flag{correct}')).resolves.toEqual({
      correct: true,
      alreadySolved: true,
      points: 0,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('treats a duplicate from two simultaneous submissions as already solved', async () => {
    const create = jest.fn().mockRejectedValue({ code: 'P2002' });
    const { service } = makeService({ create });
    await expect(service.submit(1, 7, 'flag{correct}')).resolves.toMatchObject({
      correct: true,
      alreadySolved: true,
      points: 0,
    });
  });

  it('passes on other database errors', async () => {
    const create = jest.fn().mockRejectedValue(new Error('db down'));
    const { service } = makeService({ create });
    await expect(service.submit(1, 7, 'flag{correct}')).rejects.toThrow(
      'db down',
    );
  });

  it('refuses a blank flag instead of comparing it', async () => {
    const { service, prisma } = makeService();
    await expect(service.submit(1, 7, '   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.challenge.findFirst).not.toHaveBeenCalled();
  });

  it('returns not found for a missing or unpublished challenge', async () => {
    const { service } = makeService({ challenge: null });
    await expect(service.submit(1, 7, 'flag{correct}')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('only looks at published challenges', async () => {
    const { service, prisma } = makeService();
    await service.submit(1, 7, 'flag{correct}');
    expect(prisma.challenge.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1, published: true } }),
    );
  });
});

describe('rankScores', () => {
  const day = (n: number) => new Date(2026, 10, n);

  it('puts the highest points first and numbers the ranks', () => {
    const ranked = rankScores([
      { name: 'a', points: 100, lastSolveAt: day(1) },
      { name: 'b', points: 300, lastSolveAt: day(2) },
      { name: 'c', points: 200, lastSolveAt: day(3) },
    ]);
    expect(ranked.map((row) => [row.name, row.rank])).toEqual([
      ['b', 1],
      ['c', 2],
      ['a', 3],
    ]);
  });

  it('gives a tie to whoever reached the score first', () => {
    const ranked = rankScores([
      { name: 'late', points: 200, lastSolveAt: day(9) },
      { name: 'early', points: 200, lastSolveAt: day(2) },
    ]);
    expect(ranked.map((row) => row.name)).toEqual(['early', 'late']);
  });

  it('does not change the list it was given', () => {
    const input = [
      { points: 1, lastSolveAt: day(1) },
      { points: 2, lastSolveAt: day(1) },
    ];
    rankScores(input);
    expect(input[0].points).toBe(1);
  });
});

describe('isDuplicateError', () => {
  it('recognises the unique-row error code only', () => {
    expect(isDuplicateError({ code: 'P2002' })).toBe(true);
    expect(isDuplicateError({ code: 'P2025' })).toBe(false);
    expect(isDuplicateError(new Error('x'))).toBe(false);
    expect(isDuplicateError(null)).toBe(false);
  });
});
