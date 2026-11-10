import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { checkStaleTarget as checkStale, loadStalenessHistory } from '../../src/changeset/history.js'

async function checkStaleTarget(dir: string, model: string, element: string, base: string) {
  return checkStale(await loadStalenessHistory(dir), model, element, base)
}
import { serializeChangeset } from '../../src/changeset/serializer.js'
import { computeProposalSha } from '../../src/changeset/hasher.js'
import { loadChangesetRecords } from '../../src/console/element-history.js'
import type { ChangeItem, ChangesetDocument } from '../../src/changeset/types.js'

describe('2C: History Reverse-Scan & Staleness Check (checkStaleTarget)', () => {
  const tmpDir = join(process.cwd(), 'tmp-history-test')

  beforeEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
    await mkdir(tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true })
  })

  function makeAppliedChangeset(
    filename: string,
    modelSlug: string,
    baseVersion: string,
    resultVersion: string,
    changes: ChangeItem[],
  ): Promise<void> {
    const doc: ChangesetDocument = {
      frontmatter: {
        spec_version: 'V_0-4-0',
        level: 3,
        parent_spec: { name: 'changes', url: 'https://example.test/changes/spec_NN.md' },
        blueprint_version: '0.1.0',
        status: 'applied',
        proposal_sha: computeProposalSha(changes),
        applied_at: new Date().toISOString(),
        models: {
          [modelSlug]: {
            base_version: baseVersion,
            result_version: resultVersion,
          },
        },
      },
      changes,
    }
    return writeFile(join(tmpDir, filename), serializeChangeset(doc), 'utf-8')
  }

  it('flags STALE_TARGET_DELETED when element was deleted after base_version', async () => {
    // Changeset 01 applied at model base_version V_0-1-1 (transition to V_0-1-2)
    await makeAppliedChangeset(
      '2026-10-01-01-delete-cache_changes_NN.md',
      'core',
      'V_0-1-1',
      'V_0-1-2',
      [
        {
          id: 'c1',
          op: 'remove_element',
          target: 'core@cache',
          status: 'applied',
        },
      ],
    )

    // Pending change with base_version V_0-1-0 targets cache
    const result = await checkStaleTarget(tmpDir, 'core', 'cache', 'V_0-1-0')
    expect(result.stale).toBe(true)
    expect(result.code).toBe('STALE_TARGET_DELETED')
  })

  it('resets lifecycle history upon encountering add_element for target slug', async () => {
    // Changeset 01 deletes cache at V_0-1-1
    await makeAppliedChangeset(
      '2026-10-01-01-delete-cache_changes_NN.md',
      'core',
      'V_0-1-1',
      'V_0-1-2',
      [
        {
          id: 'c1',
          op: 'remove_element',
          target: 'core@cache',
          status: 'applied',
        },
      ],
    )

    // Changeset 02 re-adds cache at V_0-1-2 (transition to V_0-1-3)
    await makeAppliedChangeset(
      '2026-10-01-02-readd-cache_changes_NN.md',
      'core',
      'V_0-1-2',
      'V_0-1-3',
      [
        {
          id: 'c2',
          op: 'add_element',
          target: 'core@concept',
          name: 'cache',
          resolved_slug: 'cache',
          status: 'applied',
        },
      ],
    )

    // Pending change with base_version V_0-1-2 should succeed (lifecycle reset)
    const result = await checkStaleTarget(tmpDir, 'core', 'cache', 'V_0-1-2')
    expect(result.stale).toBe(false)
  })

  it('keys staleness by model id: the same slug in another instance does not stale (distributed-storage S6c)', async () => {
    await makeAppliedChangeset(
      '2026-10-01-01-delete-intro_changes_NN.md',
      'villabotijos-today/intro',
      'V_0-1-1',
      'V_0-1-2',
      [
        {
          id: 'c1',
          op: 'remove_element',
          target: 'villabotijos-today/intro@00-gancho',
          status: 'applied',
        },
      ],
    )

    expect((await checkStaleTarget(tmpDir, 'innteresante/intro', '00-gancho', 'V_0-1-0')).stale).toBe(false)
    expect((await checkStaleTarget(tmpDir, 'villabotijos-today/intro', '00-gancho', 'V_0-1-0')).stale).toBe(true)
  })

  it('follows the identity chain: a removal under the old id stales a change on the new id', async () => {
    await makeAppliedChangeset(
      '2026-10-01-01-delete-intro_changes_NN.md',
      'innteresante/intro',
      'V_0-1-1',
      'V_0-1-2',
      [
        {
          id: 'c1',
          op: 'remove_element',
          target: 'innteresante/intro@00-gancho',
          status: 'applied',
        },
      ],
    )
    await makeAppliedChangeset(
      '2026-10-01-02-rename_changes_NN.md',
      'innteresante/intro',
      'V_0-1-2',
      'V_0-1-3',
      [
        {
          id: 'c2',
          op: 'move_model',
          target: 'innteresante/intro',
          to: 'innteresante/welcome',
          status: 'applied',
        },
      ],
    )

    expect((await checkStaleTarget(tmpDir, 'innteresante/welcome', '00-gancho', 'V_0-1-0')).stale).toBe(true)
  })

  it('a pending change authored against a renamed instance names the new id', async () => {
    await makeAppliedChangeset(
      '2026-10-01-01-rename_changes_NN.md',
      'innteresante/intro',
      'V_0-1-1',
      'V_0-1-2',
      [
        {
          id: 'c1',
          op: 'move_model',
          target: 'innteresante/intro',
          to: 'innteresante/welcome',
          status: 'applied',
        },
      ],
    )

    const result = await checkStaleTarget(tmpDir, 'innteresante/intro', '00-gancho', 'V_0-1-0')
    expect(result.stale).toBe(true)
    expect(result.code).toBe('STALE_TARGET_MOVED')
    expect(result.message).toContain('innteresante/welcome')
    // A different instance with the same slug is never dragged along.
    expect((await checkStaleTarget(tmpDir, 'innteresante/pitch', '00-gancho', 'V_0-1-0')).stale).toBe(false)
  })

  it('sees a deletion whatever the changeset count and filename order', async () => {
    // 56 changesets; the deletion sorts first by filename
    await makeAppliedChangeset(
      '2026-01-01-00-delete_changes_NN.md',
      'core',
      'V_0-1-1',
      'V_0-1-2',
      [
        {
          id: 'c0',
          op: 'remove_element',
          target: 'core@cache',
          status: 'applied',
        },
      ],
    )

    for (let i = 1; i <= 55; i++) {
      const pad = String(i).padStart(2, '0')
      await makeAppliedChangeset(
        `2026-02-01-${pad}-noop_changes_NN.md`,
        'core',
        'V_0-1-2',
        'V_0-1-3',
        [
          {
            id: `c-${i}`,
            op: 'update_field',
            target: 'core@other&field',
            to: 'val',
            status: 'applied',
          },
        ],
      )
    }

    // No count bound and no filename order: the oldest-named changeset is still read.
    const result = await checkStaleTarget(tmpDir, 'core', 'cache', 'V_0-1-0')
    expect(result.stale).toBe(true)
    expect(result.code).toBe('STALE_TARGET_DELETED')
  })
})

describe('Change-chain lineage (no model snapshot)', () => {
  const dir = join(process.cwd(), 'tmp-history-walk-test')

  beforeEach(async () => {
    await rm(dir, { recursive: true, force: true })
    await mkdir(join(dir, 'changes'), { recursive: true })
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  function appliedChangeset(extra: Partial<ChangeItem>): string {
    const change: ChangeItem = {
      id: 'c-01',
      op: 'update_field',
      target: 'strategy@vision&statement',
      from: 'a',
      to: 'b',
      status: 'applied',
      ...extra,
    }
    const doc: ChangesetDocument = {
      frontmatter: {
        spec_version: 'V_0-4-0',
        level: 3,
        parent_spec: { name: 'changes', url: 'https://example.test/changes/spec_NN.md' },
        blueprint_version: 'V_0-2-0',
        status: 'applied',
        proposal_sha: computeProposalSha([change]),
      },
      changes: [change],
    }
    return serializeChangeset(doc)
  }

  it('history entries expose the change evidence and per-change facts along the chain', async () => {
    await writeFile(
      join(dir, 'changes', 'ws_agent_1_changes_NN.md'),
      appliedChangeset({ evidence: 'sources/interview.md@## Vision' }),
      'utf-8',
    )
    await writeFile(
      join(dir, 'changes', 'ws_agent_2_changes_NN.md'),
      appliedChangeset({ applied_at: '2026-10-23T10:00:00.000Z', batch: 'ws_agent_2_changes_NN' }),
      'utf-8',
    )

    const records = await loadChangesetRecords(dir)
    const byPath = (p: string) => records.find((r) => r.path === p)!

    // cs2's change carries its own execution facts, not a back-pointer.
    const c2 = byPath('changes/ws_agent_2_changes_NN.md').changes[0]
    expect(c2.applied_at).toBe('2026-10-23T10:00:00.000Z')
    expect(c2.batch).toBe('ws_agent_2_changes_NN')

    // The earliest change carries the evidence that reaches the Source.
    const c1 = byPath('changes/ws_agent_1_changes_NN.md').changes[0]
    expect(c1.evidence).toBe('sources/interview.md@## Vision')
  })
})
