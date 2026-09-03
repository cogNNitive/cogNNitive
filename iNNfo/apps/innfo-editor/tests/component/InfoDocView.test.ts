import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import InfoDocView from '../../src/views/InfoDocView.vue'
import { routes } from '../../src/router/index'
import { useModelStore } from '../../src/stores/modelStore'
import { useMetamodelStore } from '../../src/stores/metamodelStore'

const templateContent = `---
spec_version: "V_0-2-0"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-2-0_NN.md"
title: "Innovation Template"
---

# NN Concept Definition

## NN Concept Definition: Program
icon:: layers
type:: list
color:: blue
weight:: 100
`

const modelContent = `---
level: 3
parent_spec:
  name: "innovation_V_0-2-0"
  url: "https://example.test/specs/templates/innovation/innovation_V_0-2-0_NN.md"
model_version: "V_0-2-0"
title: "Sample Innovation Model"
---

# NN Program

## NN Program: Core R&D
programName:: Core R&D
`

describe('InfoDocView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('resolves parent spec and preserves synthetic template in modelStore.rootIds', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      if (String(url).includes('innovation_V_0-2-0')) {
        return {
          ok: true,
          status: 200,
          text: async () => templateContent,
        } as any
      }
      return { ok: false, status: 404, text: async () => '' } as any
    })

    const router = createRouter({ history: createMemoryHistory(), routes })
    const wrapper = mount(InfoDocView, {
      global: {
        plugins: [router],
      },
    })

    const file = new File([modelContent], 'Test_V_0-2-0_innovation_NN.md', { type: 'text/markdown' })
    const input = wrapper.find('input[type="file"]')

    Object.defineProperty(input.element, 'files', {
      value: [file],
      writable: false,
    })

    await input.trigger('change')
    await new Promise((resolve) => setTimeout(resolve, 50))

    const modelStore = useModelStore()
    const metamodelStore = useMetamodelStore()

    expect(modelStore.rootIds).toContain('Test_V_0-2-0_innovation_NN')
    expect(modelStore.rootIds).toContain('spec:innovation_V_0-2-0')
    expect(metamodelStore.concepts.length).toBeGreaterThan(0)
    expect(metamodelStore.concepts.some((c) => c.name === 'Program')).toBe(true)
  })
})
