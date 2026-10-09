#!/usr/bin/env node

/**
 * scripts/build-skill-shared-rules.test.mjs
 *
 * Plain-node tests (zero deps) for scripts/build-skill-shared-rules.mjs —
 * the generator that mirrors the shared-rules source into the end-user
 * SKILL.md files under a `generated:shared-rules` region.
 *
 * Unit layer: the pure renderer selects exactly the mapped sections.
 * Integration layer: the CLI `--check` contract on a disposable fixture
 * tree (in-sync → 0, hand-edited → 1, missing markers → 2).
 */

import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import {
  renderSharedRules,
  parseSections,
  SECTION_IDS,
  SKILL_SECTION_MAP,
} from './build-skill-shared-rules.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const CLI = path.join(SCRIPT_DIR, 'build-skill-shared-rules.mjs')
const SOURCE = path.join(SCRIPT_DIR, 'skill-shared-rules.md')

const OPEN =
  '<!-- generated:shared-rules (source: scripts/skill-shared-rules.md; run node scripts/build-skill-shared-rules.mjs) -->'
const CLOSE = '<!-- /generated:shared-rules -->'

/** Reads and parses the canonical source once for the unit assertions. */
function realSections() {
  return parseSections(fs.readFileSync(SOURCE, 'utf8'))
}

function fixtureTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-shared-rules-test-'))
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true })
  fs.copyFileSync(SOURCE, path.join(root, 'scripts', 'skill-shared-rules.md'))
  for (const name of Object.keys(SKILL_SECTION_MAP)) {
    const dir = path.join(root, 'skills', name)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'SKILL.md'),
      `# ${name}\n\n${OPEN}\nSTALE HAND-EDITED BODY\n${CLOSE}\n`,
      'utf8',
    )
  }
  return root
}

function runCli(cwd, args = []) {
  return spawnSync(process.execPath, [CLI, '--root', '.', ...args], { cwd, encoding: 'utf-8' })
}

function readSkill(root, name) {
  return fs.readFileSync(path.join(root, 'skills', name, 'SKILL.md'), 'utf8')
}

function main() {
  console.log('Running build-skill-shared-rules tests...')

  // 1. Unit: every canonical rule id is present in the source.
  {
    const sections = realSections()
    for (const id of SECTION_IDS) {
      assert.ok(sections[id], `source must define a '## rule: ${id}' section`)
      assert.ok(sections[id].trim().length > 0, `rule '${id}' must have a non-empty body`)
    }
  }

  // 2. Unit: `nn` maps to governance + lifecycle only, never taxonomy/grace.
  {
    const nn = renderSharedRules(SKILL_SECTION_MAP.nn, realSections())
    assert.match(nn, /Zero Unilateral Mutation/)
    assert.match(nn, /Zero Discard/)
    assert.doesNotMatch(nn, /sidecar_NN\.md/)
    assert.doesNotMatch(nn, /Informative Grace/)
  }

  // 3. Triangulation: the full map (nn-innfo) DOES include taxonomy + grace.
  {
    const full = renderSharedRules(SKILL_SECTION_MAP['nn-innfo'], realSections())
    assert.match(full, /sidecar_NN\.md/)
    assert.match(full, /Informative Grace/)
  }

  // 4. Unit: rendering is byte-stable across two calls.
  {
    const sections = realSections()
    assert.strictEqual(
      renderSharedRules(SKILL_SECTION_MAP['nn-trannsform'], sections),
      renderSharedRules(SKILL_SECTION_MAP['nn-trannsform'], sections),
    )
  }

  // 5. Unit: an unknown section id is a hard error.
  {
    assert.throws(() => renderSharedRules(['not-a-rule'], realSections()), /not-a-rule/)
  }

  // 6. Integration: write mode renders the block, `--check` then passes (exit 0).
  {
    const root = fixtureTree()
    try {
      const write = runCli(root)
      assert.strictEqual(write.status, 0, `write mode must succeed: ${write.stderr}`)
      const content = readSkill(root, 'nn')
      assert.ok(
        content.includes('Zero Unilateral Mutation'),
        'write mode must render the mapped block',
      )
      assert.ok(
        !content.includes('STALE HAND-EDITED BODY'),
        'write mode must replace the stale body',
      )

      const check = runCli(root, ['--check'])
      assert.strictEqual(check.status, 0, `--check must pass right after a write: ${check.stderr}`)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  }

  // 7. Integration: a hand-edited region drifts (`--check` exit 1, reports DRIFT).
  {
    const root = fixtureTree()
    try {
      runCli(root)
      const target = path.join(root, 'skills', 'nn', 'SKILL.md')
      fs.writeFileSync(
        target,
        fs.readFileSync(target, 'utf8').replace('Zero Unilateral Mutation', 'NAUGHTY EDIT'),
        'utf8',
      )
      const check = runCli(root, ['--check'])
      assert.strictEqual(check.status, 1, `drift must exit 1: ${check.stderr}`)
      assert.match(check.stderr, /DRIFT/)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  }

  // 8. Integration: a target with no markers exits 2 and names the region.
  {
    const root = fixtureTree()
    try {
      fs.writeFileSync(
        path.join(root, 'skills', 'nn-innfo', 'SKILL.md'),
        '# nn-innfo\n\nno markers here\n',
        'utf8',
      )
      const res = runCli(root)
      assert.strictEqual(res.status, 2, `missing markers must exit 2: ${res.stderr}`)
      assert.match(res.stderr, /shared-rules/)
    } finally {
      fs.rmSync(root, { recursive: true, force: true })
    }
  }

  console.log('\nAll build-skill-shared-rules tests passed successfully!')
}

main()
