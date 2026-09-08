import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { useModelStore } from '../../src/stores/modelStore'
import { buildFakeTree } from '../helpers/fakeFs'

const indexMd = `---
spec_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# _NN index

* [[Doc_NN.md]]
`

const validFormatMd = `---
spec_version: "V_0-1-1"
spec_url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
level: 3
parent_spec:
  name: "business_V_0-1-1"
  url: "https://example.test/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Workspace Store Fixture"
---

# _NN Business summary

Fixture used to exercise workspaceStore.open() integrity-check wiring.
`

describe('workspaceStore integrity check (AD-6)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('open() never awaits the integrity check and does not reject open()', async () => {
    const workspaceStore = useWorkspaceStore()
    const modelStore = useModelStore()
    const handle = buildFakeTree('workspace', { 'index.md': indexMd, 'Doc_NN.md': validFormatMd })

    // Network is unavailable in tests → fetchCatalog degrades to offline.
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network down'))

    await expect(workspaceStore.open(handle)).resolves.toBeUndefined()
    expect(workspaceStore.hasParsed).toBe(true)
    expect(modelStore.rootIds.length).toBeGreaterThan(0)
  })

  it('a rejecting integrity check never sets the workspace error state', async () => {
    const workspaceStore = useWorkspaceStore()
    const handle = buildFakeTree('workspace', { 'index.md': indexMd, 'Doc_NN.md': validFormatMd })

    // Simulate a catastrophic port failure inside the check builder.
    const module = await import('../../src/services/workspaceIntegrityPorts')
    vi.spyOn(module, 'createWorkspaceIntegrityPorts').mockImplementation(() => {
      throw new Error('ports exploded')
    })

    await workspaceStore.open(handle)
    expect(workspaceStore.error).toBeNull()
    expect(workspaceStore.hasParsed).toBe(true)
    await vi.waitFor(() => {
      expect(workspaceStore.integrityRunning).toBe(false)
    })
    expect(workspaceStore.integrityReport).toBeNull()
  })

  it('reset() clears integrityReport and integrityRunning', async () => {
    const workspaceStore = useWorkspaceStore()
    workspaceStore.integrityReport = {
      schemaVersion: 1,
      generatedAt: '2026-09-08T00:00:00.000Z',
      models: [],
      aggregate: {
        modelsScanned: 0,
        invalid: 0,
        withWarnings: 0,
        versionStatus: {},
        templateResolution: {},
        freshness: {},
      },
      catalogSource: 'offline',
      offline: true,
      degraded: [],
    }
    workspaceStore.integrityRunning = true
    workspaceStore.reset()
    expect(workspaceStore.integrityReport).toBeNull()
    expect(workspaceStore.integrityRunning).toBe(false)
  })
})