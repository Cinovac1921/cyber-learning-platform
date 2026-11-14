import { useState } from 'react'
import type { CourseScope } from '../../types/instructor'

const OPTIONS: { value: CourseScope; label: string; hint: string }[] = [
  { value: 'PUBLIC', label: 'Public library', hint: 'Students can browse it once it is published.' },
  { value: 'TEMPLATE', label: 'Template', hint: 'Starter content for instructors. Students never see it.' },
]

/** Lets an admin move a course between the public library and the templates. */
export function ScopeControl({
  scope,
  onSave,
}: {
  scope: CourseScope
  onSave: (scope: CourseScope) => Promise<void>
}) {
  const [draft, setDraft] = useState<CourseScope>(scope)
  const [saving, setSaving] = useState(false)
  const hint = OPTIONS.find((option) => option.value === draft)?.hint

  async function save() {
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="form">
      <label>
        Where this course appears
        <select value={draft} onChange={(event) => setDraft(event.target.value as CourseScope)}>
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="form__hint">{hint}</span>
      </label>
      {draft !== scope && (
        <div className="toolbar">
          <button type="button" className="button" disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}
