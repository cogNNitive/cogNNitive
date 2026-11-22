import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const consoleDir = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console')

describe('the procedure view is self-contained (no global id)', () => {
  it('keeps every new rule inside the view block, with no global id', () => {
    const css = readFileSync(join(consoleDir, 'nn-ui.css'), 'utf8')
    // The view mounts into a container it does not own, so its rules are class-scoped.
    assert.ok(css.includes('.nn-procedure-view'), 'the view block exists')
    const viewRules = css
      .split('\n')
      .filter((l) => /proc-run|proc-ficha|proc-runs|dag-node\.current/.test(l) && l.includes('{'))
    for (const rule of viewRules) {
      assert.doesNotMatch(rule, /#/, `${rule.trim()} uses no id`)
    }
  })
})
