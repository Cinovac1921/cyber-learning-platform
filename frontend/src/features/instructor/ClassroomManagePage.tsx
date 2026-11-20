import { useState, type SyntheticEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import {
  deleteClassroom,
  getMyClassroom,
  regenerateJoinCode,
  removeMember,
  updateClassroom,
} from '../../api/instructor-classrooms'
import { useReloadableResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import { useConfirm } from '../../app/useConfirm'

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function ClassroomManagePage() {
  const confirm = useConfirm()
  const { id = '' } = useParams()
  const classroomId = Number(id)
  const navigate = useNavigate()
  const [actionError, setActionError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  const { resource: classroom, reload } = useReloadableResource(`instructor-classroom:${id}`, (signal) =>
    Number.isInteger(classroomId) && classroomId > 0
      ? getMyClassroom(classroomId, signal)
      : Promise.reject(new ApiError(404, 'Classroom not found.', null)),
  )

  /** Runs an action, shows a readable error if it fails, and refreshes the data. */
  async function run(action: () => Promise<unknown>) {
    setActionError(null)
    try {
      await action()
      reload()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Can't reach the server. Check that the backend is running.")
    }
  }

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

  const { name, description, joinCode, joinOpen, members, courses } = classroom.data

  async function saveDetails(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setSaved(false)
    await run(() =>
      updateClassroom(classroomId, {
        name: String(data.get('name')).trim(),
        description: String(data.get('description')).trim(),
      }),
    )
    setSaved(true)
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(joinCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setActionError('Could not copy. Select the code and copy it by hand.')
    }
  }

  async function removeClassroom() {
    const ok = await confirm({
      title: 'Delete this classroom?',
      message: `Delete the classroom "${name}"? Its students will be removed from it.`,
      confirmLabel: 'Delete classroom',
      danger: true,
    })
    if (!ok) return
    setActionError(null)
    try {
      await deleteClassroom(classroomId)
      navigate('/instructor')
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Can't reach the server.")
    }
  }

  return (
    <div className="editor">
      <div>
        <p className="breadcrumb">
          <Link to="/instructor">Instructor</Link>
        </p>
        <PageHeader
          title={name}
          actions={
            <>
              <Link to={`/instructor/classrooms/${classroomId}/progress`} className="button button--quiet">
                View progress
              </Link>
              <Link to={`/instructor/courses/new?classroomId=${classroomId}`} className="button">
                + New course here
              </Link>
            </>
          }
        />
        <p className="toolbar">
          <span className={joinOpen ? 'chip chip--live' : 'chip'}>{joinOpen ? 'Joining open' : 'Joining closed'}</span>
          <span className="course-card__meta">
            {members.length} {members.length === 1 ? 'student' : 'students'} · {courses.length}{' '}
            {courses.length === 1 ? 'course' : 'courses'}
          </span>
        </p>
      </div>

      {actionError && (
        <p className="notice notice--error" role="alert">
          {actionError}
        </p>
      )}

      <section className="editor__section">
        <h2>Join code</h2>
        <p className="course-card__meta">Share this with your students. They enter it on their dashboard.</p>
        <p className="join-code" aria-label={`Join code ${joinCode}`}>
          <code>{joinCode}</code>
        </p>
        <div className="toolbar">
          <button type="button" className="button button--quiet button--small" onClick={() => void copyCode()}>
            {copied ? 'Copied' : 'Copy code'}
          </button>
          <button
            type="button"
            className="button button--quiet button--small"
            onClick={() => void run(() => updateClassroom(classroomId, { joinOpen: !joinOpen }))}
          >
            {joinOpen ? 'Close joining' : 'Open joining'}
          </button>
          <button
            type="button"
            className="button button--quiet button--small"
            onClick={async () => {
              const ok = await confirm({
                title: 'Make a new code?',
                message: 'The old one stops working. Students already in the classroom stay.',
                confirmLabel: 'Make new code',
              })
              if (ok) void run(() => regenerateJoinCode(classroomId))
            }}
          >
            New code
          </button>
        </div>
      </section>

      <section className="editor__section">
        <h2>Details</h2>
        <form className="form" onSubmit={(event) => void saveDetails(event)} onChange={() => setSaved(false)}>
          <label>
            Name
            <input type="text" name="name" defaultValue={name} minLength={3} maxLength={120} required />
          </label>
          <label>
            Description
            <textarea name="description" defaultValue={description} rows={3} maxLength={300} />
          </label>
          {saved && (
            <p className="notice notice--ok" role="status">
              Saved.
            </p>
          )}
          <button type="submit" className="button">
            Save details
          </button>
        </form>
      </section>

      <section className="editor__section">
        <h2>Courses</h2>
        <p className="course-card__meta">Only this classroom's students can see these once they are published.</p>
        {courses.length === 0 ? (
          <p className="loading">No courses yet. Add the first one.</p>
        ) : (
          <ul className="lesson-rows">
            {courses.map((course) => (
              <li key={course.id} className="lesson-row">
                <span className="lesson-row__title">{course.title}</span>
                <span className={course.published ? 'chip chip--live' : 'chip'}>
                  {course.published ? 'Published' : 'Draft'}
                </span>
                <span className="course-card__meta">
                  {course.lessonCount} {course.lessonCount === 1 ? 'lesson' : 'lessons'}
                </span>
                <Link to={`/instructor/courses/${course.id}`} className="button button--quiet button--small">
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="editor__section">
        <h2>Students</h2>
        {members.length === 0 ? (
          <p className="loading">Nobody has joined yet. Share the join code above.</p>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <caption className="sr-only">Students in this classroom</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Joined</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.userId}>
                    <td>{member.displayName}</td>
                    <td>{member.email}</td>
                    <td>{formatDate(member.joinedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="button button--danger button--small"
                        aria-label={`Remove ${member.displayName} from the classroom`}
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Remove this student?',
                            message: `Remove ${member.displayName} from "${name}"? Their progress is kept.`,
                            confirmLabel: 'Remove',
                            danger: true,
                          })
                          if (ok) void run(() => removeMember(classroomId, member.userId))
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="editor__section">
        <h2>Delete classroom</h2>
        <p className="course-card__meta">
          {courses.length > 0
            ? 'Delete the classroom\'s courses first. A classroom with courses can\'t be deleted.'
            : 'This removes the classroom and its students. It can\'t be undone.'}
        </p>
        <button
          type="button"
          className="button button--danger"
          disabled={courses.length > 0}
          onClick={() => void removeClassroom()}
        >
          Delete this classroom
        </button>
      </section>
    </div>
  )
}
