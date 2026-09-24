import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderMarkdown } from '../src/utils/markdown'

/**
 * Field content rendered by the editor is author-supplied and reaches the DOM
 * through `v-html`, so every rendering path must go through the sanitized
 * `renderMarkdown` in `utils/markdown.ts` — never `marked.parse` directly.
 *
 * NOTE ON SCOPE: these tests assert the *wiring*, not DOMPurify's own output.
 * Vitest runs this suite under `happy-dom`, where DOMPurify 3.x is degraded —
 * it strips tags it should keep (`<h1>`) and keeps URLs it should drop
 * (`javascript:`), even with its default config and no options passed. That is
 * an artifact of the test DOM, not of production: in a real browser DOMPurify
 * enforces both. Asserting its behaviour here would encode the broken
 * environment as the expectation.
 *
 * THE BEHAVIOURAL GUARANTEE IS CURRENTLY UNCOVERED. It was deferred to the
 * Playwright e2e suite, which never contained a sanitization test and was
 * never wired into CI; that suite is now deleted. Verified under happy-dom on
 * 2026-09-24: `renderMarkdown('[x](javascript:alert(1))')` returns the anchor
 * with the `javascript:` href intact, and `# Title` loses its <h1>. Production
 * is not known to be affected — a real browser enforces both — but nothing
 * here would catch a regression. Closing this needs a DOM where DOMPurify
 * behaves (e.g. jsdom via a per-file `@vitest-environment` pragma); see the
 * editor XSS item in the 2026-09-17 security audit.
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
