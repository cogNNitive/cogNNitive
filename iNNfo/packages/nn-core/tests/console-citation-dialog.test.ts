// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { installDialogStub } from './helpers/dialog-stub'

/**
 * C4 — the `innfo-citation-dialog` in `nn-runtime.js`. jsdom does not
 * implement `HTMLDialogElement.showModal`, so `installDialogStub` adds it.
 */

const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = join(here, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const runtimePath = join(consoleDir, 'nn-runtime.js')
const uiKitPath = join(consoleDir, 'ui-kit.js')
const nodeRequire = createRequire(import.meta.url)

type ResolvedCitation = {
  path: string
  anchor?: string
  exists: boolean
  origin?: 'agent' | 'human' | 'reviewer' | 'document'
  author?: string
  excerpt?: string
  truncated?: boolean
  sha256?: string
  version?: string
  error?: string
}

interface RuntimeApi {
  renderCitationDialog: (doc: Document, fieldName: string, entries: ResolvedCitation[]) => void
}

interface UiKitApi {
  icon: (name: string, size?: number, cls?: string) => string
}

function loadRuntime(): RuntimeApi {
  return nodeRequire(runtimePath) as RuntimeApi
}

function loadKit(): UiKitApi {
  return nodeRequire(uiKitPath) as UiKitApi
}

describe('InnfoUI.icon citation entries', () => {
  it('returns non-empty markup for every citation icon name', () => {
    const ui = loadKit()
    for (const name of ['cite-agent', 'cite-human', 'cite-reviewer', 'cite-document', 'cite-error']) {
      const svg = ui.icon(name, 14)
      expect(svg).toContain('<svg')
      expect(svg).toContain('innfo-icon')
    }
  })

  it('keeps the human icon visually distinct from the agent and document icons', () => {
    const ui = loadKit()
    const human = ui.icon('cite-human', 14)
    const agent = ui.icon('cite-agent', 14)
    const doc = ui.icon('cite-document', 14)
    expect(human).not.toBe(agent)
    expect(human).not.toBe(doc)
  })
})

describe('nn-runtime.js — renderCitationDialog', () => {
  beforeEach(() => {
    installDialogStub()
    document.documentElement.innerHTML = '<body></body>'
  })

  it('creates #innfo-citation-dialog and appends it to body when the shell lacks it', () => {
    expect(document.getElementById('innfo-citation-dialog')).toBeNull()
    const api = loadRuntime()

    api.renderCitationDialog(document, 'sources', [
      { path: 'sources/a.md', exists: true, origin: 'document' },
    ])

    const dialog = document.getElementById('innfo-citation-dialog')
    expect(dialog).not.toBeNull()
    expect(dialog!.parentElement).toBe(document.body)
  })

  it('opens via showModal() and shows path, anchor, and excerpt', () => {
    const api = loadRuntime()
    api.renderCitationDialog(document, 'sources', [
      {
        path: 'sources/import/conversations/s1_source.md',
        anchor: 'nn-agent-modification--update-field',
        exists: true,
        origin: 'agent',
        author: 'ClaudeCode',
        excerpt: 'the resolved excerpt text',
      },
    ])

    const dialog = document.getElementById('innfo-citation-dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    const text = dialog.textContent ?? ''
    expect(text).toContain('sources/import/conversations/s1_source.md')
    expect(text).toContain('nn-agent-modification--update-field')
    expect(text).toContain('the resolved excerpt text')
  })

  it('shows a visible truncation mark for a truncated excerpt', () => {
    const api = loadRuntime()
    api.renderCitationDialog(document, 'sources', [
      {
        path: 'sources/a.md',
        exists: true,
        origin: 'document',
        excerpt: 'capped excerpt text',
        truncated: true,
      },
    ])

    const excerptNode = document.querySelector('.innfo-cite-excerpt')!
    expect(excerptNode.textContent).toContain('capped excerpt text')
    expect(excerptNode.textContent).toMatch(/truncat/i)
  })

  it('omits the author line and shows no generic "Reviewer" placeholder when author is absent', () => {
    const api = loadRuntime()
    api.renderCitationDialog(document, 'sources', [
      {
        path: 'sources/import/conversations/r1_feedback.md',
        exists: true,
        origin: 'reviewer',
      },
    ])

    const tag = document.querySelector('[data-ku-kind="source"]')!
    expect(tag.getAttribute('data-ku-home')).toBe('source')
    expect(tag.textContent).toContain('Reviewer feedback')
    expect(tag.textContent).not.toMatch(/·\s*\w/) // no "· <name>" suffix
    expect(document.body.textContent).not.toContain('Reviewer:')
  })

  it('shows the error message and renders no empty placeholders for omitted excerpt/sha256/version', () => {
    const api = loadRuntime()
    api.renderCitationDialog(document, 'sources', [
      {
        path: 'sources/dangling.md',
        exists: false,
        origin: 'document',
        error: 'DANGLING_FILE',
      },
    ])

    const text = document.getElementById('innfo-citation-dialog')!.textContent ?? ''
    expect(text).toContain('DANGLING_FILE')
    expect(document.querySelectorAll('.innfo-cite-excerpt')).toHaveLength(0)
    // No dt/dd pair should render an empty dd for a field that was never set.
    const dds = [...document.querySelectorAll('.innfo-ref-fields dd')]
    dds.forEach((dd) => expect(dd.textContent?.trim()).not.toBe(''))
  })

  it('all citation text renders through textContent — an <img onerror> payload in an excerpt stays inert', () => {
    const api = loadRuntime()
    api.renderCitationDialog(document, 'sources', [
      {
        path: 'sources/a.md',
        exists: true,
        origin: 'document',
        excerpt: '<img src=x onerror="window.__pwned = true">',
      },
    ])

    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
    expect(document.querySelectorAll('.innfo-cite-excerpt img')).toHaveLength(0)
    expect(document.querySelector('.innfo-cite-excerpt')!.textContent).toContain('<img src=x onerror=')
  })
})
