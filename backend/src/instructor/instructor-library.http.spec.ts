// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InstructorLibraryController } from './instructor-library.controller';
import { InstructorLibraryService } from './instructor-library.service';
import { InstructorGuard } from './instructor.guard';

describe('Library over HTTP', () => {
  let app: INestApplication;
  let server: Server;
  const library = {
    list: jest.fn().mockResolvedValue({ templates: [], publicCourses: [] }),
    detail: jest.fn().mockResolvedValue({}),
    copyLesson: jest.fn().mockResolvedValue({ id: 1, position: 1 }),
    copyAssessment: jest.fn().mockResolvedValue({ id: 2 }),
    copyCourse: jest.fn().mockResolvedValue({ id: 3 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [InstructorLibraryController],
      providers: [{ provide: InstructorLibraryService, useValue: library }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: { switchToHttp: () => { getRequest: () => { user?: unknown } } }) => {
          context.switchToHttp().getRequest().user = { sub: 7, role: 'INSTRUCTOR' };
          return true;
        },
      })
      .overrideGuard(InstructorGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterEach(() => app.close());

  it('copies for the signed-in instructor, whatever the request says about who is asking', async () => {
    await request(server).post('/instructor/courses/4/copy-lesson').send({ lessonId: 21 }).expect(201);
    expect(library.copyLesson).toHaveBeenCalledWith(4, 7, 21);

    await request(server).post('/instructor/courses/4/copy-assessment').send({ assessmentId: 80 }).expect(201);
    expect(library.copyAssessment).toHaveBeenCalledWith(4, 7, 80);

    await request(server).post('/instructor/classrooms/3/copy-course').send({ courseId: 9 }).expect(201);
    expect(library.copyCourse).toHaveBeenCalledWith(3, 7, 9);
  });

  it('rejects ids that are missing, not whole numbers, or smaller than 1', async () => {
    await request(server).post('/instructor/courses/4/copy-lesson').send({}).expect(400);
    await request(server).post('/instructor/courses/4/copy-lesson').send({ lessonId: 'abc' }).expect(400);
    await request(server).post('/instructor/courses/4/copy-lesson').send({ lessonId: 0 }).expect(400);
    await request(server).post('/instructor/courses/4/copy-assessment').send({ assessmentId: 1.5 }).expect(400);
    await request(server).post('/instructor/classrooms/3/copy-course').send({ courseId: -2 }).expect(400);
    expect(library.copyLesson).not.toHaveBeenCalled();
    expect(library.copyAssessment).not.toHaveBeenCalled();
    expect(library.copyCourse).not.toHaveBeenCalled();
  });

  it('refuses extra fields, so a request cannot smuggle in an author or a scope', async () => {
    await request(server)
      .post('/instructor/classrooms/3/copy-course')
      .send({ courseId: 9, authorId: 1, scope: 'PUBLIC' })
      .expect(400);
    expect(library.copyCourse).not.toHaveBeenCalled();
  });

  it('serves the library and a single library course', async () => {
    await request(server).get('/instructor/library').expect(200);
    await request(server).get('/instructor/library/9').expect(200);
    expect(library.detail).toHaveBeenCalledWith(9);
    await request(server).get('/instructor/library/abc').expect(400);
  });
});
