import { Link } from 'react-router'
import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'
import { CourseCard } from './CourseCard'
import { useDashboard } from './useDashboard'

const WEEK_DAYS = [
  { letter: 'M', name: 'Monday' },
  { letter: 'T', name: 'Tuesday' },
  { letter: 'W', name: 'Wednesday' },
  { letter: 'T', name: 'Thursday' },
  { letter: 'F', name: 'Friday' },
  { letter: 'S', name: 'Saturday' },
  { letter: 'S', name: 'Sunday' },
]

export function DashboardPage() {
  const state = useDashboard()

  const header = (
    <PageHeader
      title="My learning"
      description="Courses you are taking."
      actions={
        <Link to="/courses" className="button button--quiet">
          + Start a new course
        </Link>
      }
    />
  )

  if (state.status === 'loading') {
    return (
      <>
        {header}
        <p className="loading" role="status">
          Loading your courses…
        </p>
      </>
    )
  }

  if (state.status === 'error') {
    return (
      <>
        {header}
        <p className="notice notice--error" role="alert">
          Couldn't load your courses. Try refreshing the page.
        </p>
      </>
    )
  }

  const { courses, weeklyGoal } = state.data

  if (courses.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="You haven't started a course yet"
          action={
            <Link to="/courses" className="button">
              Browse courses
            </Link>
          }
        >
          Pick a course and your progress will show up here.
        </EmptyState>
      </>
    )
  }

  const upNext = courses.flatMap((course) =>
    course.nextLesson ? [{ course, lesson: course.nextLesson }] : [],
  )

  return (
    <>
      {header}

      <div className="dashboard">
        <div className="course-grid">
          {courses.map((course, index) => (
            <CourseCard key={course.id} course={course} colorIndex={index} />
          ))}
        </div>

        <aside className="dashboard__side">
          <section className="panel">
            <h2>Up next</h2>
            {upNext.length === 0 ? (
              <p className="panel__empty">You're all caught up.</p>
            ) : (
              <ol className="up-next">
                {upNext.map(({ course, lesson }, index) => (
                  <li key={course.id}>
                    <span className="up-next__number" aria-hidden="true">
                      {index + 1}
                    </span>
                    <span>
                      <strong>{lesson.title}</strong>
                      <span className="up-next__course">{course.title}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel">
            <h2>This week</h2>
            <p className="panel__empty">
              {weeklyGoal.completed} of {weeklyGoal.target} lessons done
            </p>
            <ul className="week">
              {WEEK_DAYS.map((day, index) => {
                const active = weeklyGoal.activeDays[index] === true
                return (
                  <li key={day.name} className={active ? 'week__day is-active' : 'week__day'}>
                    <span className="week__bar" aria-hidden="true" />
                    <span aria-hidden="true">{day.letter}</span>
                    <span className="sr-only">
                      {day.name}: {active ? 'studied' : 'no lessons'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        </aside>
      </div>
    </>
  )
}