interface ProgressBarProps {
  done: number
  total: number
}

export function ProgressBar({ done, total }: ProgressBarProps) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-label={`${done} of ${total} lessons completed`}
    >
      <div className="progress__fill" style={{ width: `${percent}%` }} />
    </div>
  )
}