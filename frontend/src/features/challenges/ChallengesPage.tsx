import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'

export function ChallengesPage() {
  return (
    <>
      <PageHeader title="Challenges" description="Hands-on problems you solve to earn points." />
      <EmptyState title="No challenges yet">
        Challenges will be listed here with their category, difficulty, and points.
      </EmptyState>
    </>
  )
}