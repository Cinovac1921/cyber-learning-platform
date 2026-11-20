import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import {
  deleteChallenge,
  downloadMyChallengeFile,
  getMyChallenge,
  removeChallengeFile,
  updateChallenge,
  uploadChallengeFile,
} from '../../api/challenges'
import { useReloadableResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import type { ChallengeInput } from '../../types/challenges'
import { MAX_FILE_BYTES, categoryLabel, formatBytes } from '../challenges/meta'
import { ChallengeForm } from './ChallengeForm'
import { useConfirm } from '../../app/useConfirm'

export function ChallengeEditorPage() {
  const confirm = useConfirm()
  const { challengeId = '' } = useParams()
  const id = Number(challengeId)
  const navigate = useNavigate()
  const location = useLocation()
  const startNotice = (location.state as { notice?: string } | null)?.notice ?? null

  const [actionError, setActionError] = useState<string | null>(startNotice)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const { resource: challenge, reload } = useReloadableResource(`instructor-challenge:${challengeId}`, (signal) =>
    Number.isInteger(id) && id > 0
      ? getMyChallenge(id, signal)
      : Promise.reject(new ApiError(404, 'Challenge not found.', null)),
  )

  /** Runs an action, shows a readable error if it fails, and refreshes the data. */
  async function run(action: () => Promise<unknown>) {
    setActionError(null)
    try {
      await action()
      reload()
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "Can't reach the server. Check that the backend is running.",
      )
    }
  }

  if (challenge.status === 'loading') {
    return (
      <p className="loading" role="status">
        Loading challenge…
      </p>
    )
  }

  if (challenge.status === 'error') {
    return <ErrorNotice error={challenge.error} />
  }

  const { title, category, published, file, solveCount } = challenge.data

  async function saveDetails(values: ChallengeInput) {
    await updateChallenge(id, values)
    reload()
  }

  async function handleUpload() {
    const chosen = fileInput.current?.files?.[0]
    if (!chosen) {
      setActionError('Choose a file first.')
      return
    }
    if (chosen.size > MAX_FILE_BYTES) {
      setActionError(`That file is ${formatBytes(chosen.size)}. The limit is ${formatBytes(MAX_FILE_BYTES)}.`)
      return
    }
    setUploading(true)
    await run(() => uploadChallengeFile(id, chosen))
    if (fileInput.current) fileInput.current.value = ''
    setUploading(false)
  }

  async function removeChallenge() {
    const ok = await confirm({
      title: 'Delete this challenge?',
      message: `Delete "${title}"? Its file and every student's solve will be deleted too.`,
      confirmLabel: 'Delete challenge',
      danger: true,
    })
    if (!ok) return
    setActionError(null)
    try {
      await deleteChallenge(id)
      navigate('/instructor/challenges')
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Can't reach the server.")
    }
  }

  return (
    <div className="editor">
      <div>
        <p className="breadcrumb">
          <Link to="/instructor/challenges">Challenges</Link>
        </p>
        <PageHeader
          title={title}
          actions={
            <button
              type="button"
              className={published ? 'button button--quiet' : 'button'}
              onClick={() => void run(() => updateChallenge(id, { published: !published }))}
            >
              {published ? 'Unpublish' : 'Publish'}
            </button>
          }
        />
        <p className="toolbar">
          <span className={published ? 'chip chip--live' : 'chip'}>{published ? 'Published' : 'Draft'}</span>
          <span className="course-card__meta">
            {published
              ? `Students can see this. ${solveCount} ${solveCount === 1 ? 'solve' : 'solves'} so far.`
              : 'Only you can see this. Publish it when it is ready.'}
          </span>
        </p>
      </div>

      {actionError && (
        <p className="notice notice--error" role="alert">
          {actionError}
        </p>
      )}

      <section className="editor__section">
        <h2>Details</h2>
        <ChallengeForm
          initial={challenge.data}
          submitLabel="Save details"
          onSubmit={saveDetails}
        />
        <p className="course-card__meta">
          {categoryLabel(category)} challenge. Changing the points does not change what students already earned.
        </p>
      </section>

      <section className="editor__section">
        <h2>File</h2>
        {file ? (
          <div className="panel file-box">
            <div>
              <strong>{file.name}</strong>
              <p className="course-card__meta">{formatBytes(file.size)}</p>
            </div>
            <span className="row-actions">
              <button
                type="button"
                className="button button--quiet button--small"
                onClick={() => void run(() => downloadMyChallengeFile(id, file.name))}
              >
                Download
              </button>
              <button
                type="button"
                className="button button--danger button--small"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Remove this file?',
                    message: 'Remove this file from the challenge?',
                    confirmLabel: 'Remove',
                    danger: true,
                  })
                  if (ok) void run(() => removeChallengeFile(id))
                }}
              >
                Remove
              </button>
            </span>
          </div>
        ) : (
          <p className="course-card__meta">No file attached. Some challenges, such as a cipher, do not need one.</p>
        )}
        <div className="form">
          <label>
            {file ? 'Replace the file' : 'Attach a file'}
            <input ref={fileInput} type="file" />
            <span className="form__hint">Up to {formatBytes(MAX_FILE_BYTES)}. Students download it as is.</span>
          </label>
          <button type="button" className="button button--small" disabled={uploading} onClick={() => void handleUpload()}>
            {uploading ? 'Uploading…' : file ? 'Replace file' : 'Upload file'}
          </button>
        </div>
      </section>

      <section className="editor__section">
        <h2>Delete challenge</h2>
        <p className="course-card__meta">
          This removes the challenge, its file, and every student's solve. It can't be undone.
        </p>
        <button type="button" className="button button--danger" onClick={() => void removeChallenge()}>
          Delete this challenge
        </button>
      </section>
    </div>
  )
}
