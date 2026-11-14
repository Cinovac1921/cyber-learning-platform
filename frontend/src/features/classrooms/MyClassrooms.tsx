import { useState, type SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { joinClassroom, listClassrooms } from '../../api/classrooms'
import { ApiError } from '../../api/client'
import { useResource } from '../../app/useResource'

function joinErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Too many tries. Wait a minute, then try again.'
    return error.message
  }
  return "Can't reach the server. Check that the backend is running."
}

/** The student's classrooms, plus a box to join another one with a code. */
export function MyClassrooms() {
  const navigate = useNavigate()
  const classrooms = useResource('my-classrooms', (signal) => listClassrooms(signal))
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  async function handleJoin(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get('code')).trim()
    if (code === '') return
    setError(null)
    setJoining(true)
    try {
      const joined = await joinClassroom(code)
      navigate(`/classrooms/${joined.id}`)
    } catch (err) {
      setError(joinErrorMessage(err))
      setJoining(false)
    }
  }

  return (
    <section className="classrooms" aria-labelledby="classrooms-title">
      <div className="editor__heading">
        <h2 id="classrooms-title">My classrooms</h2>
      </div>

      <form className="join-form" onSubmit={handleJoin}>
        <input
          type="text"
          name="code"
          aria-label="Classroom join code"
          placeholder="Join code, like ABCD-EFGH"
          maxLength={20}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
        />
        <button type="submit" className="button" disabled={joining}>
          {joining ? 'Joining…' : 'Join classroom'}
        </button>
      </form>
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      {classrooms.status === 'ready' && classrooms.data.length === 0 && (
        <p className="loading">You haven't joined a classroom yet. Ask your instructor for a join code.</p>
      )}

      {classrooms.status === 'ready' && classrooms.data.length > 0 && (
        <div className="course-grid">
          {classrooms.data.map((classroom) => (
            <article key={classroom.id} className="course-card">
              <h3>{classroom.name}</h3>
              <p className="course-card__summary">{classroom.description || 'No description yet.'}</p>
              <p className="course-card__meta">
                {classroom.instructorName} · {classroom.courseCount}{' '}
                {classroom.courseCount === 1 ? 'course' : 'courses'}
              </p>
              <Link to={`/classrooms/${classroom.id}`} className="button button--block">
                Open classroom
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
