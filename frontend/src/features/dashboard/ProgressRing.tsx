const VIEWBOX = 68
const CENTER = VIEWBOX / 2

interface ProgressRingProps {
  percent: number
  /** A CSS color, usually a variable such as var(--course-1). */
  color: string
  /** Rendered width and height in pixels. */
  size?: number
  /** Stroke width in viewBox units. */
  thickness?: number
}

export function ProgressRing({ percent, color, size = 68, thickness = 7 }: ProgressRingProps) {
  const radius = CENTER - thickness / 2 - 1
  const circumference = 2 * Math.PI * radius

  return (
    <svg
      className="ring"
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      role="img"
      aria-label={`${percent}% complete`}
    >
      <circle className="ring__track" cx={CENTER} cy={CENTER} r={radius} strokeWidth={thickness} />
      <circle
        className="ring__value"
        cx={CENTER}
        cy={CENTER}
        r={radius}
        strokeWidth={thickness}
        style={{ stroke: color }}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - percent / 100)}
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
      />
      <text
        className="ring__label"
        x={CENTER}
        y={CENTER}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size > 100 ? 17 : 15}
      >
        {percent}%
      </text>
    </svg>
  )
}
