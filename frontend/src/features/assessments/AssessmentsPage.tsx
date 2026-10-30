import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'

export function AssessmentsPage() {
  return (
    <>
      <PageHeader title="Assessments" description="Quizzes and tests that check what you've learned." />
      <EmptyState title="No assessments yet">
        Assessments assigned to your courses will appear here.
      </EmptyState>
    </>
  )
}