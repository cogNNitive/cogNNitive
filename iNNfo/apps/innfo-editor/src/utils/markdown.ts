/**
 * markdown.ts
 *
 * Full Markdown rendering using `marked` with DOMPurify sanitization.
 * Replaces the inline-only `renderInlineMarkdown` for full content display.
 *
 * Inline images are constrained to max-width: 100% / max-height: 480px.
 * Tables get overflow-x: auto so horizontal scroll works.
 * Code blocks render with monospace font + subtle background.
 */
import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({
  breaks: true,
  gfm: true,
})

/**
 * Renders markdown to sanitized HTML safe for `v-html` insertion.
 * All markdown syntax (headings, lists, code blocks, tables, images, links)
 * is supported. HTML output is sanitized to strip scripts, event handlers,
 * and other dangerous content.
 */
export function renderMarkdown(md: string | null | undefined): string {
  if (!md) {
    return ''
  }

  const raw = marked.parse(md) as string

  const sanitized = DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'p',
      'br',
      'hr',
      'ul',
      'ol',
      'li',
      'strong',
      'em',
      'b',
      'i',
      'u',
      's',
      'del',
      'ins',
      'a',
      'img',
      'code',
      'pre',
      'blockquote',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'div',
      'span',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'class', 'id'],
  })

  return sanitized
}
