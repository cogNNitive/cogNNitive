import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FilePreviewModal from '../../src/components/editor/FilePreviewModal.vue'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { parseSourceRef } from '../../src/utils/sourceRef'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'

const markdownWithFrontmatter = `---
source_file: "sources/original/clientA/report.docx"
sha256: "abc123"
size_bytes: 42
normalized_at: "2026-01-01T00:00:00Z"
---

Normalized content line 1.
`

describe('FilePreviewModal', () => {
  let wrapper: ReturnType<typeof mount> | null = null

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const originalCreateObjectURL = URL.createObjectURL

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.restoreAllMocks()
    URL.createObjectURL = originalCreateObjectURL
  })

  it('does not render any sourceId badge (no synthetic id in the header)', async () => {
    const tree: FakeTree = {
      sources: {
        nn: {
          'report.md': markdownWithFrontmatter,
        },
      },
    }
    const handle = buildFakeTree('workspace', tree)
    const workspaceStore = useWorkspaceStore()
    workspaceStore.handle = handle

    const parsed = parseSourceRef('sources/nn/report.md')
    wrapper = mount(FilePreviewModal, {
      props: { isOpen: true, kind: 'source', filePath: parsed.filePath, fileName: parsed.fileName },
      attachTo: document.body,
    })

    // loadSourceContent() is async (handle traversal + frontmatter parse); wait for the
    // resolved source_file value, not just the always-present "Archivo Original" label.
    await vi.waitFor(() => {
      expect(document.body.textContent ?? '').toContain('sources/original/clientA/report.docx')
    })

    const bodyText = document.body.textContent ?? ''
    expect(bodyText).not.toContain('src-ref')
    expect(bodyText).toContain('Archivo Original')
  })

  it('opens the original file via the workspace handle when the "open original" button is clicked', async () => {
    const tree: FakeTree = {
      sources: {
        original: {
          clientA: {
            'report.docx': 'binary-ish content',
          },
        },
        nn: {
          'report.md': markdownWithFrontmatter,
        },
      },
    }
    const handle = buildFakeTree('workspace', tree)
    const workspaceStore = useWorkspaceStore()
    workspaceStore.handle = handle

    const createObjectURLSpy = vi.fn().mockReturnValue('blob:fake-url')
    // happy-dom does not implement URL.createObjectURL; stub it directly rather than spyOn.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(URL as any).createObjectURL = createObjectURLSpy
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    const parsed = parseSourceRef('sources/nn/report.md')
    wrapper = mount(FilePreviewModal, {
      props: { isOpen: true, kind: 'source', filePath: parsed.filePath, fileName: parsed.fileName },
      attachTo: document.body,
    })

    // Wait for loadSourceContent() to resolve frontmatter metadata and render the button.
    const openButton = await vi.waitFor(() => {
      const el = document.body.querySelector(
        'button[title="Abrir archivo original en una pestaña nueva"]',
      )
      if (!el) throw new Error('open-original button not yet rendered')
      return el as HTMLElement
    })

    openButton.click()

    await vi.waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalled()
    })
    expect(openSpy).toHaveBeenCalledWith('blob:fake-url', '_blank')
  })
})
