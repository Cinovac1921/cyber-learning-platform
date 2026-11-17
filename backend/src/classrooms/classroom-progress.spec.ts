import { buildProgress, type ProgressInput } from './classroom-progress';

const day = (n: number) => new Date(`2026-11-${String(n).padStart(2, '0')}T08:00:00Z`);

const base: ProgressInput = {
  courses: [
    { id: 10, title: 'Packets', lessonCount: 3 },
    { id: 11, title: 'Logs', lessonCount: 2 },
  ],
  quizzes: [{ id: 80, courseId: 10, title: 'Packets quiz', passPercent: 70 }],
  members: [
    { userId: 1, displayName: 'Sam', email: 'sam@example.com', joinedAt: day(1) },
    { userId: 2, displayName: 'Ana', email: 'ana@example.com', joinedAt: day(2) },
    { userId: 3, displayName: 'Lee', email: 'lee@example.com', joinedAt: day(3) },
  ],
  lessonRows: [
    { userId: 1, courseId: 10, completedAt: day(4) },
    { userId: 1, courseId: 10, completedAt: day(5) },
    { userId: 1, courseId: 10, completedAt: day(6) },
    { userId: 1, courseId: 11, completedAt: day(7) },
    { userId: 2, courseId: 10, completedAt: day(8) },
  ],
  attemptRows: [
    { userId: 1, assessmentId: 80, percent: 40, passed: false, createdAt: day(9) },
    { userId: 1, assessmentId: 80, percent: 90, passed: true, createdAt: day(10) },
    { userId: 2, assessmentId: 80, percent: 50, passed: false, createdAt: day(11) },
  ],
};

describe('buildProgress', () => {
  it('counts completed lessons for each student and course', () => {
    const { students } = buildProgress(base);
    expect(students[0].courses).toEqual([
      { courseId: 10, completedLessons: 3 },
      { courseId: 11, completedLessons: 1 },
    ]);
    expect(students[1].courses).toEqual([
      { courseId: 10, completedLessons: 1 },
      { courseId: 11, completedLessons: 0 },
    ]);
  });

  it('shows the best quiz score, the number of attempts, and whether the student ever passed', () => {
    const { students } = buildProgress(base);
    expect(students[0].quizzes).toEqual([{ assessmentId: 80, attempts: 2, bestPercent: 90, passed: true }]);
    expect(students[1].quizzes).toEqual([{ assessmentId: 80, attempts: 1, bestPercent: 50, passed: false }]);
  });

  it('tells "never tried" apart from "tried and scored low"', () => {
    const { students } = buildProgress(base);
    expect(students[2].quizzes).toEqual([{ assessmentId: 80, attempts: 0, bestPercent: null, passed: false }]);
  });

  it('reports when each student was last active, across lessons and quizzes', () => {
    const { students } = buildProgress(base);
    expect(students[0].lastActiveAt).toEqual(day(10));
    expect(students[1].lastActiveAt).toEqual(day(11));
    expect(students[2].lastActiveAt).toBeNull();
  });

  it('counts how many students finished each course and passed each quiz', () => {
    const { courses, quizzes } = buildProgress(base);
    expect(courses.find((course) => course.id === 10)?.finishedCount).toBe(1);
    expect(courses.find((course) => course.id === 11)?.finishedCount).toBe(0);
    expect(quizzes[0].passedCount).toBe(1);
  });

  it('never shows more completed lessons than the course has, even if a lesson was hidden afterwards', () => {
    const { students } = buildProgress({
      ...base,
      courses: [{ id: 10, title: 'Packets', lessonCount: 2 }],
      quizzes: [],
      attemptRows: [],
    });
    expect(students[0].courses).toEqual([{ courseId: 10, completedLessons: 2 }]);
  });

  it('ignores progress on courses and quizzes that are not part of the classroom', () => {
    const { students } = buildProgress({
      ...base,
      lessonRows: [...base.lessonRows, { userId: 3, courseId: 999, completedAt: day(20) }],
      attemptRows: [...base.attemptRows, { userId: 3, assessmentId: 999, percent: 100, passed: true, createdAt: day(21) }],
    });
    expect(students[2].courses.every((course) => course.completedLessons === 0)).toBe(true);
    expect(students[2].quizzes[0].attempts).toBe(0);
  });

  it('gives an empty table for a classroom with no courses, and keeps every student in it', () => {
    const result = buildProgress({ ...base, courses: [], quizzes: [], lessonRows: [], attemptRows: [] });
    expect(result.courses).toEqual([]);
    expect(result.students).toHaveLength(3);
    expect(result.students[0]).toMatchObject({ displayName: 'Sam', courses: [], quizzes: [], lastActiveAt: null });
  });

  it('keeps the students in the order given, which is the order they joined', () => {
    expect(buildProgress(base).students.map((student) => student.displayName)).toEqual(['Sam', 'Ana', 'Lee']);
  });
});
