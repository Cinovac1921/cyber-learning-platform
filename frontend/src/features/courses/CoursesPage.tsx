import { useState } from 'react'
import { Link } from 'react-router'
import { listCourses } from '../../api/courses'
import { useResource } from '../../app/useResource'
import { EmptyState } from '../../components/EmptyState'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import { ArrowRightIcon } from '../../components/Icons'
import { ProgressBar } from '../../components/ProgressBar'
import type { CourseLevel } from '../../types/learning'
import { levelLabel } from './levels'

const LEVEL_FILTERS: { value: 'ALL' | CourseLevel; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
]

export function CoursesPage() {
  const courses = useResource('courses', (signal) => listCourses(signal))
  const [level, setLevel] = useState<'ALL' | CourseLevel>('ALL')

  return (
    <>
      <PageHeader eyebrow="Catalog" title="Courses" description="Structured lessons, from fundamentals to advanced topics." />

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
        <div className="filter-bar" role="group" aria-label="Filter by level">
          {LEVEL_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className="filter-chip"
              aria-pressed={level === filter.value}
              onClick={() => setLevel(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {courses.status === 'ready' && courses.data.length > 0 && (
        <div className="course-grid">
          {courses.data
            .filter((course) => level === 'ALL' || course.level === level)
            .map((course) => (
            <article key={course.id} className="course-card">
              <div className="course-card__head">
                <span className={`chip chip--${course.level.toLowerCase()}`}>{levelLabel(course.level)}</span>
                <span className="label">
                  Course / {String(courses.data.indexOf(course) + 1).padStart(3, '0')}
                </span>
              </div>
              <h3>{course.title}</h3>
              <p className="course-card__summary">{course.summary}</p>
              <div className="course-card__progress">
                <ProgressBar done={course.completedLessons} total={course.lessonCount} />
                <p className="course-card__meta">
                  {course.completedLessons} of {course.lessonCount}{' '}
                  {course.lessonCount === 1 ? 'lesson' : 'lessons'} done
                </p>
              </div>
              <div className="course-card__foot">
                <span className="course-card__meta">
                  {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
                </span>
                <Link to={`/courses/${course.slug}`} className="button button--small">
                  {course.completedLessons === 0
                    ? 'View course'
                    : course.completedLessons >= course.lessonCount
                      ? 'Review course'
                      : 'Continue course'}
                  <ArrowRightIcon size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}