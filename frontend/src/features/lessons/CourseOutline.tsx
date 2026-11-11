import { Link } from 'react-router'
import { ArrowLeftIcon, CheckIcon, ChevronRightIcon, ShieldIcon } from '../../components/Icons'
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
        <ArrowLeftIcon size={20} />
        Course overview
      </Link>
      <div className="outline__head">
        <span className="tile" aria-hidden="true">
          <ShieldIcon size={26} />
        </span>
        <div>
          <h2 className="outline__title">{title}</h2>
          <p className="outline__meta">
            {done} of {lessons.length} lessons done
          </p>
        </div>
      </div>
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
                  className={
                    lesson.completed ? 'step step--sm step--done' : current ? 'step step--sm step--now' : 'step step--sm'
                  }
                  aria-hidden="true"
                >
                  {lesson.completed && <CheckIcon size={14} />}
                </span>
                {lesson.title}
                {current && <ChevronRightIcon size={18} className="outline__chevron" />}
                {lesson.completed && <span className="sr-only"> (completed)</span>}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
