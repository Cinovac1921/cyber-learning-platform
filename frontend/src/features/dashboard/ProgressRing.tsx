const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

interface ProgressRingProps {
  percent: number
  /** A CSS color, usually a variable such as var(--course-1). */
  color: string
}

export function ProgressRing({ percent, color }: ProgressRingProps) {
  return (
    <svg
      className="ring"
      width="68"
      height="68"
      viewBox="0 0 68 68"
      role="img"
      aria-label={`${percent}% complete`}
    >
      <circle className="ring__track" cx="34" cy="34" r={RADIUS} />
      <circle
        className="ring__value"
        cx="34"
        cy="34"
        r={RADIUS}
        style={{ stroke: color }}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
        transform="rotate(-90 34 34)"
      />
      <text className="ring__label" x="34" y="39" textAnchor="middle">
        {percent}%
      </text>
    </svg>
  )
}