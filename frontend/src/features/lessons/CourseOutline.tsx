import { Link } from 'react-router'
import { ProgressBar } from '../../components/ProgressBar'
import type { LessonOutline } from '../../types/learning'

interface CourseOutlineProps {
  title: string
  slug: string
  lessons: LessonOutline[]
  currentPosition: number
}

export function CourseOutline({ title, slug, lessons, currentPosition }: CourseOutlineProps) {
  const done = lessons.filter((lesson) => lesson.completed).length

  return (
    <nav className="outline" aria-label="Course lessons">
      <Link to={`/courses/${slug}`} className="outline__back">
        ← Course overview
      </Link>
      <h2 className="outline__title">{title}</h2>
      <p className="outline__meta">
        {done} of {lessons.length} lessons done
      </p>
      <ProgressBar done={done} total={lessons.length} />
      <ol className="outline__list">
        {lessons.map((lesson) => {
          const current = lesson.position === currentPosition
          return (
            <li key={lesson.id}>
              <Link
                to={`/courses/${slug}/lessons/${lesson.position}`}
                className={current ? 'outline__item is-current' : 'outline__item'}
                aria-current={current ? 'page' : undefined}
              >
                <span
                  className={lesson.completed ? 'step step--done' : current ? 'step step--now' : 'step'}
                  aria-hidden="true"
                >
                  {lesson.completed ? '✓' : current ? '●' : ''}
                </span>
                {lesson.title}
                {lesson.completed && <span className="sr-only"> (completed)</span>}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}