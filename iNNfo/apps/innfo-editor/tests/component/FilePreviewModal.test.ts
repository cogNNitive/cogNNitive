import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FilePreviewModal from '../../src/components/editor/FilePreviewModal.vue'
import MermaidWidget from '../../src/shared/widgets/MermaidWidget.vue'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { useModelStore } from '../../src/stores/modelStore'
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

  it('switches to the lineage view and renders the mermaid graph with upstream and downstream nodes', async () => {
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

    const modelStore = useModelStore()
    modelStore.nodes['CaseStudy/Intro'] = {
      id: 'CaseStudy/Intro',
      name: 'Intro',
      parentId: 'CaseStudy',
      childIds: [],
      type: 'Section',
      fields: {},
      markers: {},
      relationships: [{ targetId: 'CaseStudy/Conclusion', label: 'references', origin: 'metamodel' }],
      rawSections: {},
      source: { path: 'models/casestudy_V_0-1-0_business_NN.md' },
      sources: [
        {
          filePath: 'sources/nn/report.md',
          fileName: 'report.md',
          kind: 'source',
          raw: 'sources/nn/report.md',
        },
      ],
    } as any

    const parsed = parseSourceRef('sources/nn/report.md')
    wrapper = mount(FilePreviewModal, {
      props: { isOpen: true, kind: 'source', filePath: parsed.filePath, fileName: parsed.fileName },
      attachTo: document.body,
    })

    // Wait for loadSourceContent() to resolve frontmatter so the upstream node is available.
    await vi.waitFor(() => {
      expect(document.body.textContent ?? '').toContain('sources/original/clientA/report.docx')
    })

    const lineageButton = Array.from(document.body.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('Linaje'),
    )
    expect(lineageButton).toBeTruthy()

    lineageButton!.click()
    await vi.waitFor(() => {
      expect(document.body.querySelector('.widget-mermaid')).toBeTruthy()
    })

    // The lineage graph must render the Mermaid widget and the downstream/upstream nodes, not the empty state.
    expect(document.body.textContent ?? '').not.toContain('No hay información de linaje')
    const mermaidWidget = wrapper.findComponent(MermaidWidget)
    if (mermaidWidget.exists()) {
      const code = mermaidWidget.props('modelValue') as string
      expect(code).toContain('FOCAL')
      expect(code).toContain('UP -->|normalizado| FOCAL')
      expect(code).toContain('Intro')
    }
  })
})
