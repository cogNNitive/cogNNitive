import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { toSafeNavigationUrl } from '../src/utils/safe-url'

describe('toSafeNavigationUrl', () => {
  it('accepts http and https URLs', () => {
    expect(toSafeNavigationUrl('https://example.com/a.pdf')).toBe('https://example.com/a.pdf')
    expect(toSafeNavigationUrl('http://example.com/a.pdf')).toBe('http://example.com/a.pdf')
  })

  it('accepts workspace-relative paths', () => {
    expect(toSafeNavigationUrl('sources/report.docx')).toBe('sources/report.docx')
    expect(toSafeNavigationUrl('/sources/report.docx')).toBe('/sources/report.docx')
  })

  it('refuses javascript: payloads, including padded and mixed case', () => {
    expect(toSafeNavigationUrl('javascript:alert(1)')).toBeNull()
    expect(toSafeNavigationUrl('  javascript:alert(1)')).toBeNull()
    expect(toSafeNavigationUrl('JaVaScRiPt:alert(1)')).toBeNull()
  })

  it('refuses data:, vbscript:, file:, blob: and about:', () => {
    expect(toSafeNavigationUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(toSafeNavigationUrl('vbscript:msgbox(1)')).toBeNull()
    expect(toSafeNavigationUrl('file:///etc/passwd')).toBeNull()
    expect(toSafeNavigationUrl('blob:https://evil/x')).toBeNull()
    expect(toSafeNavigationUrl('about:blank')).toBeNull()
  })

  it('refuses scheme-relative URLs that point off-origin', () => {
    expect(toSafeNavigationUrl('//evil.com/x')).toBeNull()
  })

  it('refuses any other explicit scheme', () => {
    expect(toSafeNavigationUrl('ftp://evil.com/x')).toBeNull()
    expect(toSafeNavigationUrl('ms-msdt:/id')).toBeNull()
  })

  it('refuses nullish and blank input', () => {
    expect(toSafeNavigationUrl(null)).toBeNull()
    expect(toSafeNavigationUrl(undefined)).toBeNull()
    expect(toSafeNavigationUrl('   ')).toBeNull()
  })
})

describe('iframe sandboxing of document-supplied HTML', () => {
  const SRC = resolve(process.cwd(), 'src')

  // `allow-scripts` together with `allow-same-origin` on a srcdoc frame voids
  // the sandbox: the frame inherits the host origin and can reach window.parent.
  const files = [
    'components/editor/FilePreviewModal.vue',
    'components/editor/ConsoleHubView.vue',
  ]

  for (const file of files) {
    it(`${file} never combines allow-scripts with allow-same-origin`, () => {
      const source = readFileSync(resolve(SRC, file), 'utf-8')
      const sandboxAttrs = [...source.matchAll(/sandbox="([^"]*)"/g)].map((m) => m[1])
      expect(sandboxAttrs.length).toBeGreaterThan(0)
      for (const attr of sandboxAttrs) {
        const voided = attr.includes('allow-scripts') && attr.includes('allow-same-origin')
        expect(voided).toBe(false)
      }
    })
  }
})

describe('navigation sinks are guarded', () => {
  it('FilePreviewModal does not pass frontmatter straight to window.open', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/editor/FilePreviewModal.vue'),
      'utf-8',
    )
    expect(source).not.toContain('window.open(sourceFile')
    expect(source).toContain('toSafeNavigationUrl')
    // Every window.open must be opener-isolated.
    const opens = [...source.matchAll(/window\.open\(([^)]*)\)/g)].map((m) => m[1])
    expect(opens.length).toBeGreaterThan(0)
    for (const args of opens) {
      expect(args).toContain('noopener')
    }
  })
})
