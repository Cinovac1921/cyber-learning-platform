// The real PrismaService loads the generated database client, which these tests do not need.
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { VISIBLE_LESSON } from '../courses/visibility';
import type { PrismaService } from '../prisma/prisma.service';
import { InstructorLibraryService } from './instructor-library.service';
import { LIBRARY_COURSE, LIVE_PUBLIC_COURSE, TEMPLATE_COURSE } from './library';

const quiz = {
  title: 'Phishing check',
  description: 'Spot the fake email.',
  passPercent: 80,
  questions: [
    {
      position: 1,
      prompt: 'Which sender is suspicious?',
      explanation: 'Look at the domain.',
      options: [
        { position: 1, text: 'support@bank.example', isCorrect: false },
        { position: 2, text: 'support@bank-secure.example', isCorrect: true },
      ],
    },
  ],
};

interface Options {
  target?: { scope?: string; reviewStatus?: string } | null;
  lesson?: unknown;
  assessment?: unknown;
  source?: unknown;
  classroom?: boolean;
  lastPosition?: number | null;
  takenSlugs?: string[];
}

function makeService(opts: Options = {}) {
  const taken = new Set(opts.takenSlugs ?? []);
  const prisma = {
    course: {
      findFirst: jest.fn((args: { where: { authorId?: number } }) => {
        // The copy target is looked up by author; a library course is looked up without one.
        if (args.where.authorId !== undefined) {
          return Promise.resolve(
            opts.target === null ? null : { id: 4, scope: 'CLASSROOM', reviewStatus: 'NONE', ...opts.target },
          );
        }
        return Promise.resolve('source' in opts ? opts.source : null);
      }),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(({ where }: { where: { slug: string } }) =>
        Promise.resolve(taken.has(where.slug) ? { id: 1 } : null),
      ),
      create: jest.fn().mockResolvedValue({ id: 50 }),
    },
    lesson: {
      findFirst: jest.fn((args: { orderBy?: unknown }) =>
        args.orderBy
          ? Promise.resolve(opts.lastPosition === null ? null : { position: opts.lastPosition ?? 3 })
          : Promise.resolve('lesson' in opts ? opts.lesson : null),
      ),
      create: jest.fn().mockResolvedValue({ id: 70, position: 4 }),
    },
    assessment: {
      findFirst: jest.fn().mockResolvedValue('assessment' in opts ? opts.assessment : null),
      create: jest.fn().mockResolvedValue({ id: 80 }),
    },
    classroom: { findFirst: jest.fn().mockResolvedValue(opts.classroom === false ? null : { id: 3 }) },
  };
  return { service: new InstructorLibraryService(prisma as unknown as PrismaService), prisma };
}

describe('InstructorLibraryService.list', () => {
  it('lists ready templates and live public courses, and counts only what can really be copied', async () => {
    const { service, prisma } = makeService();
    prisma.course.findMany.mockResolvedValue([
      {
        id: 9,
        title: 'Phishing starter',
        summary: 's',
        level: 'BEGINNER',
        scope: 'TEMPLATE',
        author: { displayName: 'Admin' },
        _count: { lessons: 3, assessments: 1 },
      },
    ]);

    const result = await service.list();

    const [templateCall, publicCall] = prisma.course.findMany.mock.calls.map((call) => call[0]);
    expect(templateCall.where).toEqual(TEMPLATE_COURSE);
    expect(publicCall.where).toEqual(LIVE_PUBLIC_COURSE);
    expect(templateCall.select._count.select.lessons).toEqual({ where: VISIBLE_LESSON });
    // Quizzes are only ever counted from published quizzes of template courses.
    expect(templateCall.select._count.select.assessments.where).toEqual({
      published: true,
      course: { scope: 'TEMPLATE' },
    });
    expect(result.templates[0]).toMatchObject({ id: 9, lessonCount: 3, quizCount: 1 });
    expect(result.templates[0]).not.toHaveProperty('_count');
  });
});

describe('InstructorLibraryService.detail', () => {
  it('says "not in the library" for anything else, such as a classroom course or somebody\'s draft', async () => {
    const { service, prisma } = makeService({ source: null });
    await expect(service.detail(12)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.course.findFirst.mock.calls[0][0].where).toEqual({ id: 12, ...LIBRARY_COURSE });
  });

  it('shows only visible lessons, and only quizzes that come from templates', async () => {
    const { service, prisma } = makeService({
      source: {
        id: 9,
        title: 'Phishing starter',
        scope: 'TEMPLATE',
        lessons: [],
        assessments: [{ id: 80, title: 'Quiz', description: '', passPercent: 70, _count: { questions: 5 } }],
      },
    });
    const detail = await service.detail(9);

    const select = prisma.course.findFirst.mock.calls[0][0].select;
    expect(select.lessons.where).toEqual(VISIBLE_LESSON);
    expect(select.assessments.where).toEqual({ published: true, course: { scope: 'TEMPLATE' } });
    expect(detail.assessments).toEqual([{ id: 80, title: 'Quiz', description: '', passPercent: 70, questionCount: 5 }]);
  });
});

describe('InstructorLibraryService.copyLesson', () => {
  const lesson = { title: 'Spot the signs', content: 'Look at the sender.' };

  it('copies a library lesson to the end of the instructor\'s course, hidden', async () => {
    const { service, prisma } = makeService({ lesson, lastPosition: 3 });
    await service.copyLesson(4, 7, 21);

    expect(prisma.lesson.create.mock.calls[0][0].data).toEqual({
      courseId: 4,
      position: 4,
      title: 'Spot the signs',
      content: 'Look at the sender.',
      visible: false,
    });
  });

  it('starts at position 1 in an empty course', async () => {
    const { service, prisma } = makeService({ lesson, lastPosition: null });
    await service.copyLesson(4, 7, 21);
    expect(prisma.lesson.create.mock.calls[0][0].data.position).toBe(1);
  });

  it('only copies a visible lesson of a library course', async () => {
    const { service, prisma } = makeService({ lesson: null });
    await expect(service.copyLesson(4, 7, 21)).rejects.toBeInstanceOf(NotFoundException);
    const where = prisma.lesson.findFirst.mock.calls.find((call) => !call[0].orderBy)![0].where;
    expect(where).toEqual({ id: 21, ...VISIBLE_LESSON, course: LIBRARY_COURSE });
    expect(prisma.lesson.create).not.toHaveBeenCalled();
  });

  it("only copies into the instructor's own course", async () => {
    const { service, prisma } = makeService({ target: null, lesson });
    await expect(service.copyLesson(4, 99, 21)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.course.findFirst.mock.calls[0][0].where).toEqual({ id: 4, authorId: 99 });
    expect(prisma.lesson.create).not.toHaveBeenCalled();
  });

  it.each(['PENDING', 'APPROVED'])('will not change a public course that is %s', async (reviewStatus) => {
    const { service, prisma } = makeService({ target: { scope: 'PUBLIC', reviewStatus }, lesson });
    await expect(service.copyLesson(4, 7, 21)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.lesson.create).not.toHaveBeenCalled();
  });

  it('can add to a public-library draft, which still goes through review', async () => {
    const { service, prisma } = makeService({ target: { scope: 'PUBLIC', reviewStatus: 'NONE' }, lesson });
    await service.copyLesson(4, 7, 21);
    expect(prisma.lesson.create).toHaveBeenCalled();
  });
});

describe('InstructorLibraryService.copyAssessment', () => {
  it('copies a template quiz with its questions and answers into a classroom course, unpublished', async () => {
    const { service, prisma } = makeService({ assessment: quiz });
    await service.copyAssessment(4, 7, 80);

    const data = prisma.assessment.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ courseId: 4, title: 'Phishing check', passPercent: 80, published: false });
    expect(data.questions.create).toEqual([
      {
        position: 1,
        prompt: 'Which sender is suspicious?',
        explanation: 'Look at the domain.',
        options: {
          create: [
            { position: 1, text: 'support@bank.example', isCorrect: false },
            { position: 2, text: 'support@bank-secure.example', isCorrect: true },
          ],
        },
      },
    ]);
  });

  it('only takes quizzes from published template courses, never from the public library', async () => {
    const { service, prisma } = makeService({ assessment: null });
    await expect(service.copyAssessment(4, 7, 80)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.assessment.findFirst.mock.calls[0][0].where).toEqual({
      id: 80,
      published: true,
      course: { scope: 'TEMPLATE' },
    });
    expect(prisma.assessment.create).not.toHaveBeenCalled();
  });

  it.each(['PUBLIC', 'TEMPLATE'])(
    'refuses to copy a quiz into a %s course, so a graded quiz can never become public',
    async (scope) => {
      const { service, prisma } = makeService({ target: { scope }, assessment: quiz });
      await expect(service.copyAssessment(4, 7, 80)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.assessment.findFirst).not.toHaveBeenCalled();
      expect(prisma.assessment.create).not.toHaveBeenCalled();
    },
  );

  it("only copies into the instructor's own course", async () => {
    const { service, prisma } = makeService({ target: null, assessment: quiz });
    await expect(service.copyAssessment(4, 99, 80)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.assessment.create).not.toHaveBeenCalled();
  });
});

describe('InstructorLibraryService.copyCourse', () => {
  const source = {
    id: 9,
    title: 'Phishing starter',
    summary: 'Spot phishing emails.',
    level: 'BEGINNER',
    lessons: [
      { title: 'Signs', content: 'Look at the sender.' },
      { title: 'Reporting', content: 'Tell the SOC.' },
    ],
    assessments: [quiz],
  };

  it('makes a new classroom course with hidden lessons, unpublished quizzes, and a note of where it came from', async () => {
    const { service, prisma } = makeService({ source });
    await expect(service.copyCourse(3, 7, 9)).resolves.toEqual({ id: 50 });

    const data = prisma.course.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      title: 'Phishing starter',
      slug: 'phishing-starter',
      authorId: 7,
      scope: 'CLASSROOM',
      classroomId: 3,
      copiedFromId: 9,
    });
    expect(data.published).toBeUndefined(); // a copy is never published automatically
    expect(data.lessons.create).toEqual([
      { position: 1, title: 'Signs', content: 'Look at the sender.', visible: false },
      { position: 2, title: 'Reporting', content: 'Tell the SOC.', visible: false },
    ]);
    expect(data.assessments.create).toHaveLength(1);
    expect(data.assessments.create[0].published).toBe(false);
  });

  it('asks only for quizzes that come from templates, so a public course brings its lessons alone', async () => {
    const { service, prisma } = makeService({ source: { ...source, assessments: [] } });
    await service.copyCourse(3, 7, 9);

    const select = prisma.course.findFirst.mock.calls[0][0].select;
    expect(select.assessments.where).toEqual({ published: true, course: { scope: 'TEMPLATE' } });
    expect(select.lessons.where).toEqual(VISIBLE_LESSON);
    expect(prisma.course.create.mock.calls[0][0].data.assessments.create).toEqual([]);
  });

  it('gives the copy its own unused address', async () => {
    const { service, prisma } = makeService({ source, takenSlugs: ['phishing-starter', 'phishing-starter-2'] });
    await service.copyCourse(3, 7, 9);
    expect(prisma.course.create.mock.calls[0][0].data.slug).toBe('phishing-starter-3');
  });

  it("only works for a classroom the instructor runs", async () => {
    const { service, prisma } = makeService({ source, classroom: false });
    await expect(service.copyCourse(3, 99, 9)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.classroom.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 3, ownerId: 99 } }));
    expect(prisma.course.create).not.toHaveBeenCalled();
  });

  it('only copies courses that are in the library', async () => {
    const { service, prisma } = makeService({ source: null });
    await expect(service.copyCourse(3, 7, 12)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.course.findFirst.mock.calls.at(-1)![0].where).toEqual({ id: 12, ...LIBRARY_COURSE });
    expect(prisma.course.create).not.toHaveBeenCalled();
  });
});
