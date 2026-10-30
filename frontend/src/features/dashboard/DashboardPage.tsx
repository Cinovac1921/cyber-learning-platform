import { Link } from 'react-router'
import { PageHeader } from '../../components/PageHeader'

export function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Your progress across courses and challenges." />
      <div className="card-grid">
        <section className="card">
          <h2>Courses</h2>
          <p>Start a course and your progress will appear here.</p>
          <Link to="/courses" className="button">
            Browse courses
          </Link>
        </section>
        <section className="card">
          <h2>Challenges</h2>
          <p>Solve a challenge and it will show up here.</p>
          <Link to="/challenges" className="button">
            Try a challenge
          </Link>
        </section>
      </div>
    </>
  )
}