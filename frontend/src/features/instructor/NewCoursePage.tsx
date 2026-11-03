import { Link, useNavigate } from 'react-router'
import { createCourse } from '../../api/instructor'
import { PageHeader } from '../../components/PageHeader'
import type { CourseInput } from '../../types/instructor'
import { CourseForm } from './CourseForm'

export function NewCoursePage() {
  const navigate = useNavigate()

  async function create(values: CourseInput) {
    const created = await createCourse(values)
    navigate(`/instructor/courses/${created.id}`)
  }

  return (
    <div className="editor">
      <div>
        <p className="breadcrumb">
          <Link to="/instructor">Instructor</Link>
        </p>
        <PageHeader title="New course" description="You'll add lessons on the next screen." />
      </div>
      <CourseForm submitLabel="Create course" onSubmit={create} />
    </div>
  )
}