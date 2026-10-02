// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')

describe('console-review-tab (shell CSS + DraftList)', () => {
  beforeEach(() => {
    ;(globalThis as any).__innfoNoAutoBoot = true
    localStorage.clear()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    ;(globalThis as any).__innfoNoAutoBoot = false
    vi.restoreAllMocks()
  })

  it('artifact_shell.html no longer carries legacy .innfo-review-* CSS rules', () => {
    const shell = readFileSync(join(consoleDir, 'artifact_shell.html'), 'utf8')
    const styleBlocks = shell.match(/<style[\s\S]*?<\/style>/gi) || []
    const css = styleBlocks.join('\n')
    expect(css.includes('.innfo-review-item')).toBe(false)
    expect(css.includes('.innfo-review-stat')).toBe(false)
    expect(css.includes('.innfo-review-list')).toBe(false)
  })

  it('renderReviewTab renders through InnfoUI.DraftList', () => {
    delete (globalThis as any).InnfoUI
    delete (globalThis as any).InnfoReview
    delete (globalThis as any).InnfoConsole
    for (const f of ['ui-kit.js', 'review.js', 'innfo-runtime.js']) {
      delete req.cache[req.resolve(join(consoleDir, f))]
    }
    ;(globalThis as any).InnfoUI = req(join(consoleDir, 'ui-kit.js'))
    ;(globalThis as any).InnfoReview = req(join(consoleDir, 'review.js'))
    const Console = req(join(consoleDir, 'innfo-runtime.js'))

    const host = document.createElement('div')
    host.id = 'innfo-tab-review'
    document.body.appendChild(host)

    const Review = (globalThis as any).InnfoReview
    const store = Review.createDraftStore(localStorage, 'm1')
    store.addDraft({
      element_id: 'e1',
      concept: 'C',
      element: 'E1',
      base_hash: 'abcdef0123456789',
      kind: 'comment',
      comment: 'hi',
    })
    Console.renderReviewTab(document, { store }, { needs: [] })

    expect(host.querySelector('[data-innfo-component="draft-list"]')).not.toBeNull()
  })
})
