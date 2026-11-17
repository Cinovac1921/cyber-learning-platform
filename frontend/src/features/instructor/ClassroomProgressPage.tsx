import { Link, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { getClassroomProgress } from '../../api/instructor-classrooms'
import { useResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'

function formatDate(value: string | null): string {
  return value
    ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Not yet'
}

export function ClassroomProgressPage() {
  const { id = '' } = useParams()
  const classroomId = Number(id)

  const progress = useResource(`classroom-progress:${id}`, (signal) =>
    Number.isInteger(classroomId) && classroomId > 0
      ? getClassroomProgress(classroomId, signal)
      : Promise.reject(new ApiError(404, 'Classroom not found.', null)),
  )

  if (progress.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading progress…
      </p>
    )
  }
  if (progress.status === 'error') {
    return <ErrorNotice error={progress.error} />
  }

  const { classroom, courses, quizzes, students } = progress.data

  return (
    <div className="editor">
      <div>
        <p className="breadcrumb">
          <Link to={`/instructor/classrooms/${classroom.id}`}>{classroom.name}</Link>
        </p>
        <PageHeader
          title="Progress"
          description={`${students.length} ${students.length === 1 ? 'student' : 'students'} · ${courses.length} published ${courses.length === 1 ? 'course' : 'courses'}`}
        />
        <p className="course-card__meta">
          This shows only what students do in this classroom's courses and quizzes. Lessons you have hidden are not
          counted.
        </p>
      </div>

      {students.length === 0 ? (
        <p className="loading">Nobody has joined yet. Share the join code from the classroom page.</p>
      ) : courses.length === 0 ? (
        <p className="loading">
          No published courses yet, so there is nothing to track. Publish a course in this classroom first.
        </p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table progress-table">
            <caption className="sr-only">Student progress in {classroom.name}</caption>
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Last active</th>
                {courses.map((course) => (
                  <th key={`course-${course.id}`} scope="col">
                    {course.title}
                    <span className="course-card__meta">
                      {course.finishedCount} of {students.length} finished
                    </span>
                  </th>
                ))}
                {quizzes.map((quiz) => (
                  <th key={`quiz-${quiz.id}`} scope="col">
                    {quiz.title}
                    <span className="course-card__meta">
                      {quiz.passedCount} of {students.length} passed (pass mark {quiz.passPercent}%)
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.userId}>
                  <th scope="row">
                    {student.displayName}
                    <span className="course-card__meta">{student.email}</span>
                  </th>
                  <td>{formatDate(student.lastActiveAt)}</td>
                  {courses.map((course) => {
                    const done = student.courses.find((item) => item.courseId === course.id)?.completedLessons ?? 0
                    return (
                      <td key={`course-${course.id}`}>
                        <progress
                          max={Math.max(course.lessonCount, 1)}
                          value={done}
                          aria-label={`${student.displayName}: ${done} of ${course.lessonCount} lessons in ${course.title}`}
                        />
                        <span className="course-card__meta">
                          {done} / {course.lessonCount} lessons
                        </span>
                      </td>
                    )
                  })}
                  {quizzes.map((quiz) => {
                    const result = student.quizzes.find((item) => item.assessmentId === quiz.id)
                    return (
                      <td key={`quiz-${quiz.id}`}>
                        {!result || result.attempts === 0 ? (
                          <span className="course-card__meta">Not attempted</span>
                        ) : (
                          <>
                            <span className={result.passed ? 'chip chip--live' : 'chip'}>
                              {result.passed ? 'Passed' : 'Not passed'} · best {result.bestPercent}%
                            </span>
                            <span className="course-card__meta">
                              {result.attempts} {result.attempts === 1 ? 'attempt' : 'attempts'}
                            </span>
                          </>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
