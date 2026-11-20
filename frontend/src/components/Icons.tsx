import type { ReactNode, SVGProps } from 'react'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number }

/** Shared 24px stroke icons. They inherit color from the surrounding text. */
function Icon({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const MenuIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Icon>
)

export const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20h5v-5.5h4V20h5V9.5" />
  </Icon>
)

export const PlayIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
  </Icon>
)

export const PlayCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
    <path d="M10 8.5v7l6-3.5z" fill="var(--icon-knockout, #fff)" stroke="none" />
  </Icon>
)

export const TrophyIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M8 4h8v6a4 4 0 0 1-8 0z" />
    <path d="M8 6H4v1.5A3.5 3.5 0 0 0 7.5 11M16 6h4v1.5A3.5 3.5 0 0 1 16.5 11" />
    <path d="M12 14v4M8.5 20h7" />
  </Icon>
)

export const ChartIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="11" width="4" height="9" rx="1" />
    <rect x="10" y="4" width="4" height="16" rx="1" />
    <rect x="17" y="8" width="4" height="12" rx="1" />
  </Icon>
)

export const WrenchIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14.5 6.5a4 4 0 0 0 5 5L10 21l-4-4 9.5-9.5z" />
    <path d="M14.5 6.5 17 4l3 3-2.5 2.5" />
  </Icon>
)

export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9 5 7 7-7 7" />
  </Icon>
)

export const ArrowLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19 12H5M11 5l-7 7 7 7" />
  </Icon>
)

export const ArrowRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M5 12h14M13 5l7 7-7 7" />
  </Icon>
)

export const CheckIcon = (props: IconProps) => (
  <Icon {...props} strokeWidth={props.strokeWidth ?? 2.6}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
)

export const CheckCircleIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10" fill="currentColor" stroke="none" />
    <path d="m7.5 12.5 3 3 6-6.5" stroke="var(--icon-knockout, #fff)" strokeWidth="2.6" />
  </Icon>
)

export const BookIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    <path d="M9 8h7M9 12h5" />
  </Icon>
)

export const ListIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 6h12M9 12h12M9 18h12" />
    <circle cx="4.5" cy="6" r="1" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1" fill="currentColor" />
  </Icon>
)

export const CapIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m2 9 10-5 10 5-10 5z" fill="currentColor" />
    <path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" />
    <path d="M22 9v6" />
  </Icon>
)

export const MonitorIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </Icon>
)

export const SunIcon = (props: IconProps) => (
  <Icon {...props} strokeWidth={props.strokeWidth ?? 1.8}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
  </Icon>
)

export const MoonIcon = (props: IconProps) => (
  <Icon {...props} strokeWidth={props.strokeWidth ?? 1.8}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </Icon>
)

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)

export const GlobeIcon = (props: IconProps) => (
  <Icon {...props} strokeWidth={props.strokeWidth ?? 1.7}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M2.5 12h19M12 2.5c2.8 2.7 4.2 5.9 4.2 9.500S14.800 18.800 12 21.500C9.200 18.800 7.800 15.600 7.800 12S9.200 5.200 12 2.500z" />
  </Icon>
)

export const KeyboardIcon = (props: IconProps) => (
  <Icon {...props} strokeWidth={props.strokeWidth ?? 1.7}>
    <rect x="2.5" y="6" width="19" height="12.500" rx="2.500" />
    <path d="M6.500 10h.01M10 10h.01M14 10h.01M17.500 10h.01M6.500 13.500h.01M17.500 13.500h.01M9 15.500h6" strokeWidth="2.200" />
  </Icon>
)

export const DatabaseIcon = (props: IconProps) => (
  <Icon {...props} strokeWidth={props.strokeWidth ?? 1.7}>
    <ellipse cx="12" cy="5.500" rx="7.500" ry="3" />
    <path d="M4.500 5.500v6.500c0 1.700 3.400 3 7.500 3s7.500-1.300 7.500-3V5.500" />
    <path d="M4.500 12v6.500c0 1.700 3.400 3 7.500 3s7.500-1.300 7.500-3V12" />
  </Icon>
)

export const ShieldIcon = (props: IconProps) => (
  <Icon {...props} strokeWidth={props.strokeWidth ?? 1.8}>
    <path d="M12 2.5 19.5 6v5.500c0 4.600-3.100 8.300-7.500 10-4.400-1.700-7.500-5.400-7.500-10V6z" fill="currentColor" fillOpacity="0.15" />
    <rect x="9" y="10.500" width="6" height="5" rx="1" />
    <path d="M10 10.500V9a2 2 0 0 1 4 0v1.500" />
  </Icon>
)

export const BellIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9" />
    <path d="M10 20a2.2 2.2 0 0 0 4 0" />
  </Icon>
)
