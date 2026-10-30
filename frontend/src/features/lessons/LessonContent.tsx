import type { ReactNode } from 'react'

/** Turns `code` fragments into <code> elements. Everything else stays plain text. */
function renderInline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/).map((part, index) =>
    part.length > 2 && part.startsWith('`') && part.endsWith('`') ? (
      <code key={index}>{part.slice(1, -1)}</code>
    ) : (
      part
    ),
  )
}

export function LessonContent({ content }: { content: string }) {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <div className="lesson__body">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{renderInline(paragraph)}</p>
      ))}
    </div>
  )
}