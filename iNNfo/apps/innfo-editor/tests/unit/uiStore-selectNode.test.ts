import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '../../src/stores/uiStore'

describe('uiStore.selectNode', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('dismisses the validation report overlay so the new selection is visible', () => {
    const uiStore = useUiStore()
    uiStore.setShowValidationReport(true)

    uiStore.selectNode('Ghostbusters/Root/Element')

    expect(uiStore.selectedNodeId).toBe('Ghostbusters/Root/Element')
    expect(uiStore.showValidationReport).toBe(false)
  })
})
