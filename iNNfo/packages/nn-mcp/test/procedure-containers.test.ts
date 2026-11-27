import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { dispatchTool } from '../src/server.js'

/**
 * One document, several procedures: `procedure_start` addresses a sub-procedure as
 * `<doc>@<container-slug>`. A container asks only for the slots its own steps carry, and its
 * run reads back the same container, so its siblings never leak into it.
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
slots:
  - { name: episode, kind: value, required: false }
  - { name: voice, kind: value, required: true }
---

# NN Work

## NN Work: Plan
slug:: plan
step_type:: task

## NN Work: Name it
slug:: name-it
parent:: @plan
next:: @dry-run
step_type:: task
executor:: human

## NN Work: Dry run
slug:: dry-run
parent:: @plan
executor:: engine
command:: node -e "process.exit(0)" {episode}

## NN Work: Produce
slug:: produce
step_type:: task

## NN Work: Clone
slug:: clone
parent:: @produce
executor:: engine
command:: node -e "process.exit(0)" {voice}
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

describe('procedure_start on a sub-procedure of a document', () => {
  it('starts one container asking only for its own slots', async () => {
    // `plan` carries `{episode}` only: the required `voice` belongs to its sibling `produce`.
    const started = await call('procedure_start', {
      procedure: `${DOC}@plan`,
      params: { episode: 'e1' },
    })
    expect(started['ok'], JSON.stringify(started)).toBe(true)
    const state = await call('procedure_state', { run: started['run'] })
    expect(state['ok'], JSON.stringify(state)).toBe(true)
    expect(JSON.stringify(state)).not.toContain('clone')
  })

  it('still asks for the slot a container does carry', async () => {
    const refused = await call('procedure_start', { procedure: `${DOC}@produce` })
    expect(refused).toMatchObject({ ok: false, code: 'MISSING_REQUIRED_SLOT' })
    expect(refused['missing']).toEqual(['voice'])
  })

  it('names the run after the document and the container', async () => {
    const started = await call('procedure_start', {
      procedure: `${DOC}@produce`,
      params: { voice: 'ana' },
    })
    expect(started['ok'], JSON.stringify(started)).toBe(true)
    expect(started['run']).toMatch(/^guide-produce-/)
  })

  it('refuses a container the document does not hold', async () => {
    const refused = await call('procedure_start', { procedure: `${DOC}@ghost` })
    expect(refused).toMatchObject({ ok: false, code: 'PROCEDURE_NOT_FOUND' })
  })

  it('keeps refusing the whole document, which holds two procedures', async () => {
    const refused = await call('procedure_start', { procedure: DOC })
    expect(refused['ok']).toBe(false)
  })
})
