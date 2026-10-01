#!/usr/bin/env node
/**
 * scripts/build-console-payload.test.mjs
 *
 * Plain-node fixture test for scripts/build-console-payload.mjs --check.
 * Runs in scripts/verify.js step 0b.
 */

import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')
const scriptPath = join(repoRoot, 'scripts', 'build-console-payload.mjs')

function testMatchesGeneratedBundle() {
  const tempDir = mkdtempSync(join(tmpdir(), 'payload-mirror-test-'))
  const tempOut = join(tempDir, 'console-payload.generated.cjs')

  try {
    // Build to tempOut
    execFileSync('node', [scriptPath, '--out', tempOut], {
      cwd: repoRoot,
      encoding: 'utf8',
    })

    // Check against tempOut
    const output = execFileSync('node', [scriptPath, '--check', '--out', tempOut], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
    assert.match(output, /matches generated bundle/)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function testExits1OnStaleMirror() {
  const tempDir = mkdtempSync(join(tmpdir(), 'payload-mirror-stale-'))
  const tempOut = join(tempDir, 'console-payload.generated.cjs')

  try {
    writeFileSync(tempOut, '/* stale content */', 'utf8')

    let threw = false
    let errOutput = ''
    try {
      execFileSync('node', [scriptPath, '--check', '--out', tempOut], {
        cwd: repoRoot,
        encoding: 'utf8',
      })
    } catch (err) {
      threw = true
      errOutput = (err.stderr || '') + (err.stdout || '')
    }

    assert.strictEqual(threw, true, 'Should have failed with exit code 1')
    assert.ok(errOutput.includes(tempOut), `Error output should name the stale file: ${errOutput}`)
    assert.match(errOutput, /Drift detected/, 'Error output should describe drift')
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

function testSlugMirrorCheck() {
  const tempDir = mkdtempSync(join(tmpdir(), 'payload-slug-test-'))
  const tempOut = join(tempDir, 'console-payload.generated.cjs')
  const tempSlugOut = join(tempDir, 'innfo-slug.generated.js')

  try {
    execFileSync('node', [scriptPath, '--out', tempOut, '--slug-out', tempSlugOut], {
      cwd: repoRoot,
      encoding: 'utf8',
    })

    const output = execFileSync('node', [scriptPath, '--check', '--out', tempOut, '--slug-out', tempSlugOut], {
      cwd: repoRoot,
      encoding: 'utf8',
    })
    assert.match(output, /matches generated bundle/)

    // Corrupt slug file
    writeFileSync(tempSlugOut, '/* stale slug */', 'utf8')
    let threw = false
    try {
      execFileSync('node', [scriptPath, '--check', '--out', tempOut, '--slug-out', tempSlugOut], {
        cwd: repoRoot,
        encoding: 'utf8',
      })
    } catch {
      threw = true
    }
    assert.strictEqual(threw, true, 'Corrupted slug output should fail --check')
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

console.log('▶ Testing build-console-payload.mjs --check (matches generated bundle)')
testMatchesGeneratedBundle()
console.log('✔ Passed')

console.log('▶ Testing build-console-payload.mjs --check (exits 1 on stale mirror)')
testExits1OnStaleMirror()
console.log('✔ Passed')

console.log('▶ Testing build-console-payload.mjs --check (slug mirror check)')
testSlugMirrorCheck()
console.log('✔ Passed')

