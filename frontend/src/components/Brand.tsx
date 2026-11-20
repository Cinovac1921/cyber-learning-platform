import { useId } from 'react'
import { Link } from 'react-router'

/** The logo mark: a shield with a check on an orange tile. */
export function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="10" fill="var(--accent)" />
      <path
        d="M20 8 31 12.5v8c0 6.2-4.4 10.4-11 12.5-6.6-2.1-11-6.3-11-12.5v-8Z"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="m14.5 20.5 4 4 7.5-8" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Brand({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="brand">
      <BrandMark />
      <span className="brand__text">
        <span>Cyber Learning</span>
        <small className="brand__sub">Cybersecurity LMS</small>
      </span>
    </Link>
  )
}

/** Decorative modular composition shown beside course headings and on the sign-in screens. */
export function ShieldArt() {
  return (
    <svg className="shield-art" viewBox="0 0 220 165" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1">
        <rect x="0.5" y="0.5" width="219" height="164" />
        <path d="M55 0V165M110 0V165M165 0V165M0 55H220M0 110H220" />
      </g>
      <path d="M0 0H55A55 55 0 0 1 0 55Z" fill="var(--accent)" />
      <rect x="55" width="55" height="55" fill="currentColor" />
      <circle cx="192.5" cy="27.5" r="27.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect y="55" width="55" height="55" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="82.5" cy="82.5" r="27.5" fill="currentColor" />
      <path d="M110 110H165A55 55 0 0 0 110 55Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="178" y="68" width="28" height="28" fill="var(--accent)" />
      <rect y="122" width="110" height="5" fill="currentColor" />
      <rect y="135" width="70" height="5" fill="currentColor" />
      <rect y="148" width="40" height="5" fill="currentColor" />
      <rect x="165" y="110" width="55" height="55" fill="currentColor" fillOpacity="0.12" />
    </svg>
  )
}

/** Line drawing of a shield with a padlock and circuit traces, used on the home page. */
export function ShieldDrawing({ className }: { className?: string }) {
  const grid = useId()
  return (
    <svg className={className ? `shield-drawing ${className}` : 'shield-drawing'} viewBox="0 0 480 400" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={grid} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="480" height="400" fill={`url(#${grid})`} />

      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M140 140H90V90H50" />
        <path d="M140 230H70V290H40" />
        <path d="M140 185H18" />
        <path d="M340 140H400V90H440" />
        <path d="M340 230H410V290H440" />
        <path d="M340 185H462" />
        <path d="M420 400A60 60 0 0 1 480 340" />
        <path d="M380 400A100 100 0 0 1 480 300" />
      </g>
      <rect x="42" y="82" width="16" height="16" fill="currentColor" />
      <circle cx="40" cy="290" r="8" fill="var(--art-fill, var(--bg))" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="185" r="5" fill="currentColor" />
      <rect x="432" y="82" width="16" height="16" fill="var(--accent)" />
      <circle cx="440" cy="290" r="8" fill="currentColor" />
      <circle cx="462" cy="185" r="5" fill="currentColor" />

      <path
        d="M240 70 340 105v95c0 62-44 105-100 130-56-25-100-68-100-130V105Z"
        fill="var(--art-fill, var(--bg))"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinejoin="miter"
      />
      <path
        d="M240 92 322 120v80c0 52-36 87-82 108-46-21-82-56-82-108v-80Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path d="M218 200v-20a22 22 0 0 1 44 0v20" fill="none" stroke="currentColor" strokeWidth="8" />
      <rect x="206" y="198" width="68" height="54" fill="var(--accent)" />
      <circle cx="240" cy="221" r="7" fill="var(--near-black)" />
      <rect x="237" y="224" width="6" height="16" fill="var(--near-black)" />
    </svg>
  )
}

/** Abstract black, grey and orange diagonal composition used behind hero banners. */
export function HeroArt({ className }: { className?: string }) {
  const id = useId()
  const light = `${id}-light`
  const dark = `${id}-dark`
  const orange = `${id}-orange`
  return (
    <svg
      className={className}
      viewBox="0 0 700 300"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={light} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4f4f2" />
          <stop offset="1" stopColor="#5c5c5a" />
        </linearGradient>
        <linearGradient id={dark} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8d8d8a" />
          <stop offset="1" stopColor="#1b1b1b" />
        </linearGradient>
        <linearGradient id={orange} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9157" />
          <stop offset="1" stopColor="#f26b21" />
        </linearGradient>
      </defs>
      <rect width="700" height="300" fill="#0e0e0f" />
      <polygon points="60,300 230,0 300,0 130,300" fill={`url(#${orange})`} />
      <polygon points="150,300 330,0 470,0 290,300" fill={`url(#${light})`} opacity="0.92" />
      <polygon points="290,300 470,0 570,0 390,300" fill={`url(#${dark})`} />
      <polygon points="390,300 570,0 700,0 700,300" fill="#171717" />
      <g stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1">
        <path d="M180 300 360 0M210 300 390 0M240 300 420 0M320 300 500 0M350 300 530 0M380 300 560 0M430 300 610 0M470 300 650 0" />
      </g>
      <polygon points="560,300 700,110 700,300" fill={`url(#${orange})`} />
      <path d="M330 300 560 0" stroke="#f26b21" strokeWidth="1.5" fill="none" />
      <circle cx="560" cy="0" r="4" fill="#f26b21" />
    </svg>
  )
}

/** Orange diagonal shards for promo cards. */
export function PromoArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 220" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
      <polygon points="300,0 300,150 170,220 210,60" fill="#f26b21" opacity="0.9" />
      <polygon points="300,60 300,220 230,220" fill="#ff9157" opacity="0.6" />
      <path d="M120 220 300 20" stroke="#ffffff" strokeOpacity="0.15" fill="none" />
      <path d="M150 220 300 60" stroke="#f26b21" strokeOpacity="0.6" fill="none" />
    </svg>
  )
}
