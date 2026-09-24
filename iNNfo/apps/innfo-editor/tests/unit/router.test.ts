import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '../../src/router'

describe('Router Legacy Route Deprecation (/innfo-doc & /info-doc)', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {
    setActivePinia(createPinia())
    router = createRouter({
      history: createMemoryHistory(),
      routes,
    })
  })

  it('redirects /innfo-doc to /', async () => {
    await router.push('/innfo-doc')
    expect(router.currentRoute.value.path).toBe('/')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('redirects /info-doc alias to /', async () => {
    await router.push('/info-doc')
    expect(router.currentRoute.value.path).toBe('/')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('preserves query parameters when redirecting /innfo-doc', async () => {
    await router.push('/innfo-doc?sample=ghostbusters&mode=demo')
    expect(router.currentRoute.value.path).toBe('/')
    expect(router.currentRoute.value.query).toEqual({
      sample: 'ghostbusters',
      mode: 'demo',
    })
  })

  it('preserves query parameters and hash when redirecting /info-doc', async () => {
    await router.push('/info-doc?file=test_01.md#section-1')
    expect(router.currentRoute.value.path).toBe('/')
    expect(router.currentRoute.value.query).toEqual({ file: 'test_01.md' })
    expect(router.currentRoute.value.hash).toBe('#section-1')
  })
})
