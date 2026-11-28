import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { dispatchTool } from '../src/server.js'

/**
 * A run walks a whole procedure document: the document is the container, so a
 * `<doc>@<container>` address is not a procedure, and a document whose Procedure header has
 * no steps is declared, never started.
 */

const REPO = join(import.meta.dirname!, '..', '..', '..', '..')
const FIXTURE = join(import.meta.dirname!, 'fixtures', 'procedure-runner')
const EXECUTIONS_SPEC = join(REPO, 'iNNfo', 'specs', 'bluepriNNts', 'executions', 'spec_NN.md')
const DOC = 'procedures/guide_procedures_NN.md'

const GUIDE = `---
level: 3
parent_spec:
  name: "procedures_V_0-7-0"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Guide"
---

# NN Procedure

## NN Procedure: Guide
slug:: guide
summary:: Plans and dry-runs an episode.

### NN Work: Name it
slug:: name-it
next:: @dry-run
step_type:: task
executor:: human

### NN Work: Dry run
slug:: dry-run
executor:: engine
command:: node -e "process.exit(0)"
`

const DECLARED_DOC = 'procedures/rfp_procedures_NN.md'
const DECLARED = `---
level: 3
parent_spec:
  name: "procedures_V_0-7-0"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "RFP"
---

# NN Procedure

## NN Procedure: Answer an RFP
slug:: answer-an-rfp
summary:: Answers a request for proposal.
`

const scratch: string[] = []
let root: string

beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'nn-containers-')))
  scratch.push(root)
  cpSync(FIXTURE, root, { recursive: true })
  mkdirSync(join(root, 'specs', 'bluepriNNts', 'executions'), { recursive: true })
  cpSync(EXECUTIONS_SPEC, join(root, 'specs', 'bluepriNNts', 'executions', 'spec_NN.md'))
  writeFileSync(join(root, DOC), GUIDE)
  writeFileSync(join(root, DECLARED_DOC), DECLARED)
  process.env.INNFO_CACHE_DIR = join(root, '.cache')
  process.env.INNFO_GLOBAL_DIR = join(root, '.global')
  process.env.INNFO_SKILLS_DIR = join(root, '.skills')
  vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network disabled in tests'))
})

afterEach(() => {
  delete process.env.INNFO_CACHE_DIR
  delete process.env.INNFO_GLOBAL_DIR
  delete process.env.INNFO_SKILLS_DIR
  vi.restoreAllMocks()
  for (const d of scratch.splice(0)) rmSync(d, { recursive: true, force: true })
})

type Json = Record<string, any>

async function call(name: string, args: Json = {}): Promise<Json> {
  const res = await dispatchTool(name, { domain: root, ...args })
  return JSON.parse((res.content[0] as { text: string }).text) as Json
}

describe('procedure_start on a procedure document', () => {
  it('walks the whole document from the step with no incoming next', async () => {
    const started = await call('procedure_start', { procedure: DOC })
    expect(started['ok'], JSON.stringify(started)).toBe(true)
    expect(started['run']).toMatch(/^guide-/)
    const state = await call('procedure_state', { run: started['run'] })
    expect(state['ok'], JSON.stringify(state)).toBe(true)
    expect(JSON.stringify(state)).toContain('name-it')
    expect(JSON.stringify(state)).toContain('dry-run')
  })

  it('refuses a <doc>@<container> address and writes nothing', async () => {
    const refused = await call('procedure_start', { procedure: `${DOC}@name-it` })
    expect(refused).toMatchObject({ ok: false, code: 'PROCEDURE_NOT_FOUND' })
    expect(existsSync(join(root, 'executions'))).toBe(false)
  })

  it('refuses a declared procedure with PROCEDURE_NOT_IMPLEMENTED and writes nothing', async () => {
    const refused = await call('procedure_start', { procedure: DECLARED_DOC })
    expect(refused).toMatchObject({ ok: false, code: 'PROCEDURE_NOT_IMPLEMENTED' })
    expect(existsSync(join(root, 'executions'))).toBe(false)
  })
})
