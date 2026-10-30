import { Link, useParams } from 'react-router'
import { getCourse } from '../../api/courses'
import { useResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import { levelLabel } from './levels'

export function CoursePage() {
  const { slug = '' } = useParams()
  const course = useResource(`course:${slug}`, (signal) => getCourse(slug, signal))

  if (course.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading course…
      </p>
    )
  }

  if (course.status === 'error') {
    return <ErrorNotice error={course.error} />
  }

  const { title, summary, level, lessons } = course.data
  const first = lessons[0]

  return (
    <>
      <p className="breadcrumb">
        <Link to="/courses">Courses</Link>
      </p>
      <PageHeader
        title={title}
        description={summary}
        actions={
          first && (
            <Link to={`/courses/${slug}/lessons/${first.position}`} className="button">
              Start course
            </Link>
          )
        }
      />
      <p className="course-meta">
        <span className="chip">{levelLabel(level)}</span>
        <span>
          {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
        </span>
      </p>

      {lessons.length === 0 ? (
        <p className="loading">This course has no lessons yet.</p>
      ) : (
        <ol className="lesson-list">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link to={`/courses/${slug}/lessons/${lesson.position}`}>
                <span className="lesson-list__number" aria-hidden="true">
                  {lesson.position}
                </span>
                {lesson.title}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}