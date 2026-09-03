/**
 * Renders a small, safe subset of Markdown (bold, italic, bullet lists, line breaks)
 * to HTML for inline display in blocks.
 *
 * Single source of truth so every view renders descriptions identically.
 * Input is HTML-escaped first, then a fixed allow-list of formatting is re-applied.
 */
export function renderInlineMarkdown(text: string | null | undefined): string {
  if (!text) {
    return '<p class="text-slate-400 italic text-xs">No description or details.</p>'
  }

  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(
      /^\s*[-*]\s+(.*)$/gim,
      '<li class="ml-4 list-disc text-xs text-slate-600 my-1">$1</li>',
    )
    .replace(/\n/g, '<br>')
}
