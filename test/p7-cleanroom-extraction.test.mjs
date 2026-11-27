#!/usr/bin/env node

/**
 * test/p7-cleanroom-extraction.test.mjs
 *
 * Acceptance test for Phase P7 (Extraction under D10/D11/D14):
 * Deleting the local blueprint package from a domain and re-installing from
 * its distribution source reproduces the domain exactly, byte for byte,
 * on a machine that never had it.
 */

import assert from 'node:assert'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { diffBlueprintTree, blueprintVerdict } from '../scripts/lib/blueprint-provenance.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

function collectFileHashes(dir) {
  const hashes = {}
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (entry.isFile()) {
        const rel = path.relative(dir, full).replace(/\\/g, '/')
        hashes[rel] = sha256(full)
      }
    }
  }
  walk(dir)
  return hashes
}

const domainDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p7-cleanroom-'))

try {
  console.log('Phase P7 clean-room acceptance test starting at:', domainDir)

  // 1. Initialize domaiNN_NN.md
  fs.writeFileSync(
    path.join(domainDir, 'domaiNN_NN.md'),
    `---
level: 3
parent_spec:
  name: "domaiNN"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md"
knowledge_version: "V_0-1-0"
blueprint_version: "V_0-1-0"
title: "Extraction Cleanroom Domain"
workspace_id: "extraction-cleanroom"
---

# NN domaiNN
## NN domaiNN: Extraction Cleanroom Domain
blueprints_dir:: specs/bluepriNNts/
`,
  )

  const blueprintsDir = path.join(domainDir, 'specs', 'bluepriNNts')
  const blueprintDest = path.join(blueprintsDir, 'coNNtent')
  const blueprintSrc = path.join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'coNNtent')

  // 2. Initial installation of coNNtent blueprint
  fs.mkdirSync(blueprintsDir, { recursive: true })
  fs.cpSync(blueprintSrc, blueprintDest, { recursive: true })

  // 3. Compute baseline file hashes and digests map
  const baselineHashes = collectFileHashes(blueprintDest)
  const fileCount = Object.keys(baselineHashes).length
  assert.ok(fileCount > 10, `Expected coNNtent to contain many files, found ${fileCount}`)
  console.log(`Initial install: ${fileCount} files installed and hashed.`)

  // 4. Record provenance lock
  const lock = {
    blueprints: {
      coNNtent: {
        version: 'V_0-32-6',
        tag: 'blueprints-v0.104.0',
        commit: '175748b29546082fe6612b0b8e80c08218c1d42f',
        distribution_url:
          'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/coNNtent',
        digests: baselineHashes,
      },
    },
  }
  fs.writeFileSync(path.join(blueprintsDir, '.blueprint-lock.json'), JSON.stringify(lock, null, 2))

  // 5. Verify initial provenance verdict reports current
  const mockDeps = {
    fetchString: async (url) => {
      if (url.endsWith('versions.json')) {
        return JSON.stringify({
          name: 'coNNtent',
          versions: [
            {
              version: 'V_0-32-6',
              tag: 'blueprints-v0.104.0',
              commit: '175748b29546082fe6612b0b8e80c08218c1d42f',
            },
          ],
        })
      }
      if (url.endsWith('blueprint.json')) {
        return JSON.stringify({
          name: 'coNNtent',
          version: 'V_0-32-6',
          format_version: 'V_0-5-0',
          distribution_url:
            'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/coNNtent',
        })
      }
      throw new Error(`Unexpected fetch URL: ${url}`)
    },
  }

  const initialVerdict = await blueprintVerdict(
    { blueprintsDir, installedDir: blueprintDest, name: 'coNNtent' },
    mockDeps,
  )
  assert.strictEqual(initialVerdict.status, 'current', 'Initial verdict must be current')
  const initialDiff = diffBlueprintTree(blueprintDest, baselineHashes)
  assert.strictEqual(initialDiff.modified, false, 'Initial tree must have no diff')
  console.log('Baseline verification passed: status is current, 0 differences.')

  // 6. Extraction / Deletion step: delete the local blueprint package entirely
  fs.rmSync(blueprintDest, { recursive: true, force: true })
  assert.strictEqual(fs.existsSync(blueprintDest), false, 'Blueprint directory must be deleted')
  console.log('Local blueprint deleted completely from domain.')

  // 7. Re-install step from distribution source
  fs.cpSync(blueprintSrc, blueprintDest, { recursive: true })
  assert.ok(fs.existsSync(blueprintDest), 'Blueprint directory must exist after re-install')
  console.log('Blueprint re-installed into clean domain.')

  // 8. Byte-for-byte verification
  const restoredHashes = collectFileHashes(blueprintDest)
  assert.strictEqual(
    Object.keys(restoredHashes).length,
    fileCount,
    'Restored file count must match original file count',
  )

  for (const [relPath, origHash] of Object.entries(baselineHashes)) {
    const newHash = restoredHashes[relPath]
    assert.strictEqual(
      newHash,
      origHash,
      `Byte-for-byte drift detected in restored file: ${relPath}`,
    )
  }
  console.log('Byte-for-byte verification passed: 100% identical hashes.')

  // 9. Re-verify provenance lock and diff verdict
  const finalVerdict = await blueprintVerdict(
    { blueprintsDir, installedDir: blueprintDest, name: 'coNNtent' },
    mockDeps,
  )
  assert.strictEqual(finalVerdict.status, 'current', 'Post-reinstall verdict must be current')
  const finalDiff = diffBlueprintTree(blueprintDest, baselineHashes)
  assert.strictEqual(finalDiff.modified, false, 'Post-reinstall tree must have 0 modifications')
  assert.strictEqual(finalDiff.differing.length, 0, 'No differing files allowed')

  console.log('Phase P7 clean-room acceptance test PASSED!')
} finally {
  fs.rmSync(domainDir, { recursive: true, force: true })
}
