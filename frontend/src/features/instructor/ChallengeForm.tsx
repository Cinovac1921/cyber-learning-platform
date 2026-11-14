import { useRef, useState, type SyntheticEvent } from 'react'
import { ApiError } from '../../api/client'
import type { ChallengeInput, InstructorChallenge } from '../../types/challenges'
import { CATEGORIES, DIFFICULTIES, MAX_FILE_BYTES, formatBytes } from '../challenges/meta'

interface ChallengeFormProps {
  /** Pass a challenge to edit it. Leave out to write a new one. */
  initial?: InstructorChallenge
  submitLabel: string
  /** Show a file picker. Used when creating; an existing challenge has its own file section. */
  withFile?: boolean
  onSubmit: (values: ChallengeInput, file: File | null) => Promise<void>
}

export function ChallengeForm({ initial, submitLabel, withFile = false, onSubmit }: ChallengeFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setError(null)
    setSaved(false)

    const file = data.get('file')
    const chosen = file instanceof File && file.size > 0 ? file : null
    if (chosen && chosen.size > MAX_FILE_BYTES) {
      setError(`That file is ${formatBytes(chosen.size)}. The limit is ${formatBytes(MAX_FILE_BYTES)}.`)
      return
    }

    const flag = String(data.get('flag')).trim()
    setSaving(true)
    try {
      await onSubmit(
        {
          title: String(data.get('title')).trim(),
          category: String(data.get('category')) as ChallengeInput['category'],
          difficulty: String(data.get('difficulty')) as ChallengeInput['difficulty'],
          points: Number(data.get('points')),
          description: String(data.get('description')).trim(),
          hint: String(data.get('hint')).trim(),
          // When editing, an empty box means "keep the current flag".
          ...(flag ? { flag } : {}),
        },
        chosen,
      )
      setSaved(true)
      // Do not leave a flag sitting in the box after it was saved.
      const box = formRef.current?.elements.namedItem('flag')
      if (box instanceof HTMLInputElement) box.value = ''
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
    <form ref={formRef} className="form" onSubmit={handleSubmit} onChange={() => setSaved(false)}>
      <label>
        Title
        <input type="text" name="title" defaultValue={initial?.title} minLength={3} maxLength={120} required />
      </label>

      <div className="form__row">
        <label>
          Category
          <select name="category" defaultValue={initial?.category ?? 'WEB'}>
            {CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select name="difficulty" defaultValue={initial?.difficulty ?? 'EASY'}>
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty.value} value={difficulty.value}>
                {difficulty.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Points
          <input
            type="number"
            name="points"
            defaultValue={initial?.points ?? 100}
            min={1}
            max={10000}
            step={1}
            required
          />
        </label>
      </div>

      <label>
        Description
        <textarea
          name="description"
          defaultValue={initial?.description}
          rows={8}
          minLength={3}
          maxLength={5000}
          required
        />
        <span className="form__hint">
          What the student sees. Leave a blank line between paragraphs, and put values in `backticks` to show them as
          code.
        </span>
      </label>

      <label>
        Hint
        <input type="text" name="hint" defaultValue={initial?.hint} maxLength={500} />
        <span className="form__hint">Optional. Students open it when they want a nudge.</span>
      </label>

      <label>
        Flag
        <input
          type="text"
          name="flag"
          placeholder={initial ? 'Leave blank to keep the current flag' : 'flag{...}'}
          maxLength={200}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          required={!initial}
        />
        <span className="form__hint">
          {initial
            ? 'The flag is stored only as a hash, so it cannot be shown again. Type a new one to change it.'
            : 'The exact answer students must submit. Letter case matters. It is stored only as a hash.'}
        </span>
      </label>

      {withFile && (
        <label>
          File (optional)
          <input type="file" name="file" />
          <span className="form__hint">For example a capture, an image or an archive. Up to {formatBytes(MAX_FILE_BYTES)}.</span>
        </label>
      )}

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
