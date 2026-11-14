import { Link } from 'react-router'
import type { LibraryCourse } from '../../types/learning'
import { levelLabel } from '../courses/levels'

/** Public courses the student has not started yet. */
export function LibrarySection({ courses }: { courses: LibraryCourse[] }) {
  if (courses.length === 0) return null

  return (
    <section className="library" aria-labelledby="library-title">
      <div className="editor__heading">
        <h2 id="library-title">Public library</h2>
        <Link to="/courses" className="button button--quiet button--small">
          Browse all courses
        </Link>
      </div>
      <div className="course-grid">
        {courses.map((course) => (
          <article key={course.id} className="course-card">
            <div className="toolbar">
              <span className="chip">{levelLabel(course.level)}</span>
            </div>
            <h3>{course.title}</h3>
            <p className="course-card__summary">{course.summary}</p>
            <p className="course-card__meta">
              {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
            </p>
            <Link to={`/courses/${course.slug}`} className="button button--block">
              View course
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
