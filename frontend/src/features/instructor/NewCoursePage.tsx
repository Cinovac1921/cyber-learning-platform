import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { createCourse } from '../../api/instructor'
import { listMyClassrooms } from '../../api/instructor-classrooms'
import { useResource } from '../../app/useResource'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import type { CourseInput } from '../../types/instructor'
import { useAuth } from '../auth/useAuth'
import { CourseForm } from './CourseForm'

export function NewCoursePage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()
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
  // Only admins can start a template, and a template is not made for a classroom.
  const placement = chosen === 'template' && user?.role === 'ADMIN' ? 'template' : known ? chosen : 'public'

  async function create(values: CourseInput) {
    const input: CourseInput =
      placement === 'public'
        ? values
        : placement === 'template'
          ? { ...values, scope: 'TEMPLATE' }
          : { ...values, classroomId: Number(placement) }
    const created = await createCourse(input)
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
            {user?.role === 'ADMIN' && (
              <option value="template">Template (instructors copy from it, students never see it)</option>
            )}
            {classrooms.data.map((classroom) => (
              <option key={classroom.id} value={String(classroom.id)}>
                Classroom: {classroom.name} (private)
              </option>
            ))}
          </select>
          <span className="form__hint">
            {placement === 'public'
              ? 'An admin reviews it first. Once approved, it appears in the public library for everyone.'
              : placement === 'template'
                ? 'Instructors can copy its lessons and quizzes. Publish it when it is ready to be used.'
                : "Only this classroom's students can see it once you publish it. This can't be changed later."}
          </span>
        </label>
      </div>
      <CourseForm submitLabel="Create course" onSubmit={create} />
    </div>
  )
}
