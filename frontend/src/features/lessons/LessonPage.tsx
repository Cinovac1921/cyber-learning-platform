import { Link, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { getLesson } from '../../api/courses'
import { useResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { LessonContent } from './LessonContent'

export function LessonPage() {
  const { slug = '', position = '' } = useParams()
  const number = Number(position)

  const lesson = useResource(`lesson:${slug}:${position}`, (signal) =>
    Number.isInteger(number) && number > 0
      ? getLesson(slug, number, signal)
      : Promise.reject(new ApiError(404, 'Lesson not found.', null)),
  )

  if (lesson.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading lesson…
      </p>
    )
  }

  if (lesson.status === 'error') {
    return <ErrorNotice error={lesson.error} />
  }

  const { title, content, course, previousPosition, nextPosition } = lesson.data

  return (
    <article className="lesson">
      <p className="breadcrumb">
        <Link to="/courses">Courses</Link> / <Link to={`/courses/${course.slug}`}>{course.title}</Link>
      </p>
      <h1>{title}</h1>
      <p className="lesson__position">Lesson {lesson.data.position}</p>

      <LessonContent content={content} />

      <nav className="lesson-nav" aria-label="Lesson navigation">
        {previousPosition ? (
          <Link to={`/courses/${course.slug}/lessons/${previousPosition}`} className="button button--quiet">
            ← Previous lesson
          </Link>
        ) : (
          <span />
        )}
        {nextPosition ? (
          <Link to={`/courses/${course.slug}/lessons/${nextPosition}`} className="button">
            Next lesson →
          </Link>
        ) : (
          <Link to={`/courses/${course.slug}`} className="button">
            Back to course
          </Link>
        )}
      </nav>
    </article>
  )
}