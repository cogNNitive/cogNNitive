import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')

// The Workspace Hub is retired (D14). Permanent history (archived changes, the
// SDD canonical spec store synced at archive time, refactor fixtures) and
// the maintainer logs are exempt; nothing else may name the hub.
const ALLOWLIST = [
  'openspec/changes/archive/',
  'openspec/changes/2026-10-09-domain-console-views/',
  'openspec/changes/2026-10-09-nn-procedure-executor/',
  'openspec/changes/2026-10-13-s3-domain-console-and-edit-modal/',
  'openspec/changes/2026-10-13-s5-retire-innfo-editor/',
  'openspec/changes/single-console-shell/',
  'openspec/specs/',
  'iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion/',
  'test/fixtures/testlab/',
  'simulation/FINDINGS.md',
  'simulation/results/',
  'openspec/backlog.md',
  'test/no-workspace-hub-references.test.mjs',
]

const DELETED = [
  'iNNfo/specs/bluepriNNts/workspace/assets/workspace_hub.html',
  'iNNfo/specs/bluepriNNts/workspace/procedures/compile_workspace_hub_NN.md',
  '_samples_nn/procedures/compile_workspace_hub_procedures_NN.md',
  'docs/innfo/documentation/workspace-console-hub.md',
  'iNNfo/packages/innfo-core/tests/workspace-hub.test.ts',
]

const NEEDLES = ['workspacehub', 'workspaceconsoleshub', 'workspaceconsolehub', 'consolehubview', 'compileworkspacehub', 'compilehub']
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function trackedFiles() {
  return execFileSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
}

describe('no workspace-hub references', () => {
  it('requires every hub file to be deleted', () => {
    for (const rel of DELETED) {
      assert.equal(existsSync(join(repoRoot, rel)), false, `${rel} must be deleted`)
    }
  })

  it('has no workspace-hub reference outside the allowlist', () => {
    const offenders = []
    for (const rel of trackedFiles()) {
      const posix = rel.replace(/\\/g, '/')
      if (ALLOWLIST.some((a) => posix.startsWith(a))) continue
      let text
      try {
        text = readFileSync(join(repoRoot, rel), 'utf8')
      } catch {
        continue
      }
      if (text.includes('\u0000')) continue
      const norm = normalize(text)
      for (const needle of NEEDLES) {
        if (norm.includes(needle)) {
          offenders.push(`${posix} (${needle})`)
          break
        }
      }
    }
    assert.deepEqual(offenders, [], 'workspace-hub references remain:\n' + offenders.join('\n'))
  })
})
