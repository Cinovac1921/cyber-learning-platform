import { Link } from 'react-router'
import { HeroArt, PromoArt, ShieldDrawing } from '../../components/Brand'
import { EmptyState } from '../../components/EmptyState'
import {
  ArrowRightIcon,
  BookIcon,
  ChartIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  TrophyIcon,
} from '../../components/Icons'
import { ProgressBar } from '../../components/ProgressBar'
import { useAuth } from '../auth/useAuth'
import { MyClassrooms } from '../classrooms/MyClassrooms'
import { CourseCard } from './CourseCard'
import { LibrarySection } from './LibrarySection'
import { ProgressRing } from './ProgressRing'
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

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function DashboardHero() {
  const { user } = useAuth()
  const name = user?.displayName.trim() || 'there'

  return (
    <section className="hero" aria-labelledby="dash-title">
      <HeroArt className="hero__art" />
      <div className="hero__text">
        <h1 id="dash-title">
          <span className="hero__greeting">{greeting()},</span>
          <span className="hero__name">{name}!</span>
        </h1>
        <p>Continue your learning journey and strengthen your cybersecurity skills.</p>
        <div className="hero__actions">
          <Link to="/courses" className="button">
            Browse courses <ArrowRightIcon size={18} />
          </Link>
        </div>
      </div>
      <p className="hero__tag" aria-hidden="true">
        <span>Learn.</span>
        <span>Practice.</span>
        <span>Defend.</span>
      </p>
    </section>
  )
}

function percentOf(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

export function DashboardPage() {
  const state = useDashboard()

  if (state.status === 'loading') {
    return (
      <>
        <DashboardHero />
        <p className="loading" role="status">
          Loading your courses…
        </p>
      </>
    )
  }

  if (state.status === 'error') {
    return (
      <>
        <DashboardHero />
        <p className="notice notice--error" role="alert">
          Couldn't load your courses. Try refreshing the page.
        </p>
      </>
    )
  }

  const { courses, library, weeklyGoal } = state.data

  if (courses.length === 0) {
    return (
      <>
        <DashboardHero />
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
        <MyClassrooms />
        <LibrarySection courses={library} />
      </>
    )
  }

  const upNext = courses.flatMap((course) =>
    course.nextLesson ? [{ course, lesson: course.nextLesson }] : [],
  )
  const current = upNext[0]

  const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0)
  const doneLessons = courses.reduce((sum, course) => sum + course.completedLessons, 0)
  const overall = percentOf(doneLessons, totalLessons)

  return (
    <>
      <DashboardHero />

      <section className="nx-stats" aria-label="Learning statistics">
        <div className="nx-stat">
          <BookIcon size={32} className="nx-stat__icon" />
          <div>
            <span className="nx-stat__label">Enrolled courses</span>
            <span className="nx-stat__value">{courses.length}</span>
          </div>
        </div>
        <div className="nx-stat">
          <CheckCircleIcon size={32} className="nx-stat__icon" />
          <div>
            <span className="nx-stat__label">Lessons completed</span>
            <span className="nx-stat__value">{doneLessons}</span>
          </div>
        </div>
        <div className="nx-stat">
          <TrophyIcon size={32} className="nx-stat__icon" />
          <div>
            <span className="nx-stat__label">Weekly goal</span>
            <span className="nx-stat__value">
              {weeklyGoal.completed}
              <span className="nx-stat__unit">/ {weeklyGoal.target}</span>
            </span>
          </div>
        </div>
        <div className="nx-stat">
          <ChartIcon size={32} className="nx-stat__icon" />
          <div>
            <span className="nx-stat__label">Overall progress</span>
            <span className="nx-stat__value">{overall}%</span>
          </div>
        </div>
      </section>

      <div className="nx-grid">
        {current ? (
          <section className="continue nx-span-6" aria-label="Continue learning">
            <span className="continue__label">Continue learning</span>
            <h2>{current.course.title}</h2>
            <p className="continue__meta">
              Course / {String(courses.indexOf(current.course) + 1).padStart(3, '0')} · Lesson{' '}
              {current.lesson.number}: {current.lesson.title}
            </p>
            <div className="continue__bar">
              <ProgressBar done={current.course.completedLessons} total={current.course.totalLessons} />
              <span>{percentOf(current.course.completedLessons, current.course.totalLessons)}%</span>
            </div>
            <Link
              to={`/courses/${current.course.slug}/lessons/${current.lesson.position}`}
              className="button"
            >
              Continue course <ArrowRightIcon size={18} />
            </Link>
            <ShieldDrawing className="continue__art" />
          </section>
        ) : (
          <section className="continue nx-span-6" aria-label="All caught up">
            <span className="continue__label">All caught up</span>
            <h2>You finished every lesson in your courses.</h2>
            <p className="continue__meta">Start another course to keep going.</p>
            <Link to="/courses" className="button">
              Browse courses <ArrowRightIcon size={18} />
            </Link>
            <ShieldDrawing className="continue__art" />
          </section>
        )}

        <section className="panel panel--flush nx-span-3" aria-label="Up next">
          <div className="panel__head">
            <h2>Up next</h2>
            <Link to="/courses" className="panel__link">
              View all <ArrowRightIcon size={14} />
            </Link>
          </div>
          {upNext.length === 0 ? (
            <p className="panel__body panel__empty">You're all caught up.</p>
          ) : (
            <ul className="activity-list">
              {upNext.slice(0, 4).map(({ course, lesson }) => (
                <li key={course.id}>
                  <Link to={`/courses/${course.slug}/lessons/${lesson.position}`} className="activity">
                    <span className="activity__icon" aria-hidden="true">
                      <PlayCircleIcon size={20} />
                    </span>
                    <span>
                      <strong>{lesson.title}</strong>
                      <span className="activity__sub">{course.title}</span>
                    </span>
                    <ArrowRightIcon size={16} className="activity__go" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="promo nx-span-3" aria-label="Challenges">
          <PromoArt className="promo__art" />
          <h2>Sharpen your skills with hands-on challenges.</h2>
          <p>Solve real-world security problems and earn points.</p>
          <Link to="/challenges" className="button button--outline">
            Explore challenges <ArrowRightIcon size={18} />
          </Link>
        </section>

        <section className="panel panel--flush nx-span-6" aria-label="Your learning progress">
          <div className="panel__head">
            <h2>Your learning progress</h2>
          </div>
          <div className="progress-panel">
            <div className="progress-panel__ring">
              <ProgressRing percent={overall} color="var(--accent)" size={140} thickness={8} />
              <span>Overall progress</span>
            </div>
            <ul className="legend">
              {courses.slice(0, 5).map((course) => (
                <li key={course.id}>
                  <span className="legend__dot" aria-hidden="true" />
                  <span className="legend__name">{course.title}</span>
                  <span className="legend__pct">{percentOf(course.completedLessons, course.totalLessons)}%</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel panel--flush nx-span-3" aria-label="This week">
          <div className="panel__head">
            <h2>This week</h2>
          </div>
          <div className="panel__body">
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
          </div>
        </section>

        <section className="promo nx-span-3" aria-label="Courses">
          <PromoArt className="promo__art" />
          <span className="promo__glyph" aria-hidden="true">
            &gt;_
          </span>
          <h2>Find your next course.</h2>
          <p>Browse the catalog and keep building your skills.</p>
          <Link to="/courses" className="button button--outline">
            Browse courses <ArrowRightIcon size={18} />
          </Link>
        </section>
      </div>

      <h2 className="dash__section-title">
        <span>Your courses</span>
      </h2>
      <div className="course-grid">
        {courses.map((course, index) => (
          <CourseCard key={course.id} course={course} index={index} />
        ))}
      </div>

      <MyClassrooms />
      <LibrarySection courses={library} />
    </>
  )
}
