import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { bootConsole, consoleDir, nnConsole } from './helpers/console-boot.mjs'

const require = createRequire(import.meta.url)
const { buildConsoleBundle } = require('../scripts/lib/console-bundle.js')

const repoRoot = join(consoleDir, '..', '..', '..', '..')

describe('the console starts in a sandboxed iframe (issue #779)', () => {
  it('renders with an in-memory store when reading localStorage throws', () => {
    // An iframe without `allow-same-origin` throws on the storage read, which is
    // what killed boot: the guard around it evaluates the same throwing getter.
    const { document, dom } = bootConsole({ sandboxedStorage: true })
    assert.equal(
      document.querySelectorAll('#nn-feedback-open').length,
      1,
      'the console rendered its feedback action',
    )
    document.getElementById('nn-feedback-open').click()
    const modal = document.getElementById('nn-feedback-modal')
    assert.ok(modal && modal.hasAttribute('open'), 'the draft store works with no storage at all')
    dom.window.close()
  })

  it('does not throw when the reviewer name is read or written without storage', () => {
    const { dom } = bootConsole({ sandboxedStorage: true })
    assert.doesNotThrow(() => nnConsole.getReviewerName())
    assert.doesNotThrow(() => nnConsole.setReviewerName('ada'))
    dom.window.close()
  })

  it('still persists the reviewer name when storage is available', () => {
    const { dom } = bootConsole()
    nnConsole.setReviewerName('ada')
    assert.equal(dom.window.localStorage.getItem(nnConsole.REVIEWER_STORAGE_KEY), 'ada')
    assert.equal(nnConsole.getReviewerName(), 'ada')
    dom.window.close()
  })

  it('never guards web storage behind typeof in the bundled runtime', () => {
    const bundle = buildConsoleBundle(repoRoot)
    const guarded = bundle.match(/typeof\s+(?:window\.)?(?:localStorage|sessionStorage)/g) || []
    assert.deepEqual(
      guarded,
      [],
      'typeof evaluates the getter, so it cannot guard a storage read that throws; use a try/catch',
    )
  })
})
