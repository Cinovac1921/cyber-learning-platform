import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { getClassroom, leaveClassroom } from '../../api/classrooms'
import { ApiError } from '../../api/client'
import { useResource } from '../../app/useResource'
import { EmptyState } from '../../components/EmptyState'
import { ErrorNotice } from '../../components/ErrorNotice'
import { ArrowLeftIcon } from '../../components/Icons'
import { PageHeader } from '../../components/PageHeader'
import { levelLabel } from '../courses/levels'
import { useConfirm } from '../../app/useConfirm'

export function ClassroomPage() {
  const confirm = useConfirm()
  const { id = '' } = useParams()
  const classroomId = Number(id)
  const navigate = useNavigate()
  const [leaveError, setLeaveError] = useState<string | null>(null)

  const classroom = useResource(`classroom:${id}`, (signal) =>
    Number.isInteger(classroomId) && classroomId > 0
      ? getClassroom(classroomId, signal)
      : Promise.reject(new ApiError(404, 'Classroom not found.', null)),
  )

  if (classroom.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading classroom…
      </p>
    )
  }

  if (classroom.status === 'error') {
    return <ErrorNotice error={classroom.error} />
  }

  const { name, description, instructorName, courses } = classroom.data

  async function leave() {
    const ok = await confirm({
      title: 'Leave this classroom?',
      message: `Leave "${name}"? You can join again later with the code. Your progress is kept.`,
      confirmLabel: 'Leave classroom',
      danger: true,
    })
    if (!ok) return
    setLeaveError(null)
    try {
      await leaveClassroom(classroomId)
      navigate('/')
    } catch (err) {
      setLeaveError(err instanceof ApiError ? err.message : "Can't reach the server.")
    }
  }

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">
          <ArrowLeftIcon size={20} />
          My learning
        </Link>
      </p>
      <PageHeader
        title={name}
        description={`${instructorName}${description ? ` · ${description}` : ''}`}
        actions={
          <button type="button" className="button button--quiet" onClick={() => void leave()}>
            Leave classroom
          </button>
        }
      />

      {leaveError && (
        <p className="notice notice--error" role="alert">
          {leaveError}
        </p>
      )}

      {courses.length === 0 ? (
        <EmptyState title="No courses yet">Your instructor hasn't published a course here yet.</EmptyState>
      ) : (
        <div className="course-grid">
          {courses.map((course) => (
            <article key={course.id} className="course-card">
              <div className="toolbar">
                <span className="chip">{levelLabel(course.level)}</span>
              </div>
              <h3>{course.title}</h3>
              <p className="course-card__summary">{course.summary}</p>
              <p className="course-card__meta">
                {course.completedLessons} of {course.lessonCount}{' '}
                {course.lessonCount === 1 ? 'lesson' : 'lessons'} done
              </p>
              <Link to={`/courses/${course.slug}`} className="button button--block">
                {course.completedLessons === 0 ? 'Start course' : 'Open course'}
              </Link>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
