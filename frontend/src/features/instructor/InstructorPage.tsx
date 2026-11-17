import { Link } from 'react-router'
import { listMyCourses } from '../../api/instructor'
import { listMyClassrooms } from '../../api/instructor-classrooms'
import { CourseStatusChip } from './CourseStatusChip'
import { useResource } from '../../app/useResource'
import { EmptyState } from '../../components/EmptyState'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import { levelLabel } from '../courses/levels'

export function InstructorPage() {
  const courses = useResource('instructor-courses', (signal) => listMyCourses(signal))
  const classrooms = useResource('instructor-classrooms', (signal) => listMyClassrooms(signal))

  return (
    <>
      <PageHeader
        title="Instructor"
        description="Create and manage your courses and lessons."
        actions={
          <>
            <Link to="/instructor/library" className="button button--quiet">
              Library
            </Link>
            <Link to="/instructor/challenges" className="button button--quiet">
              Challenges
            </Link>
            <Link to="/instructor/courses/new" className="button">
              + New course
            </Link>
          </>
        }
      />

      <section className="classrooms" aria-labelledby="my-classrooms-title">
        <div className="editor__heading">
          <h2 id="my-classrooms-title">Classrooms</h2>
          <Link to="/instructor/classrooms/new" className="button button--small">
            + New classroom
          </Link>
        </div>
        {classrooms.status === 'error' && <ErrorNotice error={classrooms.error} />}
        {classrooms.status === 'ready' && classrooms.data.length === 0 && (
          <p className="loading">
            No classrooms yet. A classroom gets a join code, and its courses stay private to its students.
          </p>
        )}
        {classrooms.status === 'ready' && classrooms.data.length > 0 && (
          <div className="course-grid">
            {classrooms.data.map((classroom) => (
              <article key={classroom.id} className="course-card">
                <div className="toolbar">
                  <span className={classroom.joinOpen ? 'chip chip--live' : 'chip'}>
                    {classroom.joinOpen ? 'Joining open' : 'Joining closed'}
                  </span>
                </div>
                <h3>{classroom.name}</h3>
                <p className="course-card__meta">
                  {classroom.memberCount} {classroom.memberCount === 1 ? 'student' : 'students'} ·{' '}
                  {classroom.courseCount} {classroom.courseCount === 1 ? 'course' : 'courses'}
                </p>
                <Link to={`/instructor/classrooms/${classroom.id}`} className="button button--block">
                  Manage classroom
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="editor__heading classrooms">
        <h2>Courses</h2>
      </div>

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
                <CourseStatusChip
                  scope={course.scope}
                  published={course.published}
                  reviewStatus={course.reviewStatus}
                />
                <span className="chip">{levelLabel(course.level)}</span>
                {course.scope === 'TEMPLATE' && <span className="chip">Template</span>}
                {course.scope === 'CLASSROOM' && course.classroom && (
                  <span className="chip">{course.classroom.name}</span>
                )}
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