import { useState, type SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../../api/client'
import { createClassroom } from '../../api/instructor-classrooms'
import { PageHeader } from '../../components/PageHeader'

export function NewClassroomPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(null)
    setSaving(true)
    try {
      const created = await createClassroom({
        name: String(data.get('name')).trim(),
        description: String(data.get('description')).trim(),
      })
      navigate(`/instructor/classrooms/${created.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Can't reach the server. Check that the backend is running.")
      setSaving(false)
    }
  }

  return (
    <div className="editor">
      <div>
        <p className="breadcrumb">
          <Link to="/instructor">Instructor</Link>
        </p>
        <PageHeader title="New classroom" description="You'll get a join code to share with your students." />
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Name
          <input type="text" name="name" minLength={3} maxLength={120} placeholder="Network Security, Section A" required />
        </label>
        <label>
          Description
          <textarea name="description" rows={3} maxLength={300} />
          <span className="form__hint">Optional. Students see this on their dashboard.</span>
        </label>
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Creating…' : 'Create classroom'}
        </button>
      </form>
    </div>
  )
}
