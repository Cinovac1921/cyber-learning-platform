import { createBrowserRouter } from 'react-router'
import { AdminUsersPage } from '../features/admin/AdminUsersPage'
import { AssessmentPage } from '../features/assessments/AssessmentPage'
import { AssessmentResultPage } from '../features/assessments/AssessmentResultPage'
import { AssessmentsPage } from '../features/assessments/AssessmentsPage'
import { ClassroomPage } from '../features/classrooms/ClassroomPage'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { RequireAuth } from '../features/auth/RequireAuth'
import { ChallengePage } from '../features/challenges/ChallengePage'
import { ChallengesPage } from '../features/challenges/ChallengesPage'
import { LeaderboardPage } from '../features/challenges/LeaderboardPage'
import { CoursesPage } from '../features/courses/CoursesPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { InstructorPage } from '../features/instructor/InstructorPage'
import { AssessmentEditorPage } from '../features/instructor/AssessmentEditorPage'
import { ChallengeEditorPage } from '../features/instructor/ChallengeEditorPage'
import { ClassroomManagePage } from '../features/instructor/ClassroomManagePage'
import { CourseEditorPage } from '../features/instructor/CourseEditorPage'
import { InstructorChallengesPage } from '../features/instructor/InstructorChallengesPage'
import { LessonEditorPage } from '../features/instructor/LessonEditorPage'
import { NewAssessmentPage } from '../features/instructor/NewAssessmentPage'
import { NewChallengePage } from '../features/instructor/NewChallengePage'
import { NewClassroomPage } from '../features/instructor/NewClassroomPage'
import { NewCoursePage } from '../features/instructor/NewCoursePage'
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
          { path: 'classrooms/:id', element: <ClassroomPage /> },
          { path: 'courses', element: <CoursesPage /> },
          { path: 'courses/:slug', element: <CoursePage /> },
          { path: 'courses/:slug/lessons/:position', element: <LessonPage /> },
          { path: 'challenges', element: <ChallengesPage /> },
          { path: 'challenges/leaderboard', element: <LeaderboardPage /> },
          { path: 'challenges/:id', element: <ChallengePage /> },
          { path: 'assessments', element: <AssessmentsPage /> },
          { path: 'assessments/:id', element: <AssessmentPage /> },
          { path: 'assessments/:id/results/:attemptId', element: <AssessmentResultPage /> },
        ],
      },
      {
        element: <RequireAuth role={['INSTRUCTOR', 'ADMIN']} />,
        children: [
          { path: 'instructor', element: <InstructorPage /> },
          { path: 'instructor/classrooms/new', element: <NewClassroomPage /> },
          { path: 'instructor/classrooms/:id', element: <ClassroomManagePage /> },
          { path: 'instructor/challenges', element: <InstructorChallengesPage /> },
          { path: 'instructor/challenges/new', element: <NewChallengePage /> },
          { path: 'instructor/challenges/:challengeId', element: <ChallengeEditorPage /> },
          { path: 'instructor/courses/new', element: <NewCoursePage /> },
          { path: 'instructor/courses/:id', element: <CourseEditorPage /> },
          { path: 'instructor/courses/:id/lessons/new', element: <LessonEditorPage /> },
          { path: 'instructor/courses/:id/lessons/:lessonId', element: <LessonEditorPage /> },
          { path: 'instructor/courses/:id/assessments/new', element: <NewAssessmentPage /> },
          { path: 'instructor/assessments/:assessmentId', element: <AssessmentEditorPage /> },
        ],
      },
      {
        element: <RequireAuth role="ADMIN" />,
        children: [{ path: 'admin', element: <AdminUsersPage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])