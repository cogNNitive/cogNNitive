import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { applyChange } from '../src/tools/apply-change.js'
import { computeProposalSha, serializeChangeset, parseChangeset } from '@cognnitive/nn-core'
import type { ChangesetDocument, ChangeItem } from '@cognnitive/nn-core'

/**
 * Declared transitions enforced at apply (iNNfo V_0-9-0, design D6):
 * a `select` field whose Field Definition declares `transitions` moves only along a
 * declared edge, and only a new write is checked — history that predates the
 * declaration stays valid.
 */
describe('Declared transitions at apply', () => {
  const root = join(import.meta.dirname!, '..', 'temp-test-transitions')
  const specsDir = join(root, 'specs')
  const knowledgeDir = join(root, 'kNNowledge')
  const changesDir = join(root, 'changes')

  const BLUEPRINT = `---
spec_version: "V_0-4-0"
level: 2
blueprint_version: "0.2.0"
blueprint_name: "video"
title: "Video Template"
parent_spec:
  name: "iNNfo_V_0-3-0"
  url: "specs/iNNfo_V_0-3-0_NN.md"
---

# NN Concept Definition
## NN Concept Definition: Video
type:: list
storage:: distributed
placement:: "videos/{slug}/"

# NN Field Definition
## NN Field Definition: status
concept:: Video
type:: select
options:: [idea, draft, approved, archived]
transitions:: {"": ["idea"], "idea": ["draft", "archived"], "draft": ["approved", "archived"], "approved": ["archived"], "archived": []}

## NN Field Definition: title
concept:: Video
type:: string
`

  const LIVE_VIDEO = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "video_V_0-2-0"
  url: "specs/video_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Videos"
knowledge_slug: "videos"
---

# NN index
* [[Video]]

# NN Video
## NN Video: Episode One
slug:: episode-one
status:: draft
title:: The First
`

  beforeEach(async () => {
    await rm(root, { recursive: true, force: true })
    await mkdir(specsDir, { recursive: true })
    await mkdir(knowledgeDir, { recursive: true })
    await mkdir(changesDir, { recursive: true })

    await writeFile(
      join(specsDir, 'iNNfo_V_0-3-0_NN.md'),
      '---\nspec_version: "V_0-3-0"\nlevel: 1\ntitle: "iNNfo"\nparent_spec:\n  name: "defiNNition_V_0-1-0"\n  url: "specs/defiNNition_V_0-1-0_NN.md"\n---\n',
      'utf-8',
    )
    await writeFile(
      join(specsDir, 'defiNNition_V_0-1-0_NN.md'),
      '---\nspec_version: "V_0-1-0"\nlevel: 0\ntitle: "defiNNition"\n---\n',
      'utf-8',
    )
    await writeFile(join(specsDir, 'video_V_0-2-0_NN.md'), BLUEPRINT, 'utf-8')
    await writeFile(join(knowledgeDir, 'videos_NN.md'), LIVE_VIDEO, 'utf-8')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  function makeChangeset(
    changes: ChangeItem[],
    extra: Record<string, unknown> = {},
  ): ChangesetDocument {
    const withEvidence = changes.map((c) =>
      c.evidence === undefined ? { ...c, evidence: 'decision' } : c,
    )
    return {
      frontmatter: {
        spec_version: 'V_0-4-0',
        level: 3,
        parent_spec: { name: 'changes', url: 'https://example.test/changes/spec_NN.md' },
        blueprint_version: '0.1.0',
        status: 'proposed',
        proposal_sha: computeProposalSha(withEvidence),
        title: 'Transitions test',
        author: 'agent-writer',
        workspace_id: 'ws-1',
        ...extra,
      },
      changes: withEvidence,
    }
  }

  async function apply(doc: ChangesetDocument, name: string) {
    const path = join(changesDir, name)
    await writeFile(path, serializeChangeset(doc), 'utf-8')
    return applyChange(root, `changes/${name}`)
  }

  it('allows a declared edge', async () => {
    const res = await apply(
      makeChangeset([
        {
          id: 'c-1',
          op: 'update_field',
          target: 'videos@episode-one&status',
          from: 'draft',
          to: 'approved',
        },
      ]),
      'ws_agent_allowed_changes_NN.md',
    )
    expect(res.status).toBe('applied')
    expect(await readFile(join(knowledgeDir, 'videos_NN.md'), 'utf-8')).toContain(
      'status:: approved',
    )
  })

  it('refuses an undeclared edge with TRANSITION_NOT_ALLOWED', async () => {
    const res = await apply(
      makeChangeset([
        {
          id: 'c-1',
          op: 'update_field',
          target: 'videos@episode-one&status',
          from: 'draft',
          to: 'idea',
        },
      ]),
      'ws_agent_refused_changes_NN.md',
    )
    expect(res.status).toBe('conflict')
    expect(res.errors?.some((e) => e.code === 'TRANSITION_NOT_ALLOWED')).toBe(true)
    // Nothing was written: the field holds what it held.
    expect(await readFile(join(knowledgeDir, 'videos_NN.md'), 'utf-8')).toContain('status:: draft')
  })

  it('refuses a move out of a terminal value', async () => {
    // Reach `archived` first (a declared edge), then a separate changeset must not leave it.
    const first = await apply(
      makeChangeset([
        {
          id: 'c-1',
          op: 'update_field',
          target: 'videos@episode-one&status',
          from: 'draft',
          to: 'archived',
        },
      ]),
      'ws_agent_terminal_a_changes_NN.md',
    )
    expect(first.status).toBe('applied')
    expect(await readFile(join(knowledgeDir, 'videos_NN.md'), 'utf-8')).toContain(
      'status:: archived',
    )

    const second = await apply(
      makeChangeset([
        {
          id: 'c-2',
          op: 'update_field',
          target: 'videos@episode-one&status',
          from: 'archived',
          to: 'idea',
        },
      ]),
      'ws_agent_terminal_b_changes_NN.md',
    )
    expect(second.status).toBe('conflict')
    expect(second.errors?.some((e) => e.code === 'TRANSITION_NOT_ALLOWED')).toBe(true)
    expect(await readFile(join(knowledgeDir, 'videos_NN.md'), 'utf-8')).toContain(
      'status:: archived',
    )
  })

  it('allows a write that re-states the current value', async () => {
    const res = await apply(
      makeChangeset([
        {
          id: 'c-1',
          op: 'update_field',
          target: 'videos@episode-one&status',
          from: 'draft',
          to: 'draft',
        },
      ]),
      'ws_agent_same_changes_NN.md',
    )
    expect(res.status).toBe('applied')
  })

  it('does not check a field with no transitions declared', async () => {
    const res = await apply(
      makeChangeset([
        {
          id: 'c-1',
          op: 'update_field',
          target: 'videos@episode-one&title',
          from: 'The First',
          to: 'Renamed',
        },
      ]),
      'ws_agent_no_transitions_changes_NN.md',
    )
    expect(res.status).toBe('applied')
  })

  it('validates a chained transition in changeset order', async () => {
    // One changeset moving draft -> approved -> archived: the rule reads each change
    // against the value the previous change of the same file left, so the chain is
    // judged edge by edge instead of all against the live `draft`.
    const res = await apply(
      makeChangeset([
        {
          id: 'c-1',
          op: 'update_field',
          target: 'videos@episode-one&status',
          from: 'draft',
          to: 'approved',
          evidence: 'decision',
        },
        {
          id: 'c-2',
          op: 'update_field',
          target: 'videos@episode-one&status',
          to: 'idea',
          evidence: 'decision',
        },
      ]),
      'ws_agent_chain_changes_NN.md',
    )
    // The first edge is declared and applied; the second (approved -> idea) is not.
    expect(res.status).toBe('partially_applied')
    expect(res.conflictedCount).toBe(1)
    const annotated = parseChangeset(
      await readFile(join(changesDir, 'ws_agent_chain_changes_NN.md'), 'utf-8'),
    )
    const conflicted = annotated.changes.find((c) =>
      c.resolution?.includes('TRANSITION_NOT_ALLOWED'),
    )
    expect(conflicted).toBeDefined()
    expect(await readFile(join(knowledgeDir, 'videos_NN.md'), 'utf-8')).toContain(
      'status:: approved',
    )
  })

  it('refuses an add_element whose initial status is not a declared first edge', async () => {
    const res = await apply(
      makeChangeset([
        {
          id: 'c-1',
          op: 'add_element',
          concept: 'Video',
          target: 'videos@Video',
          name: 'Episode Two',
          to: '{"status": "approved"}',
        },
      ]),
      'ws_agent_add_changes_NN.md',
    )
    expect(res.status).toBe('conflict')
    expect(res.errors?.some((e) => e.code === 'TRANSITION_NOT_ALLOWED')).toBe(true)
  })

  it('accepts an add_element whose initial status is the declared first edge', async () => {
    const res = await apply(
      makeChangeset([
        {
          id: 'c-1',
          op: 'add_element',
          concept: 'Video',
          target: 'videos@Video',
          name: 'Episode Two',
          to: '{"status": "idea"}',
        },
      ]),
      'ws_agent_add_ok_changes_NN.md',
    )
    expect(res.status).toBe('applied')
    expect(await readFile(join(knowledgeDir, 'videos_NN.md'), 'utf-8')).toContain(
      '## NN Video: Episode Two',
    )
  })

  it('leaves a value set before the declaration valid (no history check)', async () => {
    // `draft` already in the model is already an option: nothing revalidates history.
    const res = await apply(
      makeChangeset([
        {
          id: 'c-1',
          op: 'update_field',
          target: 'videos@episode-one&title',
          from: 'The First',
          to: 'The Second',
        },
      ]),
      'ws_agent_history_changes_NN.md',
    )
    expect(res.status).toBe('applied')
    expect(await readFile(join(knowledgeDir, 'videos_NN.md'), 'utf-8')).toContain('status:: draft')
  })
})
