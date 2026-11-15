export interface AppNotification {
  id: number
  type: 'COURSE_SUBMITTED' | 'COURSE_APPROVED' | 'COURSE_REJECTED' | 'COURSE_TAKEN_DOWN'
  message: string
  /** A page inside the app. */
  link: string
  read: boolean
  createdAt: string
}

export interface NotificationList {
  unreadCount: number
  items: AppNotification[]
}
