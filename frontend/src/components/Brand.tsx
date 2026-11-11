import { useId } from 'react'
import { Link } from 'react-router'

/** The filled shield mark used in the navbar and on the sign-in screens. */
export function BrandMark({ size = 40 }: { size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="8" y1="2" x2="32" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9b5cff" />
          <stop offset="1" stopColor="#5a1fd0" />
        </linearGradient>
      </defs>
      <path
        d="M20 2.5 34 9.8v11.4c0 8.2-5.6 13.9-14 16.3C11.6 35.1 6 29.4 6 21.2V9.8z"
        fill={`url(#${id})`}
      />
      <path
        d="M20 8 30 13v8.2c0 5.9-3.9 10-10 12-6.1-2-10-6.100-10-12V13z"
        fill="none"
        stroke="#fff"
        strokeOpacity="0.28"
        strokeWidth="1.2"
      />
      <path d="m13.5 20.5 4.8 4.8 8.4-9.600" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Brand({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="brand">
      <BrandMark />
      <span>Cyber Learning</span>
    </Link>
  )
}

/** Decorative shield with a lock, shown beside course headings. */
export function ShieldArt() {
  const id = useId()
  return (
    <svg
      className="shield-art"
      viewBox="0 0 220 170"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="110" y1="10" x2="110" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a98bff" />
          <stop offset="1" stopColor="#6b3ae0" />
        </linearGradient>
      </defs>
      <ellipse cx="110" cy="112" rx="98" ry="26" fill="none" stroke="#a98bff" strokeOpacity="0.55" strokeWidth="2" />
      <path
        d="M110 8 166 32v46c0 34-23 58-56 70-33-12-56-36-56-70V32z"
        fill={`url(#${id}-body)`}
        fillOpacity="0.9"
      />
      <path d="M110 22 154 41v37c0 26-17 45-44 56" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="3" />
      <rect x="86" y="62" width="48" height="40" rx="8" fill="#fff" fillOpacity="0.95" />
      <path d="M95 62v-9a15 15 0 0 1 30 0v9" fill="none" stroke="#fff" strokeOpacity="0.95" strokeWidth="8" strokeLinecap="round" />
      <circle cx="110" cy="80" r="5" fill="#7c3aed" />
      <rect x="108" y="82" width="4" height="12" rx="2" fill="#7c3aed" />
      <rect x="14" y="40" width="11" height="11" rx="2" fill="#a98bff" fillOpacity="0.8" />
      <rect x="196" y="34" width="12" height="12" rx="2" fill="#a98bff" fillOpacity="0.6" />
    </svg>
  )
}
