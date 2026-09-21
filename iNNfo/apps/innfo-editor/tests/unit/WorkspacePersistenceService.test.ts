import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModelStore } from '../../src/stores/modelStore'
import { useUiStore } from '../../src/stores/uiStore'
import { saveActiveFile } from '../../src/services/WorkspacePersistenceService'
import { buildFakeTree } from '../helpers/fakeFs'

describe('WorkspacePersistenceService — Collision Detection & Auto-Merge', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('automatically merges disk changes (e.g. added by agent) with memory edits on save', async () => {
    const initialContent = `---
spec_version: "V_0-2-1"
level: 3
model_version: "V_0-0-1"
title: "Filmography"
---

# NN Movies

## NN Movies: Casablanca
year:: 1942

# NN Scenes

## NN Scenes: Airport Farewell
movie:: [[Casablanca]]
`

    const fakeTree = buildFakeTree('workspace', {
      'index.md': '# NN index\n* [[model_NN.md]]',
      'model_NN.md': initialContent,
    })

    const modelStore = useModelStore()
    const uiStore = useUiStore()

    // 1. Open workspace into memory
    await modelStore.parseFromHandle(fakeTree)
    const rootId = modelStore.rootIds[0]
    expect(rootId).toBeDefined()

    // 2. User edits field in memory (e.g. adds director in UI)
    const movieNode = Object.values(modelStore.nodes).find((n) => n.name === 'Casablanca')
    expect(movieNode).toBeDefined()
    movieNode!.fields = {
      ...movieNode!.fields,
      director: { value: 'Michael Curtiz', type: 'string' } as any,
    }
    modelStore.markDirty(movieNode!.id)

    // 3. Concurrently, an AI agent modifies the file on disk (adds a new scene)
    const diskContentWithAgentScene = `---
spec_version: "V_0-2-1"
level: 3
model_version: "V_0-0-1"
title: "Filmography"
---

# NN Movies

## NN Movies: Casablanca
year:: 1942

# NN Scenes

## NN Scenes: Airport Farewell
movie:: [[Casablanca]]

## NN Scenes: Rick's Cafe
movie:: [[Casablanca]]
`
    const fileHandle = await fakeTree.getFileHandle('model_NN.md', { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(diskContentWithAgentScene)
    await writable.close()

    // 4. User hits Save in the UI -> saveActiveFile executes
    await saveActiveFile(fakeTree, null, modelStore, uiStore, false)

    // 5. Read back from disk to verify unified state
    const freshlyReadHandle = await fakeTree.getFileHandle('model_NN.md')
    const savedFile = await freshlyReadHandle.getFile()
    const savedText = await savedFile.text()

    // Both the UI change (director: Michael Curtiz) AND the agent change (Rick's Cafe) must be present!
    expect(savedText).toContain('director:: Michael Curtiz')
    expect(savedText).toContain('## NN Scenes: Rick\'s Cafe')
    expect(savedText).toContain('## NN Scenes: Airport Farewell')
    expect(savedText).not.toContain('# NN index')
  })
})
