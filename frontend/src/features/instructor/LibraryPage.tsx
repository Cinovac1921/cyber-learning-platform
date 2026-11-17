import { Link, useSearchParams } from 'react-router'
import { listLibrary } from '../../api/library'
import { useResource } from '../../app/useResource'
import { EmptyState } from '../../components/EmptyState'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import type { LibraryItem } from '../../types/library'
import { levelLabel } from '../courses/levels'

function LibraryGrid({ items, target }: { items: LibraryItem[]; target: string | null }) {
  const suffix = target ? `?target=${encodeURIComponent(target)}` : ''
  return (
    <div className="course-grid">
      {items.map((item) => (
        <article key={item.id} className="course-card">
          <div className="toolbar">
            <span className="chip">{levelLabel(item.level)}</span>
            <span className={item.scope === 'TEMPLATE' ? 'chip chip--live' : 'chip'}>
              {item.scope === 'TEMPLATE' ? 'Template' : 'Public'}
            </span>
          </div>
          <h3>{item.title}</h3>
          <p className="course-card__summary">{item.summary}</p>
          <p className="course-card__meta">
            {item.lessonCount} {item.lessonCount === 1 ? 'lesson' : 'lessons'}
            {item.quizCount > 0 && ` · ${item.quizCount} ${item.quizCount === 1 ? 'quiz' : 'quizzes'}`}
          </p>
          <Link to={`/instructor/library/${item.id}${suffix}`} className="button button--block">
            Preview and copy
          </Link>
        </article>
      ))}
    </div>
  )
}

export function LibraryPage() {
  const [params] = useSearchParams()
  const target = params.get('target')
  const library = useResource('instructor-library', (signal) => listLibrary(signal))

  return (
    <>
      <p className="breadcrumb">
        <Link to="/instructor">Instructor</Link>
      </p>
      <PageHeader
        title="Library"
        description="Starter lessons and quizzes to copy into your own courses. Copies arrive hidden, so you can edit them before students see anything."
      />

      {library.status === 'loading' && (
        <p className="loading" role="status">
          Loading the library…
        </p>
      )}
      {library.status === 'error' && <ErrorNotice error={library.error} />}

      {library.status === 'ready' && (
        <>
          <section className="editor__section" aria-labelledby="templates-title">
            <h2 id="templates-title">Templates</h2>
            <p className="course-card__meta">
              Prepared by the admins. You can copy their lessons and their quizzes.
            </p>
            {library.data.templates.length === 0 ? (
              <EmptyState title="No templates yet">Admins add starter courses here.</EmptyState>
            ) : (
              <LibraryGrid items={library.data.templates} target={target} />
            )}
          </section>

          <section className="editor__section" aria-labelledby="public-title">
            <h2 id="public-title">Public courses</h2>
            <p className="course-card__meta">
              Live in the public library. You can copy their lessons. Their quizzes are practice quizzes with
              visible answers, so they can't be copied.
            </p>
            {library.data.publicCourses.length === 0 ? (
              <p className="loading">No public courses yet.</p>
            ) : (
              <LibraryGrid items={library.data.publicCourses} target={target} />
            )}
          </section>
        </>
      )}
    </>
  )
}
