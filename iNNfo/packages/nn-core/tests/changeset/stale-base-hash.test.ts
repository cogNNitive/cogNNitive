import { describe, it, expect } from 'vitest'
import { partitionChangeset } from '../../src/changeset/conflicts.js'
import { computeElementHash } from '../../src/console/element-hash.js'
import type { ChangeItem } from '../../src/changeset/types.js'
import type { ParsedKnowledge } from '../../src/types/parser.js'
import { ElementsMap } from '../../src/types/parser.js'

describe('Task 3.6: Pre-change base_hash precondition check and review mark changed status', () => {
  it('stale base_hash precondition fails when pre-change hash was computed with old contract (including markers)', async () => {
    // Current element has no markers in hash input
    const element = {
      concept: 'Tasks',
      name: 'Deploy',
      description: 'Deploy to production',
      fields: { stage: 'prod' },
      markers: { priority: '!' },
    }
    const currentHash = computeElementHash(element)

    // Pre-change hash computed with old contract included markers
    // Canonical JSON with markers was: {"concept":"Tasks","description":"Deploy to production","fields":{"stage":"prod"},"markers":{"priority":"!"},"name":"Deploy"}
    // Which gave a different hash than current markers-free hash
    const oldPreChangeHash = 'old-stale-hash-01'

    const elementsMap = new ElementsMap()
    elementsMap.set('Tasks', [
      {
        type: 'Tasks',
        name: 'Deploy',
        description: 'Deploy to production',
        fields: { stage: 'prod' },
        markers: { priority: '!' },
        slug: 'task-deploy',
      },
    ])

    const model: ParsedKnowledge = {
      frontmatter: {
        spec_version: 'V_0-5-0',
        level: 3,
        parent_spec: { name: 'projects', url: 'https://example.com' },
        title: 'Project',
      },
      taxonomy: [],
      elements: elementsMap,
      matrices: [],
      nodeMarkers: {},
      rawContent: '',
    }

    const change: ChangeItem = {
      id: 'c-01',
      op: 'update_field',
      target: 'project@task-deploy&stage',
      base_hash: oldPreChangeHash,
      from: 'prod',
      to: 'staging',
      author: 'user',
    }

    const { conflictedSubset, conflictDiagnostics, cleanSubset } = await partitionChangeset(
      [change],
      new Map([['project', model]]),
    )

    expect(conflictedSubset).toHaveLength(1)
    expect(cleanSubset).toHaveLength(0)
    expect(conflictedSubset[0].status).toBe('conflict')
    expect(conflictDiagnostics.get('c-01')?.code).toBe('STALE_BASE_HASH')
    expect(conflictedSubset[0].resolution).toContain('PRECONDITION_FAILED')
    expect(conflictedSubset[0].resolution).toContain('base_hash old-stale-hash-01 does not match current')
  })

  it('validates applicable change when base_hash matches the new markers-free hash', async () => {
    const elementsMap = new ElementsMap()
    const node = {
      type: 'Tasks',
      name: 'Deploy',
      description: 'Deploy to production',
      fields: { stage: 'prod' },
      markers: { priority: '!' },
      slug: 'task-deploy',
    }
    elementsMap.set('Tasks', [node])

    const model: ParsedKnowledge = {
      frontmatter: {
        spec_version: 'V_0-5-0',
        level: 3,
        parent_spec: { name: 'projects', url: 'https://example.com' },
        title: 'Project',
      },
      taxonomy: [],
      elements: elementsMap,
      matrices: [],
      nodeMarkers: {},
      rawContent: '',
    }

    const currentHash = computeElementHash({
      concept: 'Tasks',
      name: 'Deploy',
      description: 'Deploy to production',
      fields: { stage: 'prod' },
    })

    const change: ChangeItem = {
      id: 'c-02',
      op: 'update_field',
      target: 'project@task-deploy&stage',
      base_hash: currentHash,
      from: 'prod',
      to: 'staging',
      author: 'user',
    }

    const { conflictedSubset, cleanSubset } = await partitionChangeset(
      [change],
      new Map([['project', model]]),
    )

    expect(conflictedSubset).toHaveLength(0)
    expect(cleanSubset).toHaveLength(1)
  })
})
