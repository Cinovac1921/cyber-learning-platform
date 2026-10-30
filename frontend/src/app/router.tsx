import { createBrowserRouter } from 'react-router'
import { AssessmentsPage } from '../features/assessments/AssessmentsPage'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { RequireAuth } from '../features/auth/RequireAuth'
import { ChallengesPage } from '../features/challenges/ChallengesPage'
import { CoursesPage } from '../features/courses/CoursesPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { InstructorPage } from '../features/instructor/InstructorPage'
import { CoursePage } from '../features/courses/CoursePage'
import { LessonPage } from '../features/lessons/LessonPage'
import { NotFoundPage } from '../features/NotFoundPage'
import { AppLayout } from './AppLayout'
import { AuthLayout } from './AuthLayout'


export const router = createBrowserRouter([
  {
    // Sign in and register: split-screen layout, no top bar.
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
    ],
  },
  {
    // Everything else: top navbar layout.
    path: '/',
    element: <AppLayout />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'courses', element: <CoursesPage /> },
          { path: 'courses/:slug', element: <CoursePage /> },
          { path: 'courses/:slug/lessons/:position', element: <LessonPage /> },
          { path: 'challenges', element: <ChallengesPage /> },
          { path: 'assessments', element: <AssessmentsPage /> },
        ],
      },
      {
        element: <RequireAuth role="INSTRUCTOR" />,
        children: [{ path: 'instructor', element: <InstructorPage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])