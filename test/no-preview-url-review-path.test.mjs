import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')

// S6: changes are reviewed in the static domain console (a file), never in a hosted
// app or a live-preview URL. The S6 tools, the exporter and the user-facing docs
// must not name a preview URL as the place to review changes.
const S6_FILES = [
  'iNNfo/packages/innfo-mcp/src/tools/console-regeneration.ts',
  'iNNfo/packages/innfo-mcp/src/tools/propose-changeset.ts',
  'iNNfo/packages/innfo-mcp/src/tools/init-domain.ts',
  'iNNfo/packages/innfo-mcp/src/tools/init-knowledge.ts',
  'iNNfo/packages/innfo-mcp/README.md',
  'scripts/export-console.mjs',
  'skills/nn-innfo/SKILL.md',
]

const FORBIDDEN = /PREVIEW_APP_URL|preview_app_url|INNFO_PREVIEW|live[- ]preview|hosted app|cognnitive[.]com[/]innfo[/]app/i

describe('no preview-URL review path in S6 code and docs', () => {
  for (const rel of S6_FILES) {
    it(rel + ' does not point at a hosted app or live-preview URL', () => {
      const text = readFileSync(join(repoRoot, rel), 'utf8')
      const hit = FORBIDDEN.exec(text)
      assert.equal(hit, null, hit ? rel + ' mentions "' + hit[0] + '"' : '')
    })
  }
})
