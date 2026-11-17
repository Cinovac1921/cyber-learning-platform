/** What the database returns, trimmed to what the progress table needs. */
export interface ProgressInput {
  courses: { id: number; title: string; lessonCount: number }[];
  quizzes: { id: number; courseId: number; title: string; passPercent: number }[];
  members: { userId: number; displayName: string; email: string; joinedAt: Date }[];
  /** One row per lesson a student completed, in this classroom's courses. */
  lessonRows: { userId: number; courseId: number; completedAt: Date }[];
  /** One row per quiz attempt, on this classroom's quizzes. */
  attemptRows: { userId: number; assessmentId: number; percent: number; passed: boolean; createdAt: Date }[];
}

function latest(dates: Date[]): Date | null {
  return dates.length === 0 ? null : new Date(Math.max(...dates.map((date) => date.getTime())));
}

/**
 * Turns raw rows into the progress table: for every student, how far through each course they are, how
 * they did on each quiz, and when they were last active. Rows about anything outside the classroom's
 * own courses and quizzes are ignored.
 */
export function buildProgress({ courses, quizzes, members, lessonRows, attemptRows }: ProgressInput) {
  const lessonsDone = new Map<string, number>();
  for (const row of lessonRows) {
    const key = `${row.userId}:${row.courseId}`;
    lessonsDone.set(key, (lessonsDone.get(key) ?? 0) + 1);
  }

  const students = members.map((member) => {
    const courseProgress = courses.map((course) => ({
      courseId: course.id,
      completedLessons: Math.min(lessonsDone.get(`${member.userId}:${course.id}`) ?? 0, course.lessonCount),
    }));

    const quizProgress = quizzes.map((quiz) => {
      const attempts = attemptRows.filter((row) => row.userId === member.userId && row.assessmentId === quiz.id);
      return {
        assessmentId: quiz.id,
        attempts: attempts.length,
        bestPercent: attempts.length === 0 ? null : Math.max(...attempts.map((attempt) => attempt.percent)),
        passed: attempts.some((attempt) => attempt.passed),
      };
    });

    const lastActiveAt = latest([
      ...lessonRows.filter((row) => row.userId === member.userId).map((row) => row.completedAt),
      ...attemptRows.filter((row) => row.userId === member.userId).map((row) => row.createdAt),
    ]);

    return { ...member, lastActiveAt, courses: courseProgress, quizzes: quizProgress };
  });

  return {
    courses: courses.map((course) => ({
      ...course,
      // Students who have completed every lesson that is currently visible.
      finishedCount:
        course.lessonCount === 0
          ? 0
          : students.filter(
              (student) =>
                student.courses.find((progress) => progress.courseId === course.id)?.completedLessons ===
                course.lessonCount,
            ).length,
    })),
    quizzes: quizzes.map((quiz) => ({
      ...quiz,
      passedCount: students.filter((student) =>
        student.quizzes.find((progress) => progress.assessmentId === quiz.id)?.passed,
      ).length,
    })),
    students,
  };
}
