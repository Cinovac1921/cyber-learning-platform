import { useState, type SyntheticEvent } from 'react'
import { ApiError } from '../../api/client'
import type { InstructorQuestion, QuestionInput } from '../../types/instructor'

const MIN_OPTIONS = 2
const MAX_OPTIONS = 6

let draftCount = 0

/** A fresh key for an option row, so React keeps each row's text when rows are removed. */
function makeKey() {
  draftCount += 1
  return draftCount
}

interface DraftOption {
  key: number
  text: string
  isCorrect: boolean
}

interface QuestionFormProps {
  /** Pass a question to edit it. Leave out to write a new one. */
  initial?: InstructorQuestion
  submitLabel: string
  onSubmit: (values: QuestionInput) => Promise<void>
  onCancel: () => void
}

export function QuestionForm({ initial, submitLabel, onSubmit, onCancel }: QuestionFormProps) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? '')
  const [explanation, setExplanation] = useState(initial?.explanation ?? '')
  const [options, setOptions] = useState<DraftOption[]>(() =>
    initial
      ? initial.options.map((option) => ({ key: makeKey(), text: option.text, isCorrect: option.isCorrect }))
      : Array.from({ length: 4 }, () => ({ key: makeKey(), text: '', isCorrect: false })),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function changeOption(key: number, changes: Partial<DraftOption>) {
    setOptions((current) => current.map((option) => (option.key === key ? { ...option, ...changes } : option)))
  }

  function markCorrect(key: number) {
    setOptions((current) => current.map((option) => ({ ...option, isCorrect: option.key === key })))
  }

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!options.some((option) => option.isCorrect)) {
      setError('Mark the correct option before you save.')
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        prompt: prompt.trim(),
        explanation: explanation.trim(),
        options: options.map(({ text, isCorrect }) => ({ text: text.trim(), isCorrect })),
      })
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
    <form className="form question-form" onSubmit={handleSubmit}>
      <label>
        Question
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={2}
          minLength={3}
          maxLength={500}
          required
        />
      </label>

      <fieldset className="question-form__options">
        <legend>Options</legend>
        <p className="form__hint">Pick the radio next to the correct option.</p>
        {options.map((option, index) => (
          <div key={option.key} className="option-row">
            <input
              type="radio"
              name="correct-option"
              checked={option.isCorrect}
              onChange={() => markCorrect(option.key)}
              aria-label={`Option ${index + 1} is the correct answer`}
            />
            <input
              type="text"
              value={option.text}
              onChange={(event) => changeOption(option.key, { text: event.target.value })}
              maxLength={250}
              required
              aria-label={`Option ${index + 1} text`}
            />
            <button
              type="button"
              className="button button--quiet button--small"
              disabled={options.length <= MIN_OPTIONS}
              aria-label={`Remove option ${index + 1}`}
              onClick={() => setOptions((current) => current.filter((item) => item.key !== option.key))}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="button button--quiet button--small"
          disabled={options.length >= MAX_OPTIONS}
          onClick={() => setOptions((current) => [...current, { key: makeKey(), text: '', isCorrect: false }])}
        >
          Add option
        </button>
      </fieldset>

      <label>
        Explanation
        <textarea
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          rows={2}
          maxLength={500}
        />
        <span className="form__hint">Optional. Students read this after they submit.</span>
      </label>

      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      <div className="toolbar">
        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        <button type="button" className="button button--quiet" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
