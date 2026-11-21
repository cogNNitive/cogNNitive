import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/**
 * scripts/pr-overlap.mjs — the collision check that replaced `openspec/claims/`.
 *
 * Every case feeds the two inputs the tool takes on the command line (the branch's
 * changed paths and the open-PR JSON), so nothing here needs a git repository or a
 * network: the judgement is the only thing under test.
 */

const SCRIPT = join(import.meta.dirname, '..', 'scripts', 'pr-overlap.mjs')

/** @param {string[]} changed @param {unknown[]} prs @param {string[]} extra */
function run(changed, prs, extra = []) {
  const dir = mkdtempSync(join(tmpdir(), 'pr-overlap-'))
  const pathsFile = join(dir, 'paths.txt')
  const prsFile = join(dir, 'prs.json')
  writeFileSync(pathsFile, changed.join('\n'))
  writeFileSync(prsFile, JSON.stringify(prs))
  const res = spawnSync(
    process.execPath,
    [SCRIPT, '--paths', pathsFile, '--prs', prsFile, '--branch', 'session/mine', ...extra],
    { encoding: 'utf-8' },
  )
  return { code: res.status, out: `${res.stdout}${res.stderr}` }
}

describe('pr-overlap: a hand-written file shared with an open branch blocks', () => {
  it('exits 1 and names the file and the PR', () => {
    const { code, out } = run(
      ['iNNfo/specs/bluepriNNts/console/nn-runtime.js'],
      [
        {
          number: 761,
          headRefName: 'session/other',
          files: [{ path: 'iNNfo/specs/bluepriNNts/console/nn-runtime.js' }],
        },
      ],
    )
    assert.equal(code, 1)
    assert.match(out, /BLOCKING/)
    assert.match(out, /nn-runtime\.js/)
    assert.match(out, /#761/)
  })

  it('ignores the branch it is standing on', () => {
    const { code, out } = run(
      ['iNNfo/specs/bluepriNNts/console/nn-runtime.js'],
      [
        {
          number: 900,
          headRefName: 'session/mine',
          files: [{ path: 'iNNfo/specs/bluepriNNts/console/nn-runtime.js' }],
        },
      ],
    )
    assert.equal(code, 0)
    assert.match(out, /no other open PR/)
  })
})

describe('pr-overlap: a generated artifact shared with an open branch is mechanical', () => {
  it('exits 0 and labels the artifact instead of blocking', () => {
    const { code, out } = run(
      [
        'iNNfo/specs/bluepriNNts/catalog.json',
        'iNNfo/packages/nn-mcp/package.json',
        'test/fixtures/testlab/domaiNN_console.html',
      ],
      [
        {
          number: 762,
          headRefName: 'session/other',
          files: [
            { path: 'iNNfo/specs/bluepriNNts/catalog.json' },
            { path: 'iNNfo/packages/nn-mcp/package.json' },
            { path: 'test/fixtures/testlab/domaiNN_console.html' },
          ],
        },
      ],
    )
    assert.equal(code, 0)
    assert.match(out, /MECHANICAL/)
    assert.match(out, /blueprint catalog/)
    assert.match(out, /version metadata/)
    assert.match(out, /console export/)
    assert.doesNotMatch(out, /BLOCKING/)
  })

  it('never treats a hand-written source file as mechanical', () => {
    const { code } = run(
      ['iNNfo/packages/nn-mcp/src/tools/procedure-runner.ts'],
      [
        {
          number: 764,
          headRefName: 'session/other',
          files: ['iNNfo/packages/nn-mcp/src/tools/procedure-runner.ts'],
        },
      ],
    )
    assert.equal(code, 1)
  })
})

describe('pr-overlap: unverifiable is not clean', () => {
  it('exits 2 when the pull request list cannot be read', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pr-overlap-'))
    const pathsFile = join(dir, 'paths.txt')
    writeFileSync(pathsFile, 'README.md')
    const res = spawnSync(
      process.execPath,
      [SCRIPT, '--paths', pathsFile, '--prs', join(dir, 'missing.json'), '--branch', 'x'],
      { encoding: 'utf-8' },
    )
    assert.equal(res.status, 2)
    assert.match(`${res.stdout}${res.stderr}`, /nothing was verified/)
  })
})

describe('pr-overlap: --json', () => {
  it('separates the two classes for a caller that wants to decide', () => {
    const { code, out } = run(
      ['README.md', 'iNNfo/specs/bluepriNNts/catalog.json'],
      [
        {
          number: 42,
          headRefName: 'session/other',
          files: [{ path: 'README.md' }, { path: 'iNNfo/specs/bluepriNNts/catalog.json' }],
        },
      ],
      ['--json'],
    )
    assert.equal(code, 1)
    const payload = JSON.parse(out)
    assert.deepEqual(
      payload.blocking.map((entry) => entry.path),
      ['README.md'],
    )
    assert.deepEqual(
      payload.mechanical.map((entry) => entry.label),
      ['blueprint catalog'],
    )
  })
})
