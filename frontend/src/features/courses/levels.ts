import type { CourseLevel } from '../../types/learning'

const LEVEL_LABEL: Record<CourseLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
}

export function levelLabel(level: CourseLevel): string {
  return LEVEL_LABEL[level]
}