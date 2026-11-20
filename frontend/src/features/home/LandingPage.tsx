import { Link } from 'react-router'
import { Brand, HeroArt, ShieldDrawing } from '../../components/Brand'
import { ThemeToggle } from '../../app/ThemeToggle'
import { useBackendStatus, type BackendStatus } from '../../app/useBackendStatus'
import { CATEGORIES } from '../challenges/meta'

const STATUS_LABEL: Record<BackendStatus, string> = {
  checking: 'Checking',
  online: 'Active',
  offline: 'Unreachable',
}

const MODULES = [
  {
    id: '01',
    title: 'Courses',
    text: 'Structured lessons from fundamentals to advanced topics. Your progress is saved lesson by lesson.',
  },
  {
    id: '02',
    title: 'Challenges',
    text: 'Hands-on problems you solve to earn points. Find the flag, submit it and climb the leaderboard.',
  },
  {
    id: '03',
    title: 'Assessments',
    text: 'Quizzes with a pass mark for each course. See your best score and retake when you want to.',
  },
]

const STEPS = [
  { id: '01', title: 'Create an account', text: 'It takes a minute. Sign in from any device.' },
  { id: '02', title: 'Start a course', text: 'Pick a course and work through the lessons in order.' },
  { id: '03', title: 'Practice and test', text: 'Solve challenges and take assessments to check what stuck.' },
]

export function LandingPage() {
  const backendStatus = useBackendStatus()

  return (
    <div className="landing">
      <a className="skip-link" href="#home-main">
        Skip to content
      </a>

      <header className="landing__bar">
        <Brand />
        <div className="landing__bar-tools">
          <ThemeToggle />
          <Link to="/login" className="button button--quiet button--small">
            Sign in
          </Link>
          <Link to="/register" className="button button--small">
            Create account
          </Link>
        </div>
      </header>

      <main id="home-main" className="landing__main">
        <section className="landing__hero" aria-labelledby="home-title">
          <HeroArt className="landing__hero-bg" />
          <div className="landing__hero-text">
            <span className="label">Cybersecurity learning platform</span>
            <h1 id="home-title" className="landing__title">
              Learn security
              <br />
              by doing.
            </h1>
            <p className="landing__lead">
              Courses, hands-on challenges and quizzes in one place. Build real skills at your own pace.
            </p>
            <div className="landing__cta">
              <Link to="/register" className="button">
                Create account
              </Link>
              <Link to="/login" className="button button--quiet">
                Sign in
              </Link>
            </div>
          </div>
          <div className="landing__hero-art">
            <ShieldDrawing />
          </div>
        </section>

        <section className="landing__section" aria-labelledby="home-modules">
          <div className="landing__section-head">
            <span className="label">What you get</span>
            <h2 id="home-modules">Three ways to learn</h2>
          </div>
          <div className="landing__modules">
            {MODULES.map((item) => (
              <article key={item.id} className="landing__module">
                <span className="label label--accent">Module / {item.id}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <ul className="landing__tags" aria-label="Challenge categories">
            {CATEGORIES.map((category) => (
              <li key={category.value} className="chip">
                {category.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="landing__section" aria-labelledby="home-steps">
          <div className="landing__section-head">
            <span className="label">How it works</span>
            <h2 id="home-steps">From sign-up to skills</h2>
          </div>
          <ol className="landing__steps">
            {STEPS.map((step) => (
              <li key={step.id} className="landing__step">
                <span className="numeral">{step.id}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing__band" aria-labelledby="home-teach">
          <div>
            <span className="label">For instructors</span>
            <h2 id="home-teach">Teach with the same tools.</h2>
            <p>
              Build courses, lessons, challenges and assessments, run classrooms and follow how your students are
              doing.
            </p>
          </div>
          <Link to="/register" className="button">
            Get started
          </Link>
        </section>
      </main>

      <footer className="landing__foot">
        <p className={`status status--${backendStatus}`} role="status">
          <span className="status__dot" aria-hidden="true" />
          System status / {STATUS_LABEL[backendStatus]}
        </p>
        <nav aria-label="Account" className="landing__foot-links">
          <Link to="/login">Sign in</Link>
          <Link to="/register">Create account</Link>
        </nav>
      </footer>
    </div>
  )
}
