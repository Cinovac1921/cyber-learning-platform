// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import type { Server } from 'node:http';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InstructorGuard } from '../instructor/instructor.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ChallengesController } from './challenges.controller';
import { ChallengesService } from './challenges.service';
import { FileStorage } from './file-storage';
import { hashFlag } from './flag';
import { InstructorChallengesController } from './instructor-challenges.controller';
import { InstructorChallengesService } from './instructor-challenges.service';

type Row = Record<string, unknown>;

/** A tiny in-memory stand-in for the parts of the database these routes use. */
function fakePrisma() {
  const rows = new Map<number, Row>();
  const solves: Row[] = [];
  let nextId = 1;

  /** Only the fields a query asked for, like the real database. */
  const pick = (row: Row, select?: Row): Row => {
    const full: Row = { ...row, _count: { solves: 0 } };
    if (!select) return full;
    return Object.fromEntries(
      Object.keys(select)
        .filter((key) => select[key])
        .map((key) => [key, full[key]]),
    );
  };

  const matches = (row: Row, where: Row) =>
    Object.entries(where).every(([key, value]) => row[key] === value);

  return {
    rows,
    solves,
    user: {
      findUnique: ({ where }: { where: { id: number } }) =>
        Promise.resolve({ role: where.id === 1 ? 'INSTRUCTOR' : 'STUDENT' }),
    },
    challenge: {
      create: ({ data }: { data: Row }) => {
        const row = {
          id: nextId++,
          published: false,
          fileKey: null,
          fileName: null,
          fileSize: null,
          ...data,
        };
        rows.set(row.id, row);
        return Promise.resolve({ id: row.id });
      },
      findFirst: ({ where, select }: { where: Row; select?: Row }) => {
        const found = [...rows.values()].find((row) => matches(row, where));
        return Promise.resolve(found ? pick(found, select) : null);
      },
      findMany: ({ select }: { select?: Row } = {}) =>
        Promise.resolve([...rows.values()].map((row) => pick(row, select))),
      update: ({ where, data }: { where: { id: number }; data: Row }) => {
        // Prisma treats undefined as "leave this field alone".
        Object.assign(
          rows.get(where.id)!,
          Object.fromEntries(
            Object.entries(data).filter(([, value]) => value !== undefined),
          ),
        );
        return Promise.resolve(rows.get(where.id));
      },
      delete: ({ where }: { where: { id: number } }) => {
        rows.delete(where.id);
        return Promise.resolve({});
      },
    },
    challengeSolve: {
      findUnique: () => Promise.resolve(null),
      findMany: () => Promise.resolve([]),
      create: ({ data }: { data: Row }) => {
        solves.push(data);
        return Promise.resolve(data);
      },
    },
  };
}

describe('Challenges over HTTP', () => {
  let app: INestApplication;
  let http: Server;
  let folder: string;
  let prisma: ReturnType<typeof fakePrisma>;

  const instructor = { 'x-user': '1' };
  const student = { 'x-user': '2' };
  const newChallenge = {
    title: 'Hidden in plain sight',
    category: 'FORENSICS',
    difficulty: 'EASY',
    points: 100,
    description: 'Find the flag in the image.',
    flag: 'flag{found_it}',
  };

  beforeAll(async () => {
    folder = await mkdtemp(join(tmpdir(), 'challenge-http-'));
    prisma = fakePrisma();

    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }])],
      controllers: [ChallengesController, InstructorChallengesController],
      providers: [
        ChallengesService,
        InstructorChallengesService,
        InstructorGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: FileStorage, useValue: new FileStorage(folder) },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => {
              headers: Record<string, string>;
              user?: unknown;
            };
          };
        }) => {
          const req = context.switchToHttp().getRequest();
          req.user = { sub: Number(req.headers['x-user']), role: 'X' };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    http = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
    await rm(folder, { recursive: true, force: true });
  });

  it('lets students nowhere near the instructor routes', async () => {
    await request(http).get('/instructor/challenges').set(student).expect(403);
    await request(http)
      .post('/instructor/challenges')
      .set(student)
      .send(newChallenge)
      .expect(403);
  });

  it('rejects a challenge with an unknown category, a bad point value or an extra field', async () => {
    await request(http)
      .post('/instructor/challenges')
      .set(instructor)
      .send({ ...newChallenge, category: 'PWN' })
      .expect(400);
    await request(http)
      .post('/instructor/challenges')
      .set(instructor)
      .send({ ...newChallenge, points: 0 })
      .expect(400);
    await request(http)
      .post('/instructor/challenges')
      .set(instructor)
      .send({ ...newChallenge, flag: '' })
      .expect(400);
    await request(http)
      .post('/instructor/challenges')
      .set(instructor)
      .send({ ...newChallenge, flagHash: 'x' })
      .expect(400);
    await request(http)
      .post('/instructor/challenges')
      .set(instructor)
      .send({ ...newChallenge, flag: '   ' })
      .expect(400);
  });

  let id: number;

  it('creates a challenge and never sends the flag back', async () => {
    const created = await request(http)
      .post('/instructor/challenges')
      .set(instructor)
      .send(newChallenge)
      .expect(201);
    id = created.body.id as number;

    const detail = await request(http)
      .get(`/instructor/challenges/${id}`)
      .set(instructor)
      .expect(200);
    expect(detail.body).toMatchObject({
      title: 'Hidden in plain sight',
      category: 'FORENSICS',
      flagSet: true,
      file: null,
    });
    expect(JSON.stringify(detail.body)).not.toContain('found_it');
    expect(detail.body).not.toHaveProperty('flagHash');
    expect(detail.body).not.toHaveProperty('flagSalt');
  });

  it('keeps a draft hidden from students', async () => {
    await request(http).get(`/challenges/${id}`).set(student).expect(404);
    await request(http)
      .post(`/challenges/${id}/submit`)
      .set(student)
      .send({ flag: 'flag{found_it}' })
      .expect(404);
  });

  it('refuses an upload with no file', async () => {
    await request(http)
      .put(`/instructor/challenges/${id}/file`)
      .set(instructor)
      .expect(400);
  });

  it('refuses a file over the size limit', async () => {
    await request(http)
      .put(`/instructor/challenges/${id}/file`)
      .set(instructor)
      .attach('file', Buffer.alloc(26 * 1024 * 1024, 1), 'big.bin')
      .expect(413);
  });

  it('stores an uploaded file and serves it to students only after publishing', async () => {
    const content = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0x10]);
    const uploaded = await request(http)
      .put(`/instructor/challenges/${id}/file`)
      .set(instructor)
      .attach('file', content, '../../evil "name".png')
      .expect(200);
    expect(uploaded.body).toEqual({
      name: 'evil _name_.png',
      size: content.length,
    });

    // Still a draft: students cannot download it.
    await request(http).get(`/challenges/${id}/file`).set(student).expect(404);

    // The instructor can preview it.
    const preview = await request(http)
      .get(`/instructor/challenges/${id}/file`)
      .set(instructor)
      .expect(200);
    expect(Buffer.compare(preview.body as Buffer, content)).toBe(0);

    await request(http)
      .patch(`/instructor/challenges/${id}`)
      .set(instructor)
      .send({ published: true })
      .expect(200);

    const download = await request(http)
      .get(`/challenges/${id}/file`)
      .set(student)
      .expect(200);
    expect(Buffer.compare(download.body as Buffer, content)).toBe(0);
    expect(download.headers['content-type']).toContain(
      'application/octet-stream',
    );
    expect(download.headers['content-disposition']).toContain('attachment;');
    expect(download.headers['content-disposition']).toContain(
      'evil _name_.png',
    );
    expect(download.headers['x-content-type-options']).toBe('nosniff');
  });

  it('shows students the challenge without the flag, and with the file details', async () => {
    const detail = await request(http)
      .get(`/challenges/${id}`)
      .set(student)
      .expect(200);
    expect(detail.body.file).toMatchObject({ name: 'evil _name_.png' });
    expect(JSON.stringify(detail.body)).not.toMatch(
      /found_it|flagHash|flagSalt/,
    );

    const list = await request(http)
      .get('/challenges')
      .set(student)
      .expect(200);
    expect(JSON.stringify(list.body)).not.toMatch(
      /found_it|flagHash|flagSalt|fileKey/,
    );
  });

  it('awards points once for the right flag', async () => {
    const wrong = await request(http)
      .post(`/challenges/${id}/submit`)
      .set(student)
      .send({ flag: 'flag{nope}' })
      .expect(200);
    expect(wrong.body).toEqual({
      correct: false,
      alreadySolved: false,
      points: 0,
    });

    const right = await request(http)
      .post(`/challenges/${id}/submit`)
      .set(student)
      .send({ flag: ' flag{found_it} ' })
      .expect(200);
    expect(right.body).toEqual({
      correct: true,
      alreadySolved: false,
      points: 100,
    });
    expect(prisma.solves).toHaveLength(1);
  });

  it('keeps the old flag when an update leaves it out, and changes it when one is sent', async () => {
    const before = prisma.rows.get(id)!.flagHash;
    await request(http)
      .patch(`/instructor/challenges/${id}`)
      .set(instructor)
      .send({ points: 200 })
      .expect(200);
    expect(prisma.rows.get(id)!.flagHash).toBe(before);

    await request(http)
      .patch(`/instructor/challenges/${id}`)
      .set(instructor)
      .send({ flag: 'flag{new}' })
      .expect(200);
    expect(prisma.rows.get(id)!.flagHash).not.toBe(before);
    await request(http)
      .patch(`/instructor/challenges/${id}`)
      .set(instructor)
      .send({ flag: '  ' })
      .expect(400);
  });

  it('removes the file and then deletes the challenge', async () => {
    await request(http)
      .delete(`/instructor/challenges/${id}/file`)
      .set(instructor)
      .expect(200);
    await request(http).get(`/challenges/${id}/file`).set(student).expect(404);
    await request(http)
      .delete(`/instructor/challenges/${id}`)
      .set(instructor)
      .expect(200);
    await request(http)
      .get(`/instructor/challenges/${id}`)
      .set(instructor)
      .expect(404);
  });

  it("does not let one instructor touch another instructor's challenge", async () => {
    const other = hashFlag('flag{x}');
    prisma.rows.set(99, {
      id: 99,
      authorId: 5,
      published: true,
      fileKey: null,
      fileName: null,
      ...other,
    });
    await request(http)
      .get('/instructor/challenges/99')
      .set(instructor)
      .expect(404);
    await request(http)
      .patch('/instructor/challenges/99')
      .set(instructor)
      .send({ points: 5 })
      .expect(404);
    await request(http)
      .delete('/instructor/challenges/99')
      .set(instructor)
      .expect(404);
  });
});
