import { useState, type SyntheticEvent } from 'react'
import { ApiError } from '../../api/client'
import type { AssessmentInput } from '../../types/instructor'

interface AssessmentFormProps {
  initial?: AssessmentInput
  submitLabel: string
  onSubmit: (values: AssessmentInput) => Promise<void>
}

export function AssessmentForm({ initial, submitLabel, onSubmit }: AssessmentFormProps) {
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
        description: String(data.get('description')).trim(),
        passPercent: Number(data.get('passPercent')),
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
        Description
        <textarea name="description" defaultValue={initial?.description} rows={2} maxLength={300} />
        <span className="form__hint">Optional. Students see this on the assessment card.</span>
      </label>
      <label>
        Pass mark (%)
        <input
          type="number"
          name="passPercent"
          defaultValue={initial?.passPercent ?? 70}
          min={1}
          max={100}
          step={1}
          required
        />
        <span className="form__hint">The score a student needs to pass.</span>
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
