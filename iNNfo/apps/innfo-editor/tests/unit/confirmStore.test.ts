import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConfirmStore } from '../../src/stores/confirmStore'

describe('confirmStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts closed with no options', () => {
    const store = useConfirmStore()
    expect(store.isOpen).toBe(false)
    expect(store.options).toBeNull()
  })

  it('resolve(true) settles the confirm promise with true and closes', async () => {
    const store = useConfirmStore()
    const promise = store.confirm({
      title: 'Delete element?',
      message: 'This will permanently remove the element and all its content.',
      confirmLabel: 'Delete',
      danger: true,
    })
    expect(store.isOpen).toBe(true)
    expect(store.options?.title).toBe('Delete element?')
    store.resolve(true)
    await expect(promise).resolves.toBe(true)
    expect(store.isOpen).toBe(false)
    expect(store.options).toBeNull()
  })

  it('resolve(false) settles the confirm promise with false and closes', async () => {
    const store = useConfirmStore()
    const promise = store.confirm({
      title: 'Delete concept?',
      message: 'This will permanently remove the concept and all its content.',
    })
    expect(store.isOpen).toBe(true)
    store.resolve(false)
    await expect(promise).resolves.toBe(false)
    expect(store.isOpen).toBe(false)
    expect(store.options).toBeNull()
  })

  it('keeps the default labels and danger flag in options', () => {
    const store = useConfirmStore()
    store.confirm({ title: 'Delete element?' })
    expect(store.options).toEqual({
      title: 'Delete element?',
      danger: undefined,
      cancelLabel: undefined,
      confirmLabel: undefined,
    })
  })
})
