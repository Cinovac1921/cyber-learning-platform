import type { CourseScope, ReviewStatus } from '../../types/instructor'

/**
 * A public-library course shows where it stands in review. Any other course is simply published or a draft.
 */
export function CourseStatusChip({
  scope,
  published,
  reviewStatus,
}: {
  scope: CourseScope
  published: boolean
  reviewStatus: ReviewStatus
}) {
  if (scope === 'PUBLIC') {
    if (reviewStatus === 'PENDING') return <span className="chip">Pending review</span>
    if (reviewStatus === 'APPROVED') return <span className="chip chip--live">Live</span>
    if (reviewStatus === 'REJECTED') return <span className="chip">Rejected</span>
    return <span className="chip">Draft</span>
  }
  return <span className={published ? 'chip chip--live' : 'chip'}>{published ? 'Published' : 'Draft'}</span>
}
