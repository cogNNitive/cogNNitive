import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(here, '..', 'scripts', 'export-console.mjs')

const MODEL = `---
title: "M"
knowledge_version: "V_1-0-0"
level: 3
---

# NN Item
## NN Item: Alpha
  slug:: alpha
  note:: "a"
`

const CHANGESET = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "V_0-2-0"
status: proposed
title: "Proposed CS"
---

# NN Change

## NN Change: c-01
op:: comment
target:: m@alpha&note
notes:: "please review"
`

describe('Changes view (--domain)', () => {
  let root
  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-changes-view-'))
    await mkdir(join(root, 'models'), { recursive: true })
    await mkdir(join(root, 'changes'), { recursive: true })
    await writeFile(join(root, 'models', 'm_V_1-0-0_NN.md'), MODEL, 'utf-8')
    await writeFile(join(root, 'changes', 'a_reviewer_1_changes_NN.md'), CHANGESET, 'utf-8')
    await execFileAsync(process.execPath, [scriptPath, root, '--domain'], {
      maxBuffer: 64 * 1024 * 1024,
    })
  })

  after(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('ships the read-only Changes view and lists it in the header', async () => {
    const html = await readFile(join(root, 'domaiNN_console.html'), 'utf-8')
    assert.match(html, /console-view-changes/, 'the changes blueprint view is inlined')
    const header = html.match(/<!-- innfo-views[\s\S]*?-->/)[0]
    assert.match(header, /console-view-changes/, 'the header lists the Changes view')
    // Read-only: it registers no editable draft surface.
    assert.match(html, /kind:\s*'readonly'/)
  })
})
