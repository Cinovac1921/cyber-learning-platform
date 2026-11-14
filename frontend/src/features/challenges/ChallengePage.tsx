import { useState, type SyntheticEvent } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { downloadChallengeFile, getChallenge, submitFlag } from '../../api/challenges'
import { useReloadableResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { CheckCircleIcon } from '../../components/Icons'
import { PageHeader } from '../../components/PageHeader'
import type { FlagResult } from '../../types/challenges'
import { LessonContent } from '../lessons/LessonContent'
import { DifficultyChip } from './DifficultyChip'
import { categoryLabel, formatBytes } from './meta'

export function ChallengePage() {
  const { id = '' } = useParams()
  const challengeId = Number(id)

  const { resource: challenge, reload } = useReloadableResource(`challenge:${id}`, (signal) =>
    Number.isInteger(challengeId) && challengeId > 0
      ? getChallenge(challengeId, signal)
      : Promise.reject(new ApiError(404, 'Challenge not found.', null)),
  )

  const [flag, setFlag] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<FlagResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

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

  const { title, category, difficulty, points, description, hint, file, solved, solveCount } = challenge.data

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setResult(null)
    setSubmitting(true)
    try {
      const outcome = await submitFlag(challengeId, flag)
      setResult(outcome)
      if (outcome.correct) {
        setFlag('')
        reload()
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Can't reach the server. Check that the backend is running.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDownload() {
    if (!file) return
    setDownloadError(null)
    setDownloading(true)
    try {
      await downloadChallengeFile(challengeId, file.name)
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : "Can't reach the server.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="challenge">
      <p className="breadcrumb">
        <Link to="/challenges">All challenges</Link>
      </p>
      <PageHeader title={title} />

      <div className="toolbar">
        <span className="chip">{categoryLabel(category)}</span>
        <DifficultyChip difficulty={difficulty} />
        <span className="chip">{points} pts</span>
        <span className="course-card__meta">
          {solveCount} {solveCount === 1 ? 'solve' : 'solves'}
        </span>
      </div>

      {solved && (
        <p className="notice notice--ok challenge__solved" role="status">
          <CheckCircleIcon size={20} />
          You solved this challenge.
        </p>
      )}

      <section className="panel">
        <LessonContent content={description} />
      </section>

      {file && (
        <section className="panel file-box">
          <div>
            <h2>Challenge file</h2>
            <p className="course-card__meta">
              {file.name} ({formatBytes(file.size)})
            </p>
          </div>
          <button type="button" className="button" disabled={downloading} onClick={() => void handleDownload()}>
            {downloading ? 'Downloading…' : 'Download'}
          </button>
        </section>
      )}
      {downloadError && (
        <p className="notice notice--error" role="alert">
          {downloadError}
        </p>
      )}

      {hint && (
        <details className="hint">
          <summary>Show hint</summary>
          <p>{hint}</p>
        </details>
      )}

      <section className="panel">
        <h2>Submit the flag</h2>
        <form className="form flag-form" onSubmit={handleSubmit}>
          <label>
            Flag
            <input
              type="text"
              name="flag"
              value={flag}
              onChange={(event) => setFlag(event.target.value)}
              placeholder="flag{...}"
              maxLength={200}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              required
            />
          </label>
          <button type="submit" className="button" disabled={submitting || flag.trim() === ''}>
            {submitting ? 'Checking…' : 'Submit'}
          </button>
        </form>

        {result?.correct && !result.alreadySolved && (
          <p className="notice notice--ok" role="status">
            Correct! You earned {result.points} points.
          </p>
        )}
        {result?.correct && result.alreadySolved && (
          <p className="notice notice--ok" role="status">
            Correct. You had already solved this one, so no new points.
          </p>
        )}
        {result && !result.correct && (
          <p className="notice notice--error" role="alert">
            That is not the flag. Try again.
          </p>
        )}
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  )
}
