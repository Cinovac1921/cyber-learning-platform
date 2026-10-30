import { EmptyState } from '../../components/EmptyState'
import { PageHeader } from '../../components/PageHeader'

export function InstructorPage() {
  return (
    <>
      <PageHeader title="Instructor" description="Create and manage courses, lessons, and challenges." />
      <EmptyState title="Instructor tools aren't available yet">
        You'll create courses and review student progress here once sign-in and roles are in place.
      </EmptyState>
    </>
  )
}