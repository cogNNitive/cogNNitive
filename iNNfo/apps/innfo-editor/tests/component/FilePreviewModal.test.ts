import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FilePreviewModal from '../../src/components/editor/FilePreviewModal.vue'
import MermaidWidget from '../../src/shared/widgets/MermaidWidget.vue'
import { useWorkspaceStore } from '../../src/stores/workspaceStore'
import { useKnowledgeStore } from '../../src/stores/knowledgeStore'
import { parseSourceRef } from '../../src/utils/sourceRef'
import { buildFakeTree, type FakeTree } from '../helpers/fakeFs'

const markdownWithFrontmatter = `---
source_file: "sources/import/clientA/report.docx"
sha256: "abc123"
size_bytes: 42
normalized_at: "2026-01-01T00:00:00Z"
---

Normalized content line 1.
`

const unitMd = [
  '# Overview', // 0
  '', // 1
  '## NN Person: Dr. Egon Spengler', // 2
  'compensation:: Equal partner share.', // 3
  '', // 4
].join('\n')

const unitCsv = ['cliente_id,mrr_usd', '101,45000', '104,78000', ''].join('\n')

describe('FilePreviewModal knowledge units', () => {
  let unitWrapper: ReturnType<typeof mount> | null = null

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    unitWrapper?.unmount()
    unitWrapper = null
  })

  async function mountWithContent(tree: FakeTree, props: Record<string, unknown>): Promise<void> {
    const handle = buildFakeTree('workspace', tree)
    const workspaceStore = useWorkspaceStore()
    workspaceStore.handle = handle
    unitWrapper = mount(FilePreviewModal, {
      props: { isOpen: true, kind: 'source', ...props },
      attachTo: document.body,
    })
  }

  it('highlights a Markdown field line for a field pointer', async () => {
    await mountWithContent(
      { sources: { import: { 'g.md': unitMd } } },
      {
        filePath: 'sources/import/g.md',
        fileName: 'g.md',
        unit: {
          kind: 'header',
          level: 2,
          text: 'NN Person: Dr. Egon Spengler',
          slug: 'nn-person--dr-egon-spengler',
        },
        subunits: ['compensation'],
      },
    )
    await vi.waitFor(() => {
      const hits = [...document.body.querySelectorAll('.unit-targeted')]
      if (!hits.some((el) => el.textContent?.includes('compensation::'))) {
        throw new Error('field line not highlighted yet')
      }
    })
  })

  it('renders a CSV table with the targeted row highlighted', async () => {
    await mountWithContent(
      { sources: { import: { 'm.csv': unitCsv } } },
      {
        filePath: 'sources/import/m.csv',
        fileName: 'm.csv',
        unit: { kind: 'row', id: '104' },
        subunits: [],
      },
    )
    await vi.waitFor(() => {
      const row = document.body.querySelector('[data-csv-row="1"]')
      if (!row || !row.textContent?.includes('78000')) {
        throw new Error('csv row not rendered yet')
      }
    })
    const row = document.body.querySelector('[data-csv-row="1"]')!
    expect(row.className).toContain('unit-targeted')
  })

  it('highlights the targeted CSV cell', async () => {
    await mountWithContent(
      { sources: { import: { 'm.csv': unitCsv } } },
      {
        filePath: 'sources/import/m.csv',
        fileName: 'm.csv',
        unit: { kind: 'row', id: '104' },
        subunits: ['mrr_usd'],
      },
    )
    await vi.waitFor(() => {
      const cell = document.body.querySelector('[data-csv-cell="1:1"]')
      if (!cell) throw new Error('csv cell not rendered yet')
    })
    const cell = document.body.querySelector('[data-csv-cell="1:1"]')!
    expect(cell.textContent).toContain('78000')
    expect(cell.className).toContain('unit-targeted')
  })
})

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

  it('does not render any sourceId badge (no synthetic id in the header) and renders English labels', async () => {
    const tree: FakeTree = {
      sources: {
        import: {
          'report.md': markdownWithFrontmatter,
        },
      },
    }
    const handle = buildFakeTree('workspace', tree)
    const workspaceStore = useWorkspaceStore()
    workspaceStore.handle = handle

    const parsed = parseSourceRef('sources/import/report.md')
    wrapper = mount(FilePreviewModal, {
      props: { isOpen: true, kind: 'source', filePath: parsed.filePath, fileName: parsed.fileName },
      attachTo: document.body,
    })

    // loadSourceContent() is async (handle traversal + frontmatter parse); wait for the
    // resolved source_file value, not just the always-present "Original File" label.
    await vi.waitFor(() => {
      expect(document.body.textContent ?? '').toContain('sources/import/clientA/report.docx')
    })

    const bodyText = document.body.textContent ?? ''
    expect(bodyText).not.toContain('src-ref')
    expect(bodyText).toContain('Original File')
    expect(bodyText).not.toContain('Archivo Original')
    expect(bodyText).not.toContain('Linaje')
  })

  it('opens the original file via the workspace handle when the "open original" button is clicked', async () => {
    const tree: FakeTree = {
      sources: {
        import: {
          clientA: {
            'report.docx': 'binary-ish content',
          },
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

    const parsed = parseSourceRef('sources/import/report.md')
    wrapper = mount(FilePreviewModal, {
      props: { isOpen: true, kind: 'source', filePath: parsed.filePath, fileName: parsed.fileName },
      attachTo: document.body,
    })

    // The Original File row is always present; wait for loadSourceContent() to
    // resolve frontmatter metadata so the open action is enabled with a source.
    const openButton = await vi.waitFor(() => {
      const el = document.body.querySelector(
        'button[title="Open original file in a new tab"]',
      ) as HTMLButtonElement | null
      if (!el || el.disabled) throw new Error('open-original button not yet enabled')
      return el
    })

    openButton.click()

    await vi.waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalled()
    })
    // The third argument isolates the opened tab from window.opener.
    expect(openSpy).toHaveBeenCalledWith('blob:fake-url', '_blank', 'noopener,noreferrer')
  })

  it('switches to the lineage view and renders the mermaid graph with upstream and downstream nodes', async () => {
    const tree: FakeTree = {
      sources: {
        import: {
          'report.md': markdownWithFrontmatter,
        },
      },
    }
    const handle = buildFakeTree('workspace', tree)
    const workspaceStore = useWorkspaceStore()
    workspaceStore.handle = handle

    const knowledgeStore = useKnowledgeStore()
    knowledgeStore.nodes['CaseStudy/Intro'] = {
      id: 'CaseStudy/Intro',
      name: 'Intro',
      parentId: 'CaseStudy',
      childIds: [],
      type: 'Section',
      fields: {},
      markers: {},
      relationships: [
        { targetId: 'CaseStudy/Conclusion', label: 'references', origin: 'metamodel' },
      ],
      rawSections: {},
      source: { path: 'kNNowledge/casestudy_V_0-1-0_business_NN.md' },
      sources: [
        {
          filePath: 'sources/import/report.md',
          fileName: 'report.md',
          kind: 'source',
          raw: 'sources/import/report.md',
        },
      ],
    } as any

    const parsed = parseSourceRef('sources/import/report.md')
    wrapper = mount(FilePreviewModal, {
      props: { isOpen: true, kind: 'source', filePath: parsed.filePath, fileName: parsed.fileName },
      attachTo: document.body,
    })

    // Wait for loadSourceContent() to resolve frontmatter so the upstream node is available.
    await vi.waitFor(() => {
      expect(document.body.textContent ?? '').toContain('sources/import/clientA/report.docx')
    })

    const lineageButton = document.body.querySelector(
      'button[aria-label="Lineage"]',
    ) as HTMLButtonElement | null
    expect(lineageButton).toBeTruthy()

    lineageButton!.click()
    // The Lineage tab opens on Timeline by default; select Graph to assert the
    // Mermaid definition.
    const graphButton = await vi.waitFor(() => {
      const btn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Graph'),
      )
      if (!btn) throw new Error('Graph style button not rendered yet')
      return btn as HTMLButtonElement
    })
    graphButton.click()
    await vi.waitFor(() => {
      expect(document.body.querySelector('.widget-mermaid')).toBeTruthy()
    })

    // The lineage graph must render the Mermaid widget and the downstream/upstream nodes, not the empty state.
    expect(document.body.textContent ?? '').not.toContain('No lineage information available')
    const mermaidWidget = wrapper.findComponent(MermaidWidget)
    if (mermaidWidget.exists()) {
      const code = mermaidWidget.props('modelValue') as string
      expect(code).toContain('FOCAL')
      expect(code).toContain('UP -->|normalized| FOCAL')
      expect(code).not.toContain('normalizado')
      expect(code).toContain('Intro')
    }
  })

  it('renders the lineage graph at natural size, top-down', async () => {
    const tree: FakeTree = {
      sources: {
        import: {
          'report.md': markdownWithFrontmatter,
        },
      },
    }
    const handle = buildFakeTree('workspace', tree)
    const workspaceStore = useWorkspaceStore()
    workspaceStore.handle = handle

    const parsed = parseSourceRef('sources/import/report.md')
    wrapper = mount(FilePreviewModal, {
      props: { isOpen: true, kind: 'source', filePath: parsed.filePath, fileName: parsed.fileName },
      attachTo: document.body,
    })

    await vi.waitFor(() => {
      expect(document.body.textContent ?? '').toContain('sources/import/clientA/report.docx')
    })

    const lineageButton = document.body.querySelector(
      'button[aria-label="Lineage"]',
    ) as HTMLButtonElement | null
    lineageButton!.click()

    const graphButton = await vi.waitFor(() => {
      const btn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Graph'),
      )
      if (!btn) throw new Error('Graph style button not rendered yet')
      return btn as HTMLButtonElement
    })
    graphButton.click()

    await vi.waitFor(() => {
      expect(document.body.querySelector('.widget-mermaid')).toBeTruthy()
    })

    const mermaidWidget = wrapper.findComponent(MermaidWidget)
    const code = mermaidWidget.props('modelValue') as string
    expect(code.startsWith('%%{init: {"flowchart": {"useMaxWidth": false}}}%%\ngraph TD')).toBe(
      true,
    )
  })

  it('collapses the 4th-level outgoing relationships by default and expands them via the toggle', async () => {
    const tree: FakeTree = {
      sources: {
        import: {
          'report.md': markdownWithFrontmatter,
        },
      },
    }
    const handle = buildFakeTree('workspace', tree)
    const workspaceStore = useWorkspaceStore()
    workspaceStore.handle = handle

    const knowledgeStore = useKnowledgeStore()
    knowledgeStore.nodes['Rel/A'] = { id: 'Rel/A', name: 'A', type: 'Section' } as any
    knowledgeStore.nodes['Rel/B'] = { id: 'Rel/B', name: 'B', type: 'Section' } as any
    knowledgeStore.nodes['Rel/C'] = { id: 'Rel/C', name: 'C', type: 'Section' } as any
    knowledgeStore.nodes['Rel/D'] = { id: 'Rel/D', name: 'D', type: 'Section' } as any
    knowledgeStore.nodes['Rel/E'] = { id: 'Rel/E', name: 'E', type: 'Section' } as any
    knowledgeStore.nodes['CaseStudy/Intro'] = {
      id: 'CaseStudy/Intro',
      name: 'Intro',
      parentId: 'CaseStudy',
      childIds: [],
      type: 'Section',
      fields: {},
      markers: {},
      relationships: [
        { targetId: 'Rel/A', label: 'references', origin: 'metamodel' },
        { targetId: 'Rel/B', label: 'references', origin: 'metamodel' },
        { targetId: 'Rel/C', label: 'references', origin: 'metamodel' },
        { targetId: 'Rel/D', label: 'references', origin: 'metamodel' },
        { targetId: 'Rel/E', label: 'references', origin: 'metamodel' },
      ],
      rawSections: {},
      source: { path: 'kNNowledge/casestudy_V_0-1-0_business_NN.md' },
      sources: [
        {
          filePath: 'sources/import/report.md',
          fileName: 'report.md',
          kind: 'source',
          raw: 'sources/import/report.md',
        },
      ],
    } as any

    const parsed = parseSourceRef('sources/import/report.md')
    wrapper = mount(FilePreviewModal, {
      props: { isOpen: true, kind: 'source', filePath: parsed.filePath, fileName: parsed.fileName },
      attachTo: document.body,
    })

    await vi.waitFor(() => {
      expect(document.body.textContent ?? '').toContain('sources/import/clientA/report.docx')
    })

    const lineageButton = document.body.querySelector(
      'button[aria-label="Lineage"]',
    ) as HTMLButtonElement | null
    lineageButton!.click()

    const graphButton = await vi.waitFor(() => {
      const btn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Graph'),
      )
      if (!btn) throw new Error('Graph style button not rendered yet')
      return btn as HTMLButtonElement
    })
    graphButton.click()

    await vi.waitFor(() => {
      expect(document.body.querySelector('.widget-mermaid')).toBeTruthy()
    })

    const mermaidWidget = wrapper.findComponent(MermaidWidget)

    // Collapsed by default: no R_x_y nodes, a "+5 hidden" node instead.
    await vi.waitFor(() => {
      const code = mermaidWidget.props('modelValue') as string
      if (!code.includes('+5 hidden')) throw new Error('not collapsed yet')
    })
    let code = mermaidWidget.props('modelValue') as string
    expect(code).toContain('+5 hidden')
    expect(code).not.toMatch(/R_0_\d+\[/)

    const toggleButton = Array.from(document.body.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('hidden'),
    )
    expect(toggleButton).toBeTruthy()

    toggleButton!.click()

    await vi.waitFor(() => {
      code = mermaidWidget.props('modelValue') as string
      if (!code.includes('R_0_0[')) throw new Error('not expanded yet')
    })
    code = mermaidWidget.props('modelValue') as string
    expect(code).toContain('R_0_0[')
    expect(code).toContain('R_0_1[')
    expect(code).toContain('R_0_2[')
    expect(code).toContain('+2 hidden')
    expect(code).not.toContain('+5 hidden')
  })

  it('shows no collapse toggle when the deepest outgoing chain is only 3 levels', async () => {
    const tree: FakeTree = {
      sources: {
        import: {
          'report.md': markdownWithFrontmatter,
        },
      },
    }
    const handle = buildFakeTree('workspace', tree)
    const workspaceStore = useWorkspaceStore()
    workspaceStore.handle = handle

    const knowledgeStore = useKnowledgeStore()
    knowledgeStore.nodes['CaseStudy/Intro'] = {
      id: 'CaseStudy/Intro',
      name: 'Intro',
      parentId: 'CaseStudy',
      childIds: [],
      type: 'Section',
      fields: {},
      markers: {},
      // No outgoing relationships: the chain stops at UP -> FOCAL -> citing node
      // (3 levels), so there is no 4th level to collapse.
      relationships: [],
      rawSections: {},
      source: { path: 'kNNowledge/casestudy_V_0-1-0_business_NN.md' },
      sources: [
        {
          filePath: 'sources/import/report.md',
          fileName: 'report.md',
          kind: 'source',
          raw: 'sources/import/report.md',
        },
      ],
    } as any

    const parsed = parseSourceRef('sources/import/report.md')
    wrapper = mount(FilePreviewModal, {
      props: { isOpen: true, kind: 'source', filePath: parsed.filePath, fileName: parsed.fileName },
      attachTo: document.body,
    })

    await vi.waitFor(() => {
      expect(document.body.textContent ?? '').toContain('sources/import/clientA/report.docx')
    })

    const lineageButton = document.body.querySelector(
      'button[aria-label="Lineage"]',
    ) as HTMLButtonElement | null
    lineageButton!.click()

    const graphButton = await vi.waitFor(() => {
      const btn = Array.from(document.body.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Graph'),
      )
      if (!btn) throw new Error('Graph style button not rendered yet')
      return btn as HTMLButtonElement
    })
    graphButton.click()

    await vi.waitFor(() => {
      expect(document.body.querySelector('.widget-mermaid')).toBeTruthy()
    })

    const toggleButton = Array.from(document.body.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('hidden'),
    )
    expect(toggleButton).toBeUndefined()
  })

  it('renders no Spanish UI strings in template or script', async () => {
    const tree: FakeTree = {
      sources: {
        import: {
          'report.md': markdownWithFrontmatter,
        },
      },
    }
    const handle = buildFakeTree('workspace', tree)
    const workspaceStore = useWorkspaceStore()
    workspaceStore.handle = handle

    const parsed = parseSourceRef('sources/import/report.md')
    wrapper = mount(FilePreviewModal, {
      props: { isOpen: true, kind: 'source', filePath: parsed.filePath, fileName: parsed.fileName },
      attachTo: document.body,
    })

    await vi.waitFor(() => {
      expect(document.body.textContent ?? '').toContain('sources/import/clientA/report.docx')
    })

    const text = document.body.textContent ?? ''
    expect(text).not.toContain('Archivo Original')
    expect(text).not.toContain('Linaje')
    expect(text).not.toContain('Vista Previa')
    expect(text).not.toContain('Código')
    expect(text).not.toContain('Normalizado')
    expect(text).not.toContain('Cerrar')
  })

  it('keeps the Original File row visible and disabled when there is no source_file', async () => {
    const tree: FakeTree = {
      sources: { import: { 'plain.md': '# Title\n\nBody without frontmatter.\n' } },
    }
    const handle = buildFakeTree('workspace', tree)
    useWorkspaceStore().handle = handle

    wrapper = mount(FilePreviewModal, {
      props: {
        isOpen: true,
        kind: 'source',
        filePath: 'sources/import/plain.md',
        fileName: 'plain.md',
      },
      attachTo: document.body,
    })

    await vi.waitFor(() => {
      const label = Array.from(document.body.querySelectorAll('span')).find((s) =>
        s.textContent?.includes('Original File'),
      )
      if (!label) throw new Error('Original File row not rendered yet')
    })

    const openButton = document.body.querySelector(
      'button[title="Open original file in a new tab"]',
    ) as HTMLButtonElement
    expect(openButton).toBeTruthy()
    expect(openButton.disabled).toBe(true)
    expect(document.body.textContent ?? '').toContain('No source in frontmatter')
  })

  it('hides low-signal metadata by default and reveals it from the more-menu', async () => {
    const tree: FakeTree = {
      sources: { import: { 'report.md': markdownWithFrontmatter } },
    }
    const handle = buildFakeTree('workspace', tree)
    useWorkspaceStore().handle = handle

    wrapper = mount(FilePreviewModal, {
      props: {
        isOpen: true,
        kind: 'source',
        filePath: 'sources/import/report.md',
        fileName: 'report.md',
      },
      attachTo: document.body,
    })

    await vi.waitFor(() => {
      expect(document.body.textContent ?? '').toContain('sources/import/clientA/report.docx')
    })

    expect(document.body.textContent ?? '').not.toContain('SHA-256 Hash')
    expect(document.body.textContent ?? '').not.toContain('Size / Status')
    expect(document.body.textContent ?? '').not.toContain('Normalized At')

    const moreButton = document.body.querySelector(
      'button[aria-label="File metadata"]',
    ) as HTMLButtonElement
    moreButton.click()

    await vi.waitFor(() => {
      expect(document.body.textContent ?? '').toContain('SHA-256 Hash')
    })
    expect(document.body.textContent ?? '').toContain('Size / Status')
    expect(document.body.textContent ?? '').toContain('Normalized At')
  })

  it('opens a unit-pointed Markdown file in Preview (not Code)', async () => {
    const tree: FakeTree = {
      sources: { import: { 'g.md': unitMd } },
    }
    const handle = buildFakeTree('workspace', tree)
    useWorkspaceStore().handle = handle

    wrapper = mount(FilePreviewModal, {
      props: {
        isOpen: true,
        kind: 'source',
        filePath: 'sources/import/g.md',
        fileName: 'g.md',
        unit: {
          kind: 'header',
          level: 2,
          text: 'NN Person: Dr. Egon Spengler',
          slug: 'nn-person--dr-egon-spengler',
        },
        subunits: [],
      },
      attachTo: document.body,
    })

    await vi.waitFor(() => {
      expect(document.body.querySelector('.markdown-body')).toBeTruthy()
    })
    expect(document.body.querySelector('.markdown-body')!.textContent ?? '').toContain(
      'Dr. Egon Spengler',
    )
  })

  it('opens the Lineage tab on Timeline and shows the element id and slug', async () => {
    const tree: FakeTree = {
      sources: { import: { 'report.md': markdownWithFrontmatter } },
    }
    const handle = buildFakeTree('workspace', tree)
    useWorkspaceStore().handle = handle

    const knowledgeStore = useKnowledgeStore()
    knowledgeStore.nodes['Compras/Pagos/Registrar'] = {
      id: 'Compras/Pagos/Registrar',
      name: 'Registrar Pago',
      type: 'Procedure',
      slug: 'registrar-pago',
      parentId: 'Compras',
      childIds: [],
      fields: {},
      markers: {},
      relationships: [],
      rawSections: {},
      source: { path: 'kNNowledge/compras_V_0-1-0_business_NN.md' },
      sources: [
        {
          filePath: 'sources/import/report.md',
          fileName: 'report.md',
          kind: 'source',
          raw: 'sources/import/report.md',
        },
      ],
    } as any

    wrapper = mount(FilePreviewModal, {
      props: {
        isOpen: true,
        kind: 'source',
        filePath: 'sources/import/report.md',
        fileName: 'report.md',
      },
      attachTo: document.body,
    })

    await vi.waitFor(() => {
      expect(document.body.textContent ?? '').toContain('sources/import/clientA/report.docx')
    })

    const lineageButton = document.body.querySelector(
      'button[aria-label="Lineage"]',
    ) as HTMLButtonElement
    lineageButton.click()

    await vi.waitFor(() => {
      expect(document.body.textContent ?? '').toContain('Compras/Pagos/Registrar')
    })

    // Timeline is the default style: no Mermaid widget until Graph is selected.
    expect(document.body.querySelector('.widget-mermaid')).toBeFalsy()
    const text = document.body.textContent ?? ''
    expect(text).toContain('Procedure: Registrar Pago')
    expect(text).toContain('slug: registrar-pago')
  })

  it('does not render the traceability footer band', async () => {
    const tree: FakeTree = {
      sources: { import: { 'report.md': markdownWithFrontmatter } },
    }
    const handle = buildFakeTree('workspace', tree)
    useWorkspaceStore().handle = handle

    wrapper = mount(FilePreviewModal, {
      props: {
        isOpen: true,
        kind: 'source',
        filePath: 'sources/import/report.md',
        fileName: 'report.md',
      },
      attachTo: document.body,
    })

    await vi.waitFor(() => {
      expect(document.body.textContent ?? '').toContain('sources/import/clientA/report.docx')
    })

    expect(document.body.textContent ?? '').not.toContain('Traceability verified with iNNfo')
    const closeButton = document.body.querySelector(
      'button[title="Close (Esc)"]',
    ) as HTMLButtonElement
    expect(closeButton).toBeTruthy()
  })
})


