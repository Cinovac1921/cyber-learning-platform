import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../api/notifications'
import { BellIcon } from '../components/Icons'
import type { AppNotification, NotificationList } from '../types/notification'

const REFRESH_MS = 60_000

/** "5 min ago", "3 h ago", "2 d ago". */
function timeAgo(value: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}

/** Only a page inside this app is a safe place to send someone. */
function isInternalLink(link: string): boolean {
  return link.startsWith('/') && !link.startsWith('//')
}

/** A bell in the top bar: how many notifications are unread, and the latest ones. */
export function NotificationBell() {
  const navigate = useNavigate()
  const [data, setData] = useState<NotificationList | null>(null)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Asking for a refresh just bumps a counter. The effect below does the loading.
  const [refreshCount, setRefreshCount] = useState(0)
  const refresh = useCallback(() => setRefreshCount((count) => count + 1), [])

  // Load now, then every minute while the tab is visible, and again when the person comes back to it.
  useEffect(() => {
    let cancelled = false
    const load = () => {
      // If loading fails the bell keeps showing what it had. It is not worth interrupting anyone for.
      void listNotifications().then(
        (result) => {
          if (!cancelled) setData(result)
        },
        () => undefined,
      )
    }
    const loadIfVisible = () => {
      if (document.visibilityState === 'visible') load()
    }

    load()
    const timer = window.setInterval(loadIfVisible, REFRESH_MS)
    document.addEventListener('visibilitychange', loadIfVisible)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', loadIfVisible)
    }
  }, [refreshCount])

  // Close on a click elsewhere, or Escape.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function openNotification(item: AppNotification) {
    setOpen(false)
    if (!item.read) {
      await markNotificationRead(item.id).catch(() => undefined)
      refresh()
    }
    if (isInternalLink(item.link)) navigate(item.link)
  }

  async function markAllRead() {
    await markAllNotificationsRead().catch(() => undefined)
    refresh()
  }

  const unread = data?.unreadCount ?? 0

  return (
    <div className="bell" ref={rootRef}>
      <button
        type="button"
        className="bell__button"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current)
          refresh()
        }}
      >
        <BellIcon size={20} />
        {unread > 0 && (
          <span className="bell__badge" aria-hidden="true">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="bell__panel" role="region" aria-label="Notifications">
          <div className="bell__header">
            <strong>Notifications</strong>
            {unread > 0 && (
              <button type="button" className="link-button" onClick={() => void markAllRead()}>
                Mark all as read
              </button>
            )}
          </div>

          {data === null || data.items.length === 0 ? (
            <p className="bell__empty">Nothing yet. You'll hear about course reviews here.</p>
          ) : (
            <ul className="bell__list">
              {data.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={item.read ? 'bell__item' : 'bell__item bell__item--unread'}
                    onClick={() => void openNotification(item)}
                  >
                    <span>{item.message}</span>
                    <span className="bell__time">{timeAgo(item.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
