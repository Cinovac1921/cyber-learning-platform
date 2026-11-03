import { useState, type SyntheticEvent } from 'react'
import { ApiError } from '../../api/client'
import type { CourseLevel } from '../../types/learning'
import type { CourseInput } from '../../types/instructor'

const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
]

interface CourseFormProps {
  initial?: CourseInput
  submitLabel: string
  onSubmit: (values: CourseInput) => Promise<void>
}

export function CourseForm({ initial, submitLabel, onSubmit }: CourseFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError(null)
    setSaved(false)
    setSaving(true)
    try {
      await onSubmit({
        title: String(data.get('title')).trim(),
        summary: String(data.get('summary')).trim(),
        level: String(data.get('level')) as CourseLevel,
      })
      setSaved(true)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Can't reach the server. Check that the backend is running.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} onChange={() => setSaved(false)}>
      <label>
        Title
        <input type="text" name="title" defaultValue={initial?.title} minLength={3} maxLength={120} required />
      </label>
      <label>
        Summary
        <textarea
          name="summary"
          defaultValue={initial?.summary}
          rows={3}
          minLength={10}
          maxLength={300}
          required
        />
        <span className="form__hint">One or two sentences students see on the course card.</span>
      </label>
      <label>
        Level
        <select name="level" defaultValue={initial?.level ?? 'BEGINNER'}>
          {LEVELS.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="notice notice--ok" role="status">
          Saved.
        </p>
      )}
      <button type="submit" className="button" disabled={saving}>
        {saving ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}