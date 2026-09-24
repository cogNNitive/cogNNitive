// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderMarkdown } from '../../src/utils/markdown'

/**
 * Field content rendered by the editor is author-supplied and reaches the DOM
 * through `v-html`, so every rendering path must go through the sanitized
 * `renderMarkdown` in `utils/markdown.ts` — never `marked.parse` directly.
 *
 * NOTE ON ENVIRONMENT: this file overrides the project's `happy-dom` with
 * `jsdom`, and the pragma on line 1 is load-bearing. Under happy-dom, DOMPurify
 * 3.x is degraded — it strips `<h1>`, which it should keep, and preserves a
 * `javascript:` href, which it must drop — so the URL-scheme guarantees below
 * would assert the broken environment instead of the contract. jsdom is what
 * DOMPurify is developed against and enforces both.
 *
 * That gap is why those guarantees went uncovered for weeks: they had been
 * deferred to the Playwright e2e suite, which never contained a sanitization
 * test and was never wired into CI. The suite is now deleted and the
 * guarantees live here (editor XSS, 2026-09-17 security audit).
 */
describe('renderMarkdown is the single rendering path', () => {
  it('returns empty string for nullish input', () => {
    expect(renderMarkdown('')).toBe('')
    expect(renderMarkdown(null)).toBe('')
    expect(renderMarkdown(undefined)).toBe('')
  })

  it('routes content through DOMPurify rather than returning it verbatim', () => {
    const out = renderMarkdown('hello\n\n<script>alert(1)</script>')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('alert(1)')
  })

  it('strips inline event handlers', () => {
    const out = renderMarkdown('<img src="x" onerror="alert(1)">')
    expect(out).not.toContain('onerror')
  })

  it('strips iframes', () => {
    const out = renderMarkdown('<iframe src="about:blank"></iframe>')
    expect(out).not.toContain('<iframe')
  })

  it('still renders legitimate markdown structure', () => {
    const out = renderMarkdown('# Title\n\n- a\n- b')
    expect(out).toContain('<li')
    expect(out).toContain('Title')
  })
})

describe('renderMarkdown drops dangerous URL schemes', () => {
  // These are the assertions happy-dom could not make. Each one is a real
  // escalation path: an anchor the reviewer clicks inside rendered field
  // content, where the href came from the document being edited.
  it('drops a javascript: href while keeping the link text', () => {
    const out = renderMarkdown('[click me](javascript:alert(1))')
    expect(out).not.toContain('javascript:')
    expect(out).toContain('click me')
  })

  it('drops a data: href that would carry markup', () => {
    const out = renderMarkdown('[x](data:text/html,<script>alert(1)</script>)')
    expect(out).not.toContain('data:text/html')
    expect(out).not.toContain('alert(1)')
  })

  it('drops a javascript: href written as raw HTML', () => {
    const out = renderMarkdown('<a href="javascript:alert(1)">x</a>')
    expect(out).not.toContain('javascript:')
  })

  it('drops script nested inside svg', () => {
    const out = renderMarkdown('<svg><script>alert(1)</script></svg>')
    expect(out).not.toContain('alert(1)')
  })

  it('keeps heading structure, which the degraded happy-dom DOMPurify removed', () => {
    expect(renderMarkdown('# Title')).toContain('<h1>')
  })

  it('keeps an ordinary https href intact', () => {
    const out = renderMarkdown('[docs](https://example.com/a)')
    expect(out).toContain('https://example.com/a')
  })
})

describe('no unsanitized markdown rendering path exists', () => {
  const SRC = resolve(process.cwd(), 'src')

  it('MarkdownFieldEditor does not call marked.parse directly', () => {
    const source = readFileSync(resolve(SRC, 'shared/widgets/MarkdownFieldEditor.vue'), 'utf-8')
    const callSites = source
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .filter((l) => l.includes('marked.parse'))
    expect(callSites).toEqual([])
  })

  it('utils/markdown.ts is the only module that calls marked.parse', () => {
    const source = readFileSync(resolve(SRC, 'utils/markdown.ts'), 'utf-8')
    expect(source).toContain('marked.parse')
    expect(source).toContain('DOMPurify.sanitize')
  })
})
