import { Link, useNavigate, useParams } from 'react-router'
import { createAssessment } from '../../api/instructor'
import { PageHeader } from '../../components/PageHeader'
import type { AssessmentInput } from '../../types/instructor'
import { AssessmentForm } from './AssessmentForm'

export function NewAssessmentPage() {
  const { id = '' } = useParams()
  const courseId = Number(id)
  const navigate = useNavigate()

  async function create(values: AssessmentInput) {
    const created = await createAssessment(courseId, values)
    navigate(`/instructor/assessments/${created.id}`)
  }

  return (
    <div className="editor">
      <div>
        <p className="breadcrumb">
          <Link to={`/instructor/courses/${courseId}`}>Back to course</Link>
        </p>
        <PageHeader
          title="New assessment"
          description="Start with the basics. You add the questions on the next page."
        />
      </div>
      <AssessmentForm submitLabel="Create assessment" onSubmit={create} />
    </div>
  )
}
