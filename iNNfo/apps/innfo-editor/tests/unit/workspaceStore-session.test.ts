import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { useUiStore } from '../../src/stores/uiStore'
import { buildFakeTree } from '../helpers/fakeFs'
import { setSessionState, getSessionState, dbClear } from '../../src/utils/db'

const testModelContent = `---
spec_version: "V_0-1-2"
spec_url: "https://example.test/specs/V_0-1-2"
level: 3
model_version: "V_1-0-0"
title: "Session Test"
---

# _NN Session Test Model

A model used to test session persistence.
`

const testTree = {
  'index.md': `---
spec_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# _NN index

* [[Session-Test_V_1-0-0_Template_NN.md]]
`,
  'Session-Test_V_1-0-0_Template_NN.md': testModelContent,
}

describe('workspaceStore — Session persistence (R-SP-06)', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await dbClear('session')
    await dbClear('treeState')
  })

  it('open() persists lastFile and lastOpenedAt after successful parse', async () => {
    const workspaceStore = useWorkspaceStore()
    const handle = buildFakeTree('workspace', testTree)

    await workspaceStore.open(handle)

    // Verify session was persisted
    const session = await getSessionState()
    expect(session.lastFile).toBeDefined()
    expect(typeof session.lastFile).toBe('string')
    expect(session.lastOpenedAt).toBeDefined()
    expect(typeof session.lastOpenedAt).toBe('string')
    // lastOpenedAt should be an ISO-8601 string
    expect(new Date(session.lastOpenedAt as string).toISOString()).toBe(session.lastOpenedAt)
  })

  it('recoverHandle() restores uiStore state from session', async () => {
    const workspaceStore = useWorkspaceStore()
    const handle = buildFakeTree('workspace', testTree)

    // First, open a workspace to populate the handle store
    await workspaceStore.open(handle)

    // Manually set session state as if it was persisted from a previous session
    await setSessionState('selectedNodeId', 'Session-Test_V_1-0-0_Template_NN.md/Root')
    await setSessionState('activeView', 'graph')

    // Reset the pinia stores to simulate page reload
    setActivePinia(createPinia())
    const freshWorkspaceStore = useWorkspaceStore()
    const freshUiStore = useUiStore()

    // Recover handle — this should restore uiStore state
    const recovered = await freshWorkspaceStore.recoverHandle()
    expect(recovered).toBeDefined()
    expect(recovered?.name).toBe('workspace')

    // Verify uiStore was restored from session
    expect(freshUiStore.selectedNodeId).toBe('Session-Test_V_1-0-0_Template_NN.md/Root')
    expect(freshUiStore.activeView).toBe('graph')
  })

  it('recoverHandle() does not crash when session is empty', async () => {
    const workspaceStore = useWorkspaceStore()
    const handle = buildFakeTree('workspace', testTree)

    await workspaceStore.open(handle)

    // Reset to simulate page reload with empty session
    setActivePinia(createPinia())
    const freshWorkspaceStore = useWorkspaceStore()
    const freshUiStore = useUiStore()

    const recovered = await freshWorkspaceStore.recoverHandle()
    expect(recovered).toBeDefined()

    // Default values should remain
    expect(freshUiStore.selectedNodeId).toBeNull()
    expect(freshUiStore.activeView).toBe('editor')
  })
})

describe('workspaceStore — Tree state persistence (R-SP-03)', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await dbClear('treeState')
  })

  it('persistTreeState stores collapsed state for a node', async () => {
    const workspaceStore = useWorkspaceStore()

    await workspaceStore.persistTreeState('AILab', true)
    await workspaceStore.persistTreeState('Process', false)

    const tree = await workspaceStore.restoreTreeState()
    expect(tree.get('AILab')).toBe(true)
    expect(tree.get('Process')).toBe(false)
  })

  it('restoreTreeState returns empty map when nothing persisted', async () => {
    const workspaceStore = useWorkspaceStore()

    const tree = await workspaceStore.restoreTreeState()
    expect(tree.size).toBe(0)
  })

  it('persistTreeState overwrites previous state for the same node', async () => {
    const workspaceStore = useWorkspaceStore()

    await workspaceStore.persistTreeState('Node1', true)
    await workspaceStore.persistTreeState('Node1', false)

    const tree = await workspaceStore.restoreTreeState()
    expect(tree.get('Node1')).toBe(false)
  })
})
