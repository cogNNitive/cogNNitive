import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import type { IWorkspaceRepository } from '../../src/repositories/IWorkspaceRepository'
import { buildFakeTree } from '../helpers/fakeFs'

class MockWorkspaceRepository implements IWorkspaceRepository {
  storeHandle = vi.fn().mockResolvedValue(undefined)
  loadStoredHandle = vi.fn().mockResolvedValue(null)
  getSessionState = vi.fn().mockResolvedValue({})
  setSessionState = vi.fn().mockResolvedValue(undefined)
  setTreeState = vi.fn().mockResolvedValue(undefined)
  getTreeState = vi.fn().mockResolvedValue(new Map())
}

describe('workspaceStore Repository Delegation (TDD)', () => {
  let mockRepo: MockWorkspaceRepository

  beforeEach(() => {
    setActivePinia(createPinia())
    mockRepo = new MockWorkspaceRepository()
  })

  it('delegates handle storage and session persistence to the repository on open()', async () => {
    const workspaceStore = useWorkspaceStore()
    workspaceStore.repository = mockRepo

    const handle = buildFakeTree('workspace', {
      'index.md': `---
spec_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---
# _NN index
* [[Doc_NN.md]]
`,
      'Doc_NN.md': `---
spec_version: "V_0-1-2"
model_version: "V_1-0-0"
title: "Doc"
---
# _NN index
`,
    })

    await workspaceStore.open(handle)

    expect(mockRepo.storeHandle).toHaveBeenCalledWith(handle)
    expect(mockRepo.setSessionState).toHaveBeenCalledWith('lastOpenedAt', expect.any(String))
  })

  it('delegates handle recovery and session retrieval to the repository on recoverHandle()', async () => {
    const workspaceStore = useWorkspaceStore()
    workspaceStore.repository = mockRepo
    const handle = buildFakeTree('workspace', {})
    mockRepo.loadStoredHandle.mockResolvedValue(handle)
    mockRepo.getSessionState.mockResolvedValue({
      selectedNodeId: 'Node1',
      activeView: 'graph',
    })

    const recovered = await workspaceStore.recoverHandle()

    expect(recovered).toBe(handle)
    expect(mockRepo.loadStoredHandle).toHaveBeenCalled()
    expect(mockRepo.getSessionState).toHaveBeenCalled()
  })

  it('delegates tree state persistence to the repository on persistTreeState()', async () => {
    const workspaceStore = useWorkspaceStore()
    workspaceStore.repository = mockRepo

    await workspaceStore.persistTreeState('Node1', true)

    expect(mockRepo.setTreeState).toHaveBeenCalledWith('Node1', true)
  })

  it('delegates tree state restoration to the repository on restoreTreeState()', async () => {
    const workspaceStore = useWorkspaceStore()
    workspaceStore.repository = mockRepo
    const expectedMap = new Map([['Node1', true]])
    mockRepo.getTreeState.mockResolvedValue(expectedMap)

    const map = await workspaceStore.restoreTreeState()

    expect(map).toBe(expectedMap)
    expect(mockRepo.getTreeState).toHaveBeenCalled()
  })
})
