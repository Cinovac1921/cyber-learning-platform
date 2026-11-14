import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChallengeDto, UpdateChallengeDto } from './dto/challenge.dto';
import { cleanFileName, FileStorage, type UploadedBlob } from './file-storage';
import { hashFlag, normalizeFlag } from './flag';

/** What an instructor sees of a challenge. There is no way to read the flag back, only whether one is set. */
const DETAIL = {
  id: true,
  title: true,
  category: true,
  difficulty: true,
  points: true,
  description: true,
  hint: true,
  fileName: true,
  fileSize: true,
  published: true,
  updatedAt: true,
  _count: { select: { solves: true } },
} as const;

@Injectable()
export class InstructorChallengesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FileStorage,
  ) {}

  async list(userId: number) {
    const challenges = await this.prisma.challenge.findMany({
      where: { authorId: userId },
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        category: true,
        difficulty: true,
        points: true,
        published: true,
        fileKey: true,
        _count: { select: { solves: true } },
      },
    });
    return challenges.map(({ fileKey, _count, ...challenge }) => ({
      ...challenge,
      hasFile: fileKey !== null,
      solveCount: _count.solves,
    }));
  }

  async create(userId: number, dto: CreateChallengeDto) {
    if (normalizeFlag(dto.flag) === '') {
      throw new BadRequestException('The flag cannot be blank.');
    }
    const created = await this.prisma.challenge.create({
      data: {
        authorId: userId,
        title: dto.title.trim(),
        category: dto.category,
        difficulty: dto.difficulty,
        points: dto.points,
        description: dto.description.trim(),
        hint: dto.hint?.trim() ?? '',
        ...hashFlag(dto.flag),
      },
      select: { id: true },
    });
    return { id: created.id };
  }

  async findOne(challengeId: number, userId: number) {
    const challenge = await this.prisma.challenge.findFirst({
      where: { id: challengeId, authorId: userId },
      select: DETAIL,
    });
    if (!challenge) throw new NotFoundException('Challenge not found.');

    const { fileName, fileSize, _count, ...rest } = challenge;
    return {
      ...rest,
      flagSet: true,
      file: fileName === null ? null : { name: fileName, size: fileSize ?? 0 },
      solveCount: _count.solves,
    };
  }

  async update(challengeId: number, userId: number, dto: UpdateChallengeDto) {
    await this.requireOwned(challengeId, userId);

    const { flag, title, description, hint, ...rest } = dto;
    if (flag !== undefined && normalizeFlag(flag) === '') {
      throw new BadRequestException('The flag cannot be blank.');
    }

    await this.prisma.challenge.update({
      where: { id: challengeId },
      data: {
        ...rest,
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(hint !== undefined && { hint: hint.trim() }),
        ...(flag !== undefined && hashFlag(flag)),
      },
    });
    return { ok: true };
  }

  async remove(challengeId: number, userId: number) {
    const challenge = await this.requireOwned(challengeId, userId);
    await this.prisma.challenge.delete({ where: { id: challengeId } });
    await this.files.remove(challenge.fileKey);
    return { ok: true };
  }

  /** Attaches a file, replacing the current one if there is one. */
  async setFile(
    challengeId: number,
    userId: number,
    blob: UploadedBlob | undefined,
  ) {
    if (!blob || blob.size === 0) {
      throw new BadRequestException('Choose a file to upload.');
    }
    const challenge = await this.requireOwned(challengeId, userId);

    const key = await this.files.save(blob);
    const name = cleanFileName(blob.originalname);
    try {
      await this.prisma.challenge.update({
        where: { id: challengeId },
        data: { fileKey: key, fileName: name, fileSize: blob.size },
      });
    } catch (error) {
      await this.files.remove(key);
      throw error;
    }
    await this.files.remove(challenge.fileKey);
    return { name, size: blob.size };
  }

  async removeFile(challengeId: number, userId: number) {
    const challenge = await this.requireOwned(challengeId, userId);
    await this.prisma.challenge.update({
      where: { id: challengeId },
      data: { fileKey: null, fileName: null, fileSize: null },
    });
    await this.files.remove(challenge.fileKey);
    return { ok: true };
  }

  /** Lets the author download their own file, even for a draft. */
  async fileFor(challengeId: number, userId: number) {
    const challenge = await this.requireOwned(challengeId, userId);
    if (
      !challenge.fileKey ||
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

  private async requireOwned(challengeId: number, userId: number) {
    const challenge = await this.prisma.challenge.findFirst({
      where: { id: challengeId, authorId: userId },
      select: { id: true, fileKey: true, fileName: true },
    });
    if (!challenge) throw new NotFoundException('Challenge not found.');
    return challenge;
  }
}
