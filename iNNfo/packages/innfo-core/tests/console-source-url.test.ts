// @vitest-environment node
//
// SCS S1.5: `meta.sourceUrl`. The runtime ports the retired viewer's predicate
// (`safeSourceHref`): only http(s) and relative URLs become links; any other
// scheme (javascript:, data:, ...) and a bare protocol-relative `//` are rejected
// and shown as plain text. The navbar link is built with DOM APIs, never innerHTML.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'

const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = join(here, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const runtimePath = join(consoleDir, 'innfo-runtime.js')
const shellPath = join(consoleDir, 'artifact_shell.html')

const nodeRequire = createRequire(import.meta.url)

interface Runtime {
  safeSourceHref: (url: unknown) => string
  renderNavbarIdentity: (doc: Document, meta: any) => void
}

function loadRuntime(): Runtime {
  return nodeRequire(runtimePath) as Runtime
}

function freshDoc(): Document {
  return new JSDOM(readFileSync(shellPath, 'utf8')).window.document
}

describe('safeSourceHref', () => {
  const rt = loadRuntime()

  it('accepts http(s) and relative URLs', () => {
    expect(rt.safeSourceHref('https://example.com/doc')).toBe('https://example.com/doc')
    expect(rt.safeSourceHref('http://example.com/doc')).toBe('http://example.com/doc')
    expect(rt.safeSourceHref('docs/model.md')).toBe('docs/model.md')
  })

  it('rejects unsafe schemes and a bare protocol-relative URL', () => {
    for (const bad of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,<b>x</b>',
      'vbscript:x',
      '//',
      '\\evil',
    ]) {
      expect(rt.safeSourceHref(bad)).toBe('')
    }
  })
})

describe('renderNavbarIdentity sourceUrl', () => {
  it('renders a safe sourceUrl as a link', () => {
    const doc = freshDoc()
    loadRuntime().renderNavbarIdentity(doc, { title: 'T', sourceUrl: 'https://example.com/doc' })
    const a = doc.querySelector('#innfo-navbar-extra a.innfo-source-link')
    expect(a).not.toBeNull()
    expect(a!.getAttribute('href')).toBe('https://example.com/doc')
    expect(a!.textContent).toBe('source')
  })

  it('renders an unsafe sourceUrl as plain text, never a link', () => {
    const doc = freshDoc()
    loadRuntime().renderNavbarIdentity(doc, { title: 'T', sourceUrl: 'javascript:alert(1)' })
    expect(doc.querySelector('#innfo-navbar-extra a')).toBeNull()
    expect(doc.querySelector('#innfo-navbar-extra b')).toBeNull()
    expect(doc.getElementById('innfo-navbar-extra')!.textContent).toContain('javascript:alert(1)')
  })
})
