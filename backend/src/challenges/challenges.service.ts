import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { checkFlag, normalizeFlag } from './flag';
import { FileStorage } from './file-storage';

/** Only challenges a student may see. */
const VISIBLE = { published: true } as const;

/** How many people the leaderboard lists. */
const LEADERBOARD_SIZE = 20;

export interface LeaderboardRow {
  rank: number;
  displayName: string;
  points: number;
  solves: number;
}

/** True when a database error says a unique row already exists. */
export function isDuplicateError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

/** Orders people by points, highest first. Whoever reached the score first wins a tie. */
export function rankScores<T extends { points: number; lastSolveAt: Date }>(
  rows: T[],
): (T & { rank: number })[] {
  return [...rows]
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.lastSolveAt.getTime() - b.lastSolveAt.getTime(),
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

@Injectable()
export class ChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorage,
  ) {}

  /** Every published challenge, with whether this student has solved it. */
  async list(userId: number) {
    const [challenges, solves] = await Promise.all([
      this.prisma.challenge.findMany({
        where: VISIBLE,
        orderBy: [{ category: 'asc' }, { points: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          title: true,
          category: true,
          difficulty: true,
          points: true,
          fileKey: true,
          _count: { select: { solves: true } },
        },
      }),
      this.prisma.challengeSolve.findMany({
        where: { userId },
        select: { challengeId: true },
      }),
    ]);
    const solved = new Set(solves.map((solve) => solve.challengeId));

    return challenges.map(({ fileKey, _count, ...challenge }) => ({
      ...challenge,
      hasFile: fileKey !== null,
      solveCount: _count.solves,
      solved: solved.has(challenge.id),
    }));
  }

  async findOne(challengeId: number, userId: number) {
    const challenge = await this.prisma.challenge.findFirst({
      where: { id: challengeId, ...VISIBLE },
      select: {
        id: true,
        title: true,
        category: true,
        difficulty: true,
        points: true,
        description: true,
        hint: true,
        fileName: true,
        fileSize: true,
        _count: { select: { solves: true } },
      },
    });
    if (!challenge) throw new NotFoundException('Challenge not found.');

    const solve = await this.prisma.challengeSolve.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
      select: { createdAt: true },
    });
    const { fileName, fileSize, _count, ...rest } = challenge;

    return {
      ...rest,
      file: fileName === null ? null : { name: fileName, size: fileSize ?? 0 },
      solveCount: _count.solves,
      solved: solve !== null,
      solvedAt: solve?.createdAt ?? null,
    };
  }

  /**
   * Checks a submitted flag. The first correct submission records the solve and
   * awards the points. Later ones never add points again.
   */
  async submit(challengeId: number, userId: number, flag: string) {
    if (normalizeFlag(flag) === '') {
      throw new BadRequestException('Enter a flag.');
    }

    const challenge = await this.prisma.challenge.findFirst({
      where: { id: challengeId, ...VISIBLE },
      select: { id: true, points: true, flagSalt: true, flagHash: true },
    });
    if (!challenge) throw new NotFoundException('Challenge not found.');

    const correct = checkFlag(flag, challenge.flagSalt, challenge.flagHash);
    if (!correct) return { correct: false, alreadySolved: false, points: 0 };

    const existing = await this.prisma.challengeSolve.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
      select: { id: true },
    });
    if (existing) return { correct: true, alreadySolved: true, points: 0 };

    try {
      await this.prisma.challengeSolve.create({
        data: { userId, challengeId, points: challenge.points },
      });
    } catch (error) {
      // Two submissions arrived together: the other one recorded it first.
      if (isDuplicateError(error))
        return { correct: true, alreadySolved: true, points: 0 };
      throw error;
    }
    return { correct: true, alreadySolved: false, points: challenge.points };
  }

  /** The attached file of a published challenge, ready to stream. */
  async fileFor(challengeId: number) {
    const challenge = await this.prisma.challenge.findFirst({
      where: { id: challengeId, ...VISIBLE },
      select: { fileKey: true, fileName: true },
    });
    if (
      !challenge?.fileKey ||
      !challenge.fileName ||
      !(await this.files.exists(challenge.fileKey))
    ) {
      throw new NotFoundException('This challenge has no file.');
    }
    return {
      stream: this.files.open(challenge.fileKey),
      name: challenge.fileName,
    };
  }

  /** Students ranked by total points. Instructors are not ranked. */
  async leaderboard(userId: number) {
    const totals = await this.prisma.challengeSolve.groupBy({
      by: ['userId'],
      where: { user: { role: 'STUDENT' } },
      _sum: { points: true },
      _count: { _all: true },
      _max: { createdAt: true },
    });

    const users = await this.prisma.user.findMany({
      where: { id: { in: totals.map((total) => total.userId) } },
      select: { id: true, displayName: true },
    });
    const names = new Map(users.map((user) => [user.id, user.displayName]));

    const ranked = rankScores(
      totals.map((total) => ({
        userId: total.userId,
        displayName: names.get(total.userId) ?? 'Student',
        points: total._sum.points ?? 0,
        solves: total._count._all,
        lastSolveAt: total._max.createdAt ?? new Date(0),
      })),
    );

    const toRow = ({
      rank,
      displayName,
      points,
      solves,
    }: (typeof ranked)[number]): LeaderboardRow => ({
      rank,
      displayName,
      points,
      solves,
    });
    const mine = ranked.find((row) => row.userId === userId);

    return {
      top: ranked.slice(0, LEADERBOARD_SIZE).map(toRow),
      me: mine ? toRow(mine) : null,
    };
  }
}
