import { describe, it, expect, expectTypeOf } from 'vitest'
import { useUiStore, type ActiveView } from '../../src/stores/uiStore'
import { setActivePinia, createPinia } from 'pinia'

describe('ActiveView type', () => {
  it('includes "import" and "export" in the union type', () => {
    // Type-level assertion: these should be valid members of ActiveView
    expectTypeOf<'import'>().toMatchTypeOf<ActiveView>()
    expectTypeOf<'export'>().toMatchTypeOf<ActiveView>()
  })

  it('still includes existing values', () => {
    expectTypeOf<'editor'>().toMatchTypeOf<ActiveView>()
    expectTypeOf<'graph'>().toMatchTypeOf<ActiveView>()
    expectTypeOf<'ai-guide'>().toMatchTypeOf<ActiveView>()
  })

  it('setActiveView accepts "import" and "export"', () => {
    setActivePinia(createPinia())
    const uiStore = useUiStore()

    uiStore.setActiveView('import')
    expect(uiStore.activeView).toBe('import')

    uiStore.setActiveView('export')
    expect(uiStore.activeView).toBe('export')
  })
})
