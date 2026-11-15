import { Link } from 'react-router'
import { listReviews } from '../../api/admin'
import { useResource } from '../../app/useResource'
import { EmptyState } from '../../components/EmptyState'
import { ErrorNotice } from '../../components/ErrorNotice'
import { PageHeader } from '../../components/PageHeader'
import type { ReviewListItem } from '../../types/review'
import { AdminTabs } from './AdminTabs'

function formatDate(value: string | null): string {
  return value
    ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—'
}

function CourseTable({ items, dateLabel, action }: { items: ReviewListItem[]; dateLabel: string; action: string }) {
  return (
    <div className="table-wrap">
      <table className="admin-table">
        <caption className="sr-only">{dateLabel} courses</caption>
        <thead>
          <tr>
            <th scope="col">Course</th>
            <th scope="col">Instructor</th>
            <th scope="col">{dateLabel}</th>
            <th scope="col">Lessons</th>
            <th scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td>
                {item.author.displayName}
                <br />
                <span className="course-card__meta">{item.author.email}</span>
              </td>
              <td>{formatDate(dateLabel === 'Submitted' ? item.submittedAt : item.reviewedAt)}</td>
              <td>{item.lessonCount}</td>
              <td>
                <Link to={`/admin/reviews/${item.id}`} className="button button--small">
                  {action}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ReviewQueuePage() {
  const reviews = useResource('admin-reviews', (signal) => listReviews(signal))

  return (
    <>
      <PageHeader
        title="Review queue"
        description="Instructors submit courses for the public library. Read each one, then approve it or send it back."
      />
      <AdminTabs />

      {reviews.status === 'loading' && (
        <p className="loading" role="status">
          Loading…
        </p>
      )}
      {reviews.status === 'error' && <ErrorNotice error={reviews.error} />}

      {reviews.status === 'ready' && (
        <>
          <section className="editor__section" aria-labelledby="pending-title">
            <h2 id="pending-title">Waiting for review ({reviews.data.pending.length})</h2>
            {reviews.data.pending.length === 0 ? (
              <EmptyState title="Nothing to review">New submissions will show up here, oldest first.</EmptyState>
            ) : (
              <CourseTable items={reviews.data.pending} dateLabel="Submitted" action="Review" />
            )}
          </section>

          <section className="editor__section" aria-labelledby="live-title">
            <h2 id="live-title">Live in the public library ({reviews.data.live.length})</h2>
            {reviews.data.live.length === 0 ? (
              <p className="loading">No course has been approved yet.</p>
            ) : (
              <CourseTable items={reviews.data.live} dateLabel="Approved" action="Open" />
            )}
          </section>
        </>
      )}
    </>
  )
}
