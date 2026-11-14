import { Link, useNavigate } from 'react-router'
import { ApiError } from '../../api/client'
import { createChallenge, uploadChallengeFile } from '../../api/challenges'
import { PageHeader } from '../../components/PageHeader'
import type { ChallengeInput } from '../../types/challenges'
import { ChallengeForm } from './ChallengeForm'

export function NewChallengePage() {
  const navigate = useNavigate()

  async function create(values: ChallengeInput, file: File | null) {
    const created = await createChallenge(values)

    let notice: string | undefined
    if (file) {
      try {
        await uploadChallengeFile(created.id, file)
      } catch (err) {
        const reason = err instanceof ApiError ? err.message : "Can't reach the server."
        notice = `The challenge was created, but the file did not upload: ${reason} Upload it again below.`
      }
    }
    navigate(`/instructor/challenges/${created.id}`, { state: { notice } })
  }

  return (
    <div className="editor">
      <div>
        <p className="breadcrumb">
          <Link to="/instructor/challenges">Challenges</Link>
        </p>
        <PageHeader
          title="New challenge"
          description="It starts as a draft. You can publish it from the next page."
        />
      </div>
      <ChallengeForm submitLabel="Create challenge" withFile onSubmit={create} />
    </div>
  )
}
