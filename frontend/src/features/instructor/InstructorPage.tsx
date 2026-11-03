import { Link } from 'react-router'
import { listMyCourses } from '../../api/instructor'
import { useResource } from '../../app/useResource'
import { EmptyState } from '../../components/EmptyState'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import { levelLabel } from '../courses/levels'

export function InstructorPage() {
  const courses = useResource('instructor-courses', (signal) => listMyCourses(signal))

  return (
    <>
      <PageHeader
        title="Instructor"
        description="Create and manage your courses and lessons."
        actions={
          <Link to="/instructor/courses/new" className="button">
            + New course
          </Link>
        }
      />

      {courses.status === 'loading' && (
        <p className="loading" role="status">
          Loading your courses…
        </p>
      )}

      {courses.status === 'error' && <ErrorNotice error={courses.error} />}

      {courses.status === 'ready' && courses.data.length === 0 && (
        <EmptyState
          title="You haven't created a course yet"
          action={
            <Link to="/instructor/courses/new" className="button">
              Create your first course
            </Link>
          }
        >
          New courses start as drafts. Students only see a course after you publish it.
        </EmptyState>
      )}

      {courses.status === 'ready' && courses.data.length > 0 && (
        <div className="course-grid">
          {courses.data.map((course) => (
            <article key={course.id} className="course-card">
              <div className="toolbar">
                <span className={course.published ? 'chip chip--live' : 'chip'}>
                  {course.published ? 'Published' : 'Draft'}
                </span>
                <span className="chip">{levelLabel(course.level)}</span>
              </div>
              <h3>{course.title}</h3>
              <p className="course-card__summary">{course.summary}</p>
              <p className="course-card__meta">
                {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
              </p>
              <Link to={`/instructor/courses/${course.id}`} className="button button--block">
                Edit course
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  )
}