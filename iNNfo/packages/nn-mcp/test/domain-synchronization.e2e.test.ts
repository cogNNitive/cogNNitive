import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  buildChangeLog,
  readLineageSnapshot,
  type ReferenceDiagnostic,
  type SpecCache,
} from '@cognnitive/nn-core'
import { collectWorkspaceDiagnostics } from '../src/tools/validate.js'

/**
 * End to end: an Organization-like domaiNN is synchronized into a Procedures-like one
 * through the real `nn-sources --sync` CLI, and the consumer points at a mirrored
 * element with a `reference` field in the path form. A rename at the origin must break
 * the link visibly after the next refresh, and restoring the slug must clear it.
 */

const SKILL_CLI = path.resolve(import.meta.dirname!, '..', '..', '..', '..', 'skills', 'nn-sources', 'scripts', 'index.js')
const MIRROR_ADDRESS = 'sources/sync/org/organization_NN.md@gerente'

const sha256 = (bytes: string | Buffer): string => createHash('sha256').update(bytes).digest('hex')

const organization = (slugTitle: string): string => `---
level: 3
parent_spec:
  name: organization_V_0-1-0
knowledge_version: "V_0-1-0"
title: "Organization"
---

# NN Role

## NN Role: ${slugTitle}
`

const CHANGESET = `---
spec_version: "V_0-5-0"
level: 3
parent_spec:
  name: changes
  url: "https://example.test/changes/spec_NN.md"
blueprint_version: "0.1.0"
status: applied
author: "lucas"
applied_at: "2026-10-10T12:00:00.000Z"
---

# NN Change

## NN Change: copied-01
op:: update_field
target:: organization@gerente&name
to:: Ana
evidence:: decision
`

const PROCEDURES_BLUEPRINT = `---
spec_version: "V_0-4-0"
level: 2
blueprint_version: "0.1.0"
blueprint_name: "procedures"
title: "Procedures"
parent_spec:
  name: "iNNfo_V_0-3-0"
  url: "specs/iNNfo_V_0-3-0_NN.md"
---

# NN Concept Definition
## NN Concept Definition: Procedure
type:: list

# NN Field Definition
## NN Field Definition: responsable
concept:: Procedure
type:: reference
`

const CONSUMER_MODEL = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "procedures_V_0-1-0"
  url: "specs/procedures_V_0-1-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Procedures"
---

# NN index
* [[Procedure]]

# NN Procedure
## NN Procedure: Approve budget
responsable:: ${MIRROR_ADDRESS}
`

const CATALOG = (origin: string): string => `---
level: 3
title: "Sources"
---

# NN Synchronization

## NN Synchronization: Organization
alias:: org
origin_uri:: ${origin.replace(/\\/g, '/')}
kind:: folder
state:: active
`

const cache: SpecCache = {
  specs: new Map([
    [
      'procedures_V_0-1-0',
      {
        name: 'procedures_V_0-1-0',
        level: 2,
        frontmatter: {},
        rawContent: PROCEDURES_BLUEPRINT,
      } as unknown as SpecCache['specs'] extends Map<string, infer D> ? D : never,
    ],
  ]),
  chain: [],
}

let root: string
let origin: string

const put = (base: string, rel: string, content: string): void => {
  fs.mkdirSync(path.dirname(path.join(base, rel)), { recursive: true })
  fs.writeFileSync(path.join(base, rel), content)
}
const read = (base: string, rel: string): string => fs.readFileSync(path.join(base, rel), 'utf-8')

/** Runs `nn-sources --sync org` and returns the printed `propose_changeset` payload, if any. */
function sync(): { status: number | null; stdout: string; payload: { tool: string; arguments: { operations: Array<Record<string, string>> } } | null } {
  const run = spawnSync(process.execPath, [SKILL_CLI, '--src', root, '--sync', 'org'], { encoding: 'utf-8' })
  const out = run.stdout
  const start = out.indexOf('{')
  const end = out.lastIndexOf('}')
  const payload = start >= 0 && end > start ? JSON.parse(out.slice(start, end + 1)) : null
  return { status: run.status, stdout: out + run.stderr, payload }
}

const referenceErrors = async (): Promise<ReferenceDiagnostic[]> =>
  (await collectWorkspaceDiagnostics(root, cache)).filter((d) => d.code?.startsWith('REF_') || d.code === 'ADDRESS_MALFORMED')

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-sync-e2e-root-'))
  origin = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-sync-e2e-origin-'))
  put(origin, 'organization_NN.md', organization('Gerente'))
  put(origin, 'changes/org_agent_20261010T120000Z_changes_NN.md', CHANGESET)
  put(root, 'domaiNN_NN.md', '---\nlevel: 3\ntitle: "Procedures domain"\n---\n\n# NN index\n\n* [Procedures](./kNNowledge/procedures_NN.md)\n')
  put(root, 'kNNowledge/procedures_NN.md', CONSUMER_MODEL)
  put(root, 'sources/sources_NN.md', CATALOG(origin))
})

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true })
  fs.rmSync(origin, { recursive: true, force: true })
})

describe('domain synchronization end to end', () => {
  it('validates a mirrored reference, breaks it on a rename at the origin and clears it when restored', async () => {
    const consumerBefore = sha256(read(root, 'kNNowledge/procedures_NN.md'))

    // 1. First refresh: the mirror lands and the reference validates.
    const first = sync()
    expect(first.status, first.stdout).toBe(0)
    expect(fs.existsSync(path.join(root, 'sources/sync/org/organization_NN.md'))).toBe(true)
    expect(await referenceErrors()).toEqual([])
    const firstShaOrg = sha256(read(root, 'sources/sync/org/organization_NN.md'))
    expect(first.payload?.arguments.operations[0]?.notes).toContain(firstShaOrg)

    // 2. Rename `gerente` at the origin and refresh: the link breaks on `responsable`.
    const beforeRename = sha256(read(root, 'sources/sync/org/organization_NN.md'))
    put(origin, 'organization_NN.md', organization('Director'))
    const renamed = sync()
    expect(renamed.status, renamed.stdout).toBe(0)
    const afterRename = sha256(read(root, 'sources/sync/org/organization_NN.md'))
    expect(afterRename).not.toBe(beforeRename)

    const broken = await referenceErrors()
    expect(broken.map((d) => d.code)).toEqual(['REF_ELEMENT_NOT_FOUND'])
    expect(broken[0]!.severity).toBe('error')
    expect(broken[0]!.path).toContain('procedures_NN.md')
    expect(broken[0]!.message).toContain('responsable')

    // 3. The printed payload records the before and after sha of the mirrored model.
    const op = renamed.payload!.arguments.operations[0]!
    expect(renamed.payload!.tool).toBe('propose_changeset')
    expect(renamed.payload!.arguments.operations).toHaveLength(1)
    expect(op.op).toBe('comment')
    expect(op.target).toBe('sources/sync/org')
    expect(op.evidence).toBe('decision')
    expect(op.notes).toContain(`${beforeRename} -> ${afterRename}`)

    // 4. Restoring the slug at the origin and refreshing clears the error.
    put(origin, 'organization_NN.md', organization('Gerente'))
    const restored = sync()
    expect(restored.status, restored.stdout).toBe(0)
    expect(restored.payload!.arguments.operations[0]!.notes).toContain(`${afterRename} -> ${beforeRename}`)
    expect(await referenceErrors()).toEqual([])

    // 5. The consumer's own models were never touched and nothing was written to changes/.
    expect(sha256(read(root, 'kNNowledge/procedures_NN.md'))).toBe(consumerBefore)
    expect(fs.existsSync(path.join(root, 'changes'))).toBe(false)
  })

  it('keeps a changeset copied under sources/ out of the change log', () => {
    expect(sync().status).toBe(0)
    // The origin's changeset is not mirrored; a hand-copied one must not count either.
    put(root, 'sources/sync/org/org_agent_20261010T120000Z_changes_NN.md', CHANGESET)
    put(root, 'sources/import/org/org_agent_20261010T120000Z_changes_NN.md', CHANGESET)

    const snapshot = readLineageSnapshot(root)
    expect(snapshot.map((s) => s.path).filter((p) => p.includes('changes_NN'))).toEqual([
      'sources/import/org/org_agent_20261010T120000Z_changes_NN.md',
    ])
    expect(buildChangeLog(snapshot).all).toEqual([])
  })
})
