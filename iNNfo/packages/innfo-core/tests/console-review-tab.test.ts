// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createConsoleEnv, consoleDir } from './helpers/console-review-env'

const env = createConsoleEnv()

describe('console-review-tab (shell CSS + DraftList)', () => {
  beforeEach(() => {
    env.setup('<!doctype html><html><head></head><body></body></html>')
    env.localStorage.clear()
  })

  afterEach(() => {
    env.teardown()
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
    const { Review, Console } = env.loadConsole()

    const host = env.document.createElement('div')
    host.id = 'innfo-tab-review'
    env.document.body.appendChild(host)

    const store = Review.createDraftStore(env.localStorage, 'm1')
    store.addDraft({
      element_id: 'e1',
      concept: 'C',
      element: 'E1',
      base_hash: 'abcdef0123456789',
      kind: 'comment',
      comment: 'hi',
    })
    Console.renderReviewTab(env.document, { store }, { needs: [] })

    expect(host.querySelector('[data-innfo-component="draft-list"]')).not.toBeNull()
  })
})
