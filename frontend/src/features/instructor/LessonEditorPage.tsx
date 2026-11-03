import { useState, type SyntheticEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { createLesson, getMyCourse, updateLesson } from '../../api/instructor'
import { useResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'

export function LessonEditorPage() {
  const { id = '', lessonId } = useParams()
  const courseId = Number(id)
  const editingId = lessonId === undefined ? null : Number(lessonId)
  const navigate = useNavigate()

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const course = useResource(`instructor-course:${id}`, (signal) =>
    Number.isInteger(courseId) && courseId > 0
      ? getMyCourse(courseId, signal)
      : Promise.reject(new ApiError(404, 'Course not found.', null)),
  )

  if (course.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading…
      </p>
    )
  }

  if (course.status === 'error') {
    return <ErrorNotice error={course.error} />
  }

  const lesson = editingId === null ? null : course.data.lessons.find((item) => item.id === editingId)
  if (editingId !== null && !lesson) {
    return <ErrorNotice error={new ApiError(404, 'Lesson not found.', null)} />
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const values = {
      title: String(data.get('title')).trim(),
      content: String(data.get('content')).trim(),
    }
    setError(null)
    setSaving(true)
    try {
      if (editingId === null) {
        await createLesson(courseId, values)
      } else {
        await updateLesson(editingId, values)
      }
      navigate(`/instructor/courses/${courseId}`)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Can't reach the server. Check that the backend is running.",
      )
      setSaving(false)
    }
  }

  return (
    <div className="editor">
      <div>
        <p className="breadcrumb">
          <Link to="/instructor">Instructor</Link> /{' '}
          <Link to={`/instructor/courses/${courseId}`}>{course.data.title}</Link>
        </p>
        <PageHeader title={lesson ? 'Edit lesson' : 'New lesson'} />
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Title
          <input type="text" name="title" defaultValue={lesson?.title} minLength={2} maxLength={160} required />
        </label>
        <label>
          Lesson text
          <textarea
            name="content"
            className="form__textarea--tall"
            defaultValue={lesson?.content}
            rows={16}
            maxLength={20000}
            required
          />
          <span className="form__hint">
            Leave a blank line between paragraphs. Put commands in `backticks` to show them as code.
          </span>
        </label>
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        <div className="toolbar">
          <button type="submit" className="button" disabled={saving}>
            {saving ? 'Saving…' : 'Save lesson'}
          </button>
          <Link to={`/instructor/courses/${courseId}`} className="button button--quiet">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}