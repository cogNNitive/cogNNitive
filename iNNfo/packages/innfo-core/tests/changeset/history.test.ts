import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { checkStaleTarget } from '../../src/changeset/history.js'
import { serializeChangeset } from '../../src/changeset/serializer.js'
import { computeProposalSha } from '../../src/changeset/hasher.js'
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

  it('bounds scan to 50 changesets', async () => {
    // Generate 60 mock changesets; oldest one deletes cache
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

    // Since cap is 50, scanning from latest down will NOT reach the 56th file back
    const result = await checkStaleTarget(tmpDir, 'core', 'cache', 'V_0-1-0', 50)
    expect(result.stale).toBe(false)
  })
})
