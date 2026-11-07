import { describe, it, expect } from 'vitest'
import { toolDefinitions } from '../src/server.js'

/**
 * Domain synchronization is an explicit `nn-sources --sync` act (lineage-as-changes A9):
 * the MCP server only applies the printed `propose_changeset` payload. Regression guard.
 * `sync_domain_manifest` reconciles the workspace manifest and is unrelated.
 */
describe('MCP tool list: no synchronization tool', () => {
  it('exposes no tool that refreshes a mirror or an origin', () => {
    const offenders = toolDefinitions
      .map((tool) => tool.name)
      .filter((name) => name !== 'sync_domain_manifest')
      .filter((name) => /sync|mirror|origin|refresh/i.test(name))
    expect(offenders).toEqual([])
  })
})
