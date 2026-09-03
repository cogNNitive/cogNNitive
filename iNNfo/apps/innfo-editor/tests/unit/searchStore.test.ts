import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUiStore } from '../../src/stores/uiStore'

describe('uiStore search state and methods', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes search state with defaults', () => {
    const uiStore = useUiStore()
    expect(uiStore.isSearchOpen).toBe(false)
    expect(uiStore.searchQuery).toBe('')
    expect(uiStore.searchConceptFilter).toBe('all')
  })

  it('toggles search open and clears fields when closing', () => {
    const uiStore = useUiStore()
    uiStore.toggleSearchOpen()
    expect(uiStore.isSearchOpen).toBe(true)

    uiStore.setSearchQuery('test query')
    uiStore.setSearchConceptFilter('Market')
    expect(uiStore.searchQuery).toBe('test query')
    expect(uiStore.searchConceptFilter).toBe('Market')

    uiStore.toggleSearchOpen()
    expect(uiStore.isSearchOpen).toBe(false)
    expect(uiStore.searchQuery).toBe('')
    expect(uiStore.searchConceptFilter).toBe('all')
  })

  it('clears search query and concept filter via clearSearch', () => {
    const uiStore = useUiStore()
    uiStore.setSearchOpen(true)
    uiStore.setSearchQuery('concept name')
    uiStore.setSearchConceptFilter('Product')

    uiStore.clearSearch()
    expect(uiStore.searchQuery).toBe('')
    expect(uiStore.searchConceptFilter).toBe('all')
    expect(uiStore.isAllConceptsSelected).toBe(true)
    expect(uiStore.isSearchOpen).toBe(true)
  })

  it('supports selecting all and deselecting all concept pills', () => {
    const uiStore = useUiStore()
    expect(uiStore.isAllConceptsSelected).toBe(true)

    uiStore.deselectAllConcepts()
    expect(uiStore.isAllConceptsSelected).toBe(false)
    expect(uiStore.isConceptSelected('Market')).toBe(false)

    uiStore.selectAllConcepts()
    expect(uiStore.isAllConceptsSelected).toBe(true)
    expect(uiStore.isConceptSelected('Market')).toBe(true)
  })

  it('toggles concept selection individually', () => {
    const uiStore = useUiStore()
    const available = ['Market', 'Product', 'Feature']

    // Clicking Market when all are selected narrows selection to Market
    uiStore.toggleConceptFilter('Market', available)
    expect(uiStore.isAllConceptsSelected).toBe(false)
    expect(uiStore.isConceptSelected('Market')).toBe(true)
    expect(uiStore.isConceptSelected('Product')).toBe(false)

    // Toggle Product to include both Market and Product
    uiStore.toggleConceptFilter('Product', available)
    expect(uiStore.isConceptSelected('Market')).toBe(true)
    expect(uiStore.isConceptSelected('Product')).toBe(true)
    expect(uiStore.isConceptSelected('Feature')).toBe(false)
  })
})

