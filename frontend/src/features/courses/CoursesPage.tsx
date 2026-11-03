import { Link } from 'react-router'
import { listCourses } from '../../api/courses'
import { useResource } from '../../app/useResource'
import { EmptyState } from '../../components/EmptyState'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import { ProgressBar } from '../../components/ProgressBar'
import { levelLabel } from './levels'

export function CoursesPage() {
  const courses = useResource('courses', (signal) => listCourses(signal))

  return (
    <>
      <PageHeader title="Courses" description="Structured lessons, from fundamentals to advanced topics." />

      {courses.status === 'loading' && (
        <p className="loading" role="status">
          Loading courses…
        </p>
      )}

      {courses.status === 'error' && <ErrorNotice error={courses.error} />}

      {courses.status === 'ready' && courses.data.length === 0 && (
        <EmptyState title="No courses yet">
          Courses show up here once an instructor publishes them.
        </EmptyState>
      )}

      {courses.status === 'ready' && courses.data.length > 0 && (
        <div className="course-grid">
          {courses.data.map((course) => (
            <article key={course.id} className="course-card">
              <span className="chip">{levelLabel(course.level)}</span>
              <h3>{course.title}</h3>
              <p className="course-card__summary">{course.summary}</p>
              <div className="course-card__progress">
                <ProgressBar done={course.completedLessons} total={course.lessonCount} />
                <p className="course-card__meta">
                  {course.completedLessons} of {course.lessonCount}{' '}
                  {course.lessonCount === 1 ? 'lesson' : 'lessons'} done
                </p>
              </div>
              <Link to={`/courses/${course.slug}`} className="button button--block">
                {course.completedLessons === 0
                  ? 'View course'
                  : course.completedLessons >= course.lessonCount
                    ? 'Review course'
                    : 'Continue course'}
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  )
}