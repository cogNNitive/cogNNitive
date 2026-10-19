// @vitest-environment node
//
// SCS S1.1: the navbar identity. The runtime renders the model identity from the
// payload: `#innfo-domain-title` (single model's title when scoped, else
// `meta.title`), an optional `.innfo-scope-label`, and a meta line in
// `#innfo-navbar-extra` (Template, Version, Generated). Every value is text; a
// missing field is omitted, never a placeholder.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { JSDOM } from 'jsdom'

const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = join(here, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const shellPath = join(consoleDir, 'artifact_shell.html')
const runtimePath = join(consoleDir, 'innfo-runtime.js')

const nodeRequire = createRequire(import.meta.url)

interface RuntimeWithIdentity {
  renderNavbarIdentity: (doc: Document, meta: any) => void
}

function loadRuntime(): RuntimeWithIdentity {
  return nodeRequire(runtimePath) as RuntimeWithIdentity
}

function freshDoc(): Document {
  return new JSDOM(readFileSync(shellPath, 'utf8')).window.document
}

describe('renderNavbarIdentity', () => {
  it('ships the neutral default title in the shell', () => {
    expect(freshDoc().getElementById('innfo-domain-title')!.textContent).toBe('iNNfo Console')
  })

  it('shows the single model title, scope label and meta line', () => {
    const doc = freshDoc()
    loadRuntime().renderNavbarIdentity(doc, {
      title: 'Domain',
      consoleScope: { models: ['pricing'], label: 'Pricing' },
      models: [{ title: 'Acme Pricing', blueprint: 'business', version: 'V_1-2-0' }],
      generated: '2026-10-11T16:56:22.123Z',
    })
    expect(doc.getElementById('innfo-domain-title')!.textContent).toBe('Acme Pricing')
    expect(doc.querySelector('.innfo-scope-label')!.textContent).toBe('Pricing')
    const popover = doc.querySelector('.innfo-navbar-info-popover')!.textContent!
    expect(popover).toContain('business')
    expect(popover).toContain('V_1-2-0')
    expect(popover).toContain('2026-10-11 16:56:22')
    expect(doc.getElementById('innfo-navbar-extra')!.textContent).toBe('')
  })

  it('uses meta.title for a multi-model console and no scope label', () => {
    const doc = freshDoc()
    loadRuntime().renderNavbarIdentity(doc, {
      title: 'Whole Domain',
      models: [{ title: 'A' }, { title: 'B' }],
    })
    expect(doc.getElementById('innfo-domain-title')!.textContent).toBe('Whole Domain')
    expect(doc.querySelector('.innfo-scope-label')).toBeNull()
  })

  it('omits a missing meta field instead of a placeholder', () => {
    const doc = freshDoc()
    loadRuntime().renderNavbarIdentity(doc, { title: 'Domain', models: [{ title: 'A' }] })
    const extra = doc.getElementById('innfo-navbar-extra')!.textContent!
    expect(extra).not.toContain('Template')
    expect(extra).not.toContain('Version')
    expect(extra).not.toContain('Generated')
    expect(extra).toBe('')
  })

  it('renders a hostile title as inert text', () => {
    const doc = freshDoc()
    loadRuntime().renderNavbarIdentity(doc, { title: '<img src=x onerror=alert(1)>', models: [] })
    const title = doc.getElementById('innfo-domain-title')!
    expect(title.querySelector('img')).toBeNull()
    expect(title.textContent).toBe('<img src=x onerror=alert(1)>')
  })
})
