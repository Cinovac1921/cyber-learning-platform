import type { DashboardData } from '../../types/learning'

// TEMPORARY sample data. It disappears when the backend can return real progress.
// It matches the starter courses from the seed script so the links work.
export const sampleDashboard: DashboardData = {
  courses: [
    {
      id: 1,
      title: 'Web Security Basics',
      slug: 'web-security-basics',
      completedLessons: 1,
      totalLessons: 3,
      nextLesson: { id: 2, number: 2, title: 'Never trust user input' },
    },
    {
      id: 2,
      title: 'Network Fundamentals',
      slug: 'network-fundamentals',
      completedLessons: 2,
      totalLessons: 3,
      nextLesson: { id: 6, number: 3, title: 'TCP and UDP' },
    },
    {
      id: 3,
      title: 'Intro to Linux',
      slug: 'intro-to-linux',
      completedLessons: 0,
      totalLessons: 3,
      nextLesson: { id: 7, number: 1, title: 'The command line' },
    },
  ],
  weeklyGoal: {
    target: 5,
    completed: 3,
    activeDays: [true, true, false, true, false, false, false],
  },
}