import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { createCourse } from '../../api/instructor'
import { listMyClassrooms } from '../../api/instructor-classrooms'
import { useResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import type { CourseInput } from '../../types/instructor'
import { CourseForm } from './CourseForm'

export function NewCoursePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const classrooms = useResource('instructor-classrooms', (signal) => listMyClassrooms(signal))
  const [chosen, setChosen] = useState(params.get('classroomId') ?? 'public')

  const header = (
    <div>
      <p className="breadcrumb">
        <Link to="/instructor">Instructor</Link>
      </p>
      <PageHeader title="New course" description="You'll add lessons on the next screen." />
    </div>
  )

  // Wait for the classrooms so a course can never land in the wrong place while they load.
  if (classrooms.status === 'loading') {
    return (
      <div className="editor">
        {header}
        <p className="loading" role="status">
          Loading…
        </p>
      </div>
    )
  }

  if (classrooms.status === 'error') {
    return (
      <div className="editor">
        {header}
        <ErrorNotice error={classrooms.error} />
      </div>
    )
  }

  const known = classrooms.data.some((classroom) => String(classroom.id) === chosen)
  const placement = known ? chosen : 'public'

  async function create(values: CourseInput) {
    const created = await createCourse(
      placement === 'public' ? values : { ...values, classroomId: Number(placement) },
    )
    navigate(`/instructor/courses/${created.id}`)
  }

  return (
    <div className="editor">
      {header}
      <div className="form">
        <label>
          Where will this course live?
          <select value={placement} onChange={(event) => setChosen(event.target.value)}>
            <option value="public">Public library (everyone can browse it)</option>
            {classrooms.data.map((classroom) => (
              <option key={classroom.id} value={String(classroom.id)}>
                Classroom: {classroom.name} (private)
              </option>
            ))}
          </select>
          <span className="form__hint">
            {placement === 'public'
              ? 'An admin reviews it first. Once approved, it appears in the public library for everyone.'
              : "Only this classroom's students can see it once you publish it. This can't be changed later."}
          </span>
        </label>
      </div>
      <CourseForm submitLabel="Create course" onSubmit={create} />
    </div>
  )
}
