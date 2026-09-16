import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ConsoleHubView from '../../src/components/editor/ConsoleHubView.vue'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { buildFakeTree } from '../helpers/fakeFs'

describe('ConsoleHubView — Open External (F-16)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('resolves through the file handle (Blob URL) when a local folder handle is active', async () => {
    const workspaceStore = useWorkspaceStore()
    workspaceStore.handle = buildFakeTree('workspace', {
      artifacts: {
        'workspace_hub.html': '<html><body>Hub</body></html>',
      },
    })

    const wrapper = mount(ConsoleHubView)
    await flushPromises()

    const link = wrapper.find('a[title="Open in external browser window"]')
    expect(link.exists()).toBe(true)
    // A bare relative path resolves against the app origin and 404s for a
    // local folder opened via the File System Access API — it must be a
    // Blob URL built from the already-read file content instead.
    expect(link.attributes('href')).toMatch(/^blob:/)

    wrapper.unmount()
  })

  it('keeps the plain relative/URL path when no folder handle is active (hosted/sample mode)', async () => {
    const wrapper = mount(ConsoleHubView)
    await flushPromises()

    const link = wrapper.find('a[title="Open in external browser window"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).not.toMatch(/^blob:/)

    wrapper.unmount()
  })
})
