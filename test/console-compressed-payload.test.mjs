// The exported console carries its payload compressed: `nn-model` holds the model JSON
// as deflate-raw (level 9) + base64 in a non-executable script, and the drafts and UI
// state live apart in the plain JSON `nn-drafts` slot an agent reads straight from the
// HTML. These tests pin the export side of that contract and the size gate's measure;
// the runtime side (decode at boot, save, reopen) is pinned by console-bundle-render and
// console-quine-export.
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import {
  CONSOLE_MODEL_SLOT_TYPE,
  decodeConsoleModelText,
  encodeConsoleModel,
  readConsoleModel,
  runExportConsole,
} from '../scripts/export-console.mjs'
import { draftsOf, modelOf, slotTextOf } from './helpers/console-slots.mjs'

const MODEL = `---
title: "Compressed Domain"
model_version: "V_1-0-0"
level: 3
---

# NN Stakeholders
## NN Stakeholders: Enterprise
  slug:: enterprise
  summary:: "A </script><script>alert(1)</script> summary that must stay data"

## NN Stakeholders: Startup
  slug:: startup
  summary:: "Small"
`

const bytes = (text) => Buffer.byteLength(text, 'utf8')

describe('the exported console compresses its model slot', () => {
  let root
  let html
  let first

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-compressed-'))
    await mkdir(join(root, 'models'), { recursive: true })
    await writeFile(join(root, 'models', 'business_V_1-0-0_NN.md'), MODEL, 'utf-8')
    first = await runExportConsole([root, '--domain', '--no-open'], { open: false })
    assert.equal(first.exitCode, 0, first.stderr)
    html = await readFile(join(root, 'domaiNN_console.html'), 'utf-8')
  })

  after(async () => {
    if (root) await rm(root, { recursive: true, force: true })
  })

  it('writes nn-model as deflate-raw + base64 in a non-JSON script type', () => {
    assert.equal(CONSOLE_MODEL_SLOT_TYPE, 'application/x-nn-deflate-base64')
    assert.ok(html.includes(`<script type="${CONSOLE_MODEL_SLOT_TYPE}" id="nn-model">`), 'the slot declares the codec type')
    assert.equal(html.includes('<script type="application/json" id="nn-model">'), false, 'no plain JSON model slot')
    const body = slotTextOf(html, 'nn-model').trim()
    assert.match(body, /^[A-Za-z0-9+/]+=*$/, 'the body is one base64 line')
    // The body is raw deflate: zlib inflates it with no gzip or zlib header.
    const model = JSON.parse(inflateRawSync(Buffer.from(body, 'base64')).toString('utf8'))
    assert.deepEqual(
      model.elements.map((e) => e.slug).sort(),
      ['enterprise', 'startup'],
      'it decodes to the exported model',
    )
    assert.ok(model.meta.models.some((m) => m.filePath === 'models/business_V_1-0-0_NN.md'))
    assert.equal(model.drafts, undefined, 'the model carries no drafts')
    assert.equal(model.uiState, undefined, 'the model carries no UI state')
    const summary = model.elements.find((e) => e.slug === 'enterprise').fields.summary
    assert.match(summary, /<\/script><script>alert\(1\)<\/script>/, 'markup stays data inside the compressed payload')
  })

  it('writes an empty nn-drafts plain JSON slot an agent can read', () => {
    assert.match(html, /<script type="application\/json" id="nn-drafts">\s*\{\}\s*<\/script>/)
    assert.deepEqual(draftsOf(html), {})
  })

  it('gives the compressed slot no CSP hash, because it never executes', () => {
    const csp = /http-equiv="Content-Security-Policy"\s+content="([^"]*)"/.exec(html)
    assert.ok(csp, 'the page declares a CSP')
    const hashes = csp[1].match(/'sha256-[^']+'/g) || []
    const executable = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/)[^>]*>/g)]
    assert.equal(hashes.length, executable.length, 'one hash per executable inline script, none for data slots')
  })

  it('encodes byte-identically for the same model (deterministic deflate-raw)', () => {
    const model = modelOf(html)
    const a = encodeConsoleModel(model)
    const b = encodeConsoleModel(JSON.parse(JSON.stringify(model)))
    assert.equal(a, b)
    assert.deepEqual(JSON.parse(decodeConsoleModelText(a)), model, 'and decodes back to the same model')
    assert.deepEqual(readConsoleModel(html), model, 'the exporter reads its own slot back')
  })

  it('reports a second export of the same input as unchanged, byte for byte', async () => {
    const second = await runExportConsole([root, '--domain', '--no-open'], { open: false })
    assert.equal(second.exitCode, 0, second.stderr)
    assert.match(second.stdout, /domaiNN_console\.html unchanged/)
    assert.equal(await readFile(join(root, 'domaiNN_console.html'), 'utf-8'), html)
  })

  it('measures models in the size gate as the bytes of the schema slot plus the compressed model slot', () => {
    const reported = Number(/models (\d+) B/.exec(first.stdout)?.[1])
    const expected = bytes(slotTextOf(html, 'nn-schema').trim()) + bytes(slotTextOf(html, 'nn-model').trim())
    assert.equal(reported, expected)
    assert.ok(
      reported < bytes(JSON.stringify(modelOf(html))) + bytes(slotTextOf(html, 'nn-schema').trim()),
      'the measure is the compressed payload, not the raw JSON',
    )
  })

  it('does not read a plain JSON model slot as a current console, and rewrites it on export', async () => {
    const file = join(root, 'domaiNN_console.html')
    await writeFile(file, html.replace(/(id="nn-model">)[\s\S]*?(<\/script>)/, '$1\n{"meta":{}}\n$2'), 'utf-8')
    assert.equal(readConsoleModel(await readFile(file, 'utf-8')), null, 'plain JSON is not a readable slot')
    const status = await runExportConsole([root, '--status'], { open: false })
    assert.equal(status.exitCode, 0, status.stderr)
    assert.doesNotMatch(status.stdout, /Domain console: .* \[fresh\]/)

    const res = await runExportConsole([root, '--domain', '--no-open'], { open: false })
    assert.equal(res.exitCode, 0, res.stderr)
    assert.doesNotMatch(res.stdout, /unchanged/, 'the old file is replaced')
    assert.ok(readConsoleModel(await readFile(file, 'utf-8')), 'in the compressed format')
  })
})
