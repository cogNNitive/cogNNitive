import { test, expect } from '@playwright/test'
import { loadHomePage } from './helpers/setup'

/**
 * Creates a mock tree matching Sandbox/mini test/ files
 * with correct _NN syntax for the parser.
 */
const _MOCK_MINI_TEST: Record<string, any> = {
  'index.md': '# _NN index\n\n* [[HolaMundo_V_0-0-1_business_NN.md]]\n',
  'HolaMundo_V_0-0-1_business_NN.md': `---
spec_version: "V_0-1-5"
spec_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/v0.1.5/specs/FORMAT_V_0-1-5_F.md"
level: 3
parent_spec:
  name: "business_V_0-1-1"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/v0.1.1/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Hola Mundo — CogNNitive Test"
---

> [!NOTE]
> Mini modelo de prueba

# _NN index

* _NN index: Productos
* _NN index: Clientes

# _NN Productos

* _NN Productos: CogNNitive
  \x60\x60\x60yaml
  tipo: software
  version: V_0-0-1
  \x60\x60\x60
  La plataforma central.

* _NN Productos: Innfo Editor
  \x60\x60\x60yaml
  tipo: editor
  version: V_0-0-1
  \x60\x60\x60
  Editor visual.

# _NN Clientes

* _NN Clientes: Desarrolladores
  \x60\x60\x60yaml
  segmento: tech
  prioridad: alta
  \x60\x60\x60
  Equipos que modelan.

* _NN Clientes: Arquitectos
  \x60\x60\x60yaml
  segmento: enterprise
  prioridad: media
  \x60\x60\x60
  Disenan sistemas.

# _NN matrices: producto-cliente matrix

| Producto \\\\ Cliente | Desarrolladores | Arquitectos |
| :--- | :---: | :---: |
| CogNNitive | Core | Core |
| Innfo Editor | Core | Extended |
`,
}

/**
 * Custom injector for mini test tree — same pattern as setup.ts
 * but with our own mock data.
 */
async function injectMiniTestMock(page: any, context: any) {
  await context.addInitScript(() => {
    const MOCK_TREE: Record<string, any> = {
      'index.md': '# _NN index\n\n* [[HolaMundo_V_0-0-1_business_NN.md]]\n',
      'HolaMundo_V_0-0-1_business_NN.md': `---
spec_version: "V_0-1-5"
spec_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/v0.1.5/specs/FORMAT_V_0-1-5_F.md"
level: 3
parent_spec:
  name: "business_V_0-1-1"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/v0.1.1/specs/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Hola Mundo — CogNNitive Test"
---

> [!NOTE]
> Mini modelo de prueba

# _NN index

* _NN index: Productos
* _NN index: Clientes

# _NN Productos

* _NN Productos: CogNNitive
  \x60\x60\x60yaml
  tipo: software
  version: V_0-0-1
  \x60\x60\x60
  La plataforma central.

* _NN Productos: Innfo Editor
  \x60\x60\x60yaml
  tipo: editor
  version: V_0-0-1
  \x60\x60\x60
  Editor visual.

# _NN Clientes

* _NN Clientes: Desarrolladores
  \x60\x60\x60yaml
  segmento: tech
  prioridad: alta
  \x60\x60\x60
  Equipos que modelan.

* _NN Clientes: Arquitectos
  \x60\x60\x60yaml
  segmento: enterprise
  prioridad: media
  \x60\x60\x60
  Disenan sistemas.

# _NN matrices: producto-cliente matrix

| Producto \\\\ Cliente | Desarrolladores | Arquitectos |
| :--- | :---: | :---: |
| CogNNitive | Core | Core |
| Innfo Editor | Core | Extended |
`,
    }

    class MockDirectoryHandle {
      kind = 'directory'
      name: string
      private tree: Record<string, any>
      constructor(name: string, tree: Record<string, any>) {
        this.name = name
        this.tree = tree
      }
      async *entries(): AsyncIterableIterator<[string, any]> {
        for (const [entryName, value] of Object.entries(this.tree)) {
          if (typeof value === 'string') {
            yield [entryName, new MockFileHandle(entryName, value)]
          } else {
            yield [entryName, new MockDirectoryHandle(entryName, value)]
          }
        }
      }
      async getFileHandle(name: string, _opts?: any): Promise<any> {
        const v = this.tree[name]
        if (typeof v !== 'string') throw new Error('File not found: ' + name)
        return new MockFileHandle(name, v)
      }
      async getDirectoryHandle(name: string, _opts?: any): Promise<any> {
        throw new Error('Directory not found: ' + name)
      }
    }

    class MockFileHandle {
      kind = 'file'
      name: string
      private content: string
      constructor(name: string, content: string) {
        this.name = name
        this.content = content
      }
      async getFile() {
        return { text: () => this.content }
      }
      async createWritable() {
        const that = this
        return {
          async write(data: string) {
            that.content = data
          },
          async close() {},
        }
      }
    }

    const rootHandle = new MockDirectoryHandle('mini test', MOCK_TREE)
    ;(window as any).showDirectoryPicker = async () => rootHandle
    ;(window as any).showOpenFilePicker = async () => {
      return [
        new MockFileHandle(
          'HolaMundo_V_0-0-1_business_NN.md',
          MOCK_TREE['HolaMundo_V_0-0-1_business_NN.md'],
        ),
      ]
    }
    ;(navigator as any).clipboard = { writeText: async () => {}, readText: async () => '' }
  })
}

test.describe('BUG REPORT: Mini Test Workspace — Full Functional Audit', () => {
  let _bugs: string[] = []

  test.beforeEach(async ({ page, context }) => {
    _bugs = []
    await injectMiniTestMock(page, context)
    await loadHomePage(page)
  })

  test.afterEach(async ({ page }) => {
    // Take screenshot for debugging
    await page
      .screenshot({ path: `e2e-fixtures/bug-report-${test.info().title.replace(/\s+/g, '-')}.png` })
      .catch(() => {})
  })

  test('B1: Home page loads and shows Open folder button', async ({ page }) => {
    const title = page.getByRole('heading', { name: /format-editor/i })
    await expect(title).toBeVisible()
    const openBtn = page.locator('button', { hasText: /Open folder/i }).first()
    await expect(openBtn).toBeVisible()
    await expect(openBtn).toBeEnabled()
  })

  test('B2: Open folder navigates to workspace and shows tree', async ({ page }) => {
    const folderBtn = page.locator('button', { hasText: /Open folder/i }).first()
    await folderBtn.click()

    // Should navigate to /workspace
    await page.waitForURL('**/workspace', { timeout: 15000 })
    await expect(page).toHaveURL(/\/workspace/)

    // Check parse issues banner
    const parseIssueBanner = page.locator('text=Workspace loaded with issues')
    const hasParseIssues = await parseIssueBanner.isVisible().catch(() => false)

    // Check if HolaMundo appears in tree
    const treeNode = page.getByText('Hola Mundo').or(page.getByText('HolaMundo')).first()
    const treeVisible = await treeNode.isVisible().catch(() => false)

    const findings = {
      navigatedToWorkspace: true,
      hasParseIssues,
      treeNodesVisible: treeVisible,
    }
    console.log('B2 findings:', JSON.stringify(findings))
    await expect(page.getByText('← Home').or(page.getByText(/Home/i))).toBeVisible()
  })

  test('B3: Model heading and concept nodes render correctly', async ({ page }) => {
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })

    // Try to expand all nodes
    const expandBtn = page.getByTitle('Expand All').first()
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click()
    }

    // Check for HolaMundo name somewhere
    const pageText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    console.log('B3 page text excerpt:', pageText.substring(0, 500))

    // Check for the "Model" heading (left sidebar)
    const modelHeading = page.getByRole('heading', { name: 'Model', exact: true })
    const hasModel = await modelHeading.isVisible().catch(() => false)

    // Check if any concept names are visible
    const productText = page.getByText('Productos').first()
    const clientText = page.getByText('Clientes').first()
    const hasProduct = await productText.isVisible().catch(() => false)
    const hasClient = await clientText.isVisible().catch(() => false)

    console.log('B3 findings:', JSON.stringify({ hasModel, hasProduct, hasClient }))
  })

  test('B4: Expand/Collapse controls exist in sidebar', async ({ page }) => {
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })

    const expandBtn = page.getByTitle('Expand All').or(page.getByTestId('expand-all'))
    const collapseBtn = page.getByTitle('Collapse All').or(page.getByTestId('collapse-all'))

    const expandVisible = await expandBtn
      .first()
      .isVisible()
      .catch(() => false)
    const collapseVisible = await collapseBtn
      .first()
      .isVisible()
      .catch(() => false)

    console.log('B4 findings:', JSON.stringify({ expandVisible, collapseVisible }))
  })

  test('B5: Toolbar shows view switcher and Validate button', async ({ page }) => {
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })

    // View switcher: editor / graph / matrices / info
    const editorTab = page.getByText('editor', { exact: true })
    const graphTab = page.getByText('graph', { exact: true })
    const matricesTab = page.getByText('matrices', { exact: true })
    const infoTab = page.getByText('info', { exact: true })

    const viewsVisible = {
      editor: await editorTab.isVisible().catch(() => false),
      graph: await graphTab.isVisible().catch(() => false),
      matrices: await matricesTab.isVisible().catch(() => false),
      info: await infoTab.isVisible().catch(() => false),
    }

    // Validate button
    const validateBtn = page.getByText('Validate')
    const validateVisible = await validateBtn.isVisible().catch(() => false)
    const validateDisabled = await validateBtn.isDisabled().catch(() => false)

    console.log(
      'B5 findings:',
      JSON.stringify({
        viewsVisible,
        validateVisible,
        validateDisabledWhenNoNode: validateDisabled,
      }),
    )
  })

  test('B6: Select a tree node and see BlockSheet / editor', async ({ page }) => {
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })

    // Try clicking the first visible text that looks like a node
    const possibleNodes = page.locator(
      '[class*="tree"] span, [class*="node"] span, li span, div span',
    )
    const nodeCount = await possibleNodes.count()
    console.log('B6: possible node-like elements:', nodeCount)

    // Try clicking anything that says "Productos" or "Clientes"
    for (const label of [
      'Productos',
      'Clientes',
      'CogNNitive',
      'Innfo Editor',
      'Desarrolladores',
      'Arquitectos',
    ]) {
      const el = page.getByText(label, { exact: true }).first()
      const visible = await el.isVisible().catch(() => false)
      if (visible) {
        console.log(`B6: found visible element: "${label}"`)
        await el.click()
        // Wait a beat for selection
        await page.waitForTimeout(500)
        // Check if "No node selected" text is gone from toolbar
        const noNode = page.getByText('No node selected')
        const nodeSelected = !(await noNode.isVisible().catch(() => false))
        console.log(`B6: after clicking "${label}", nodeSelected:`, nodeSelected)
        break
      }
    }
  })

  test('B7: View switcher tabs (graph, matrices, info) render content', async ({ page }) => {
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })

    // Graph view
    const graphTab = page.getByText('graph', { exact: true })
    if (await graphTab.isVisible().catch(() => false)) {
      await graphTab.click()
      await page.waitForTimeout(500)
      const svgGraph = page.locator('svg').first()
      const graphVisible = await svgGraph.isVisible().catch(() => false)
      console.log('B7: graph view SVG visible:', graphVisible)
    }

    // Info view
    const infoTab = page.getByText('info', { exact: true })
    if (await infoTab.isVisible().catch(() => false)) {
      await infoTab.click()
      await page.waitForTimeout(500)
      const infoText = await page
        .locator('body')
        .innerText()
        .catch(() => '')
      console.log('B7: info view text:', infoText.substring(0, 200))
    }

    // Matrices view
    const matricesTab = page.getByText('matrices', { exact: true })
    if (await matricesTab.isVisible().catch(() => false)) {
      await matricesTab.click()
      await page.waitForTimeout(500)
      const matricesText = await page
        .locator('body')
        .innerText()
        .catch(() => '')
      const hasMatrixTable = matricesText.includes('Producto') || matricesText.includes('Cliente')
      console.log('B7: matrices view shows matrix:', hasMatrixTable)
    }
  })

  test('B8: Validate button works on selected node', async ({ page }) => {
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })

    // Expand all to reveal nodes
    const expandBtn = page.getByTitle('Expand All').first()
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click()
      await page.waitForTimeout(500)
    }

    // Try selecting a node and clicking Validate
    for (const label of ['HolaMundo', 'Productos', 'Clientes']) {
      const el = page.getByText(label).first()
      if (await el.isVisible().catch(() => false)) {
        await el.click()
        await page.waitForTimeout(300)

        const validateBtn = page.getByText('Validate')
        const isDisabled = await validateBtn.isDisabled().catch(() => true)
        if (!isDisabled) {
          await validateBtn.click()
          await page.waitForTimeout(2000)
          const bodyText = await page
            .locator('body')
            .innerText()
            .catch(() => '')
          console.log(`B8: after Validate on "${label}":`, bodyText.substring(0, 300))
        } else {
          console.log(`B8: Validate button is disabled for "${label}"`)
        }
        break
      }
    }
  })

  test('B9: Console errors during full workflow', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })
    await page.waitForTimeout(1000)

    // Try all views
    for (const view of ['graph', 'matrices', 'info']) {
      const tab = page.getByText(view, { exact: true })
      if (await tab.isVisible().catch(() => false)) {
        await tab.click()
        await page.waitForTimeout(500)
      }
    }

    const expandBtn = page.getByTitle('Expand All').first()
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click()
      await page.waitForTimeout(500)
    }

    console.log('B9: console errors:', JSON.stringify(errors))
    expect(errors.filter((e) => !e.includes('favicon.ico'))).toEqual([])
  })

  test('B10: Parse issues — check if index.md parsing caused errors', async ({ page }) => {
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })

    const parseBanner = page.locator('text=Workspace loaded with issues')
    const hasBanner = await parseBanner.isVisible().catch(() => false)
    let issuesDetail = ''
    if (hasBanner) {
      // Read the issues
      const listItems = page
        .locator('text=Workspace loaded with issues')
        .locator('..')
        .locator('li')
      const count = await listItems.count()
      for (let i = 0; i < count; i++) {
        issuesDetail += (await listItems.nth(i).innerText()) + '\n'
      }
    }
    console.log(
      'B10: parse issues:',
      JSON.stringify({ hasBanner, count: issuesDetail.length, detail: issuesDetail }),
    )
  })

  test('B11: Full snapshot — visual regression check', async ({ page }) => {
    // Home page
    await expect(page.locator('h1')).toBeVisible()
    await page.screenshot({ path: 'e2e-fixtures/01-home.png' }).catch(() => {})

    // Workspace
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'e2e-fixtures/02-workspace.png' }).catch(() => {})

    // Expand all
    const expandBtn = page.getByTitle('Expand All').first()
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'e2e-fixtures/03-expanded.png' }).catch(() => {})
    }

    // Graph view
    const graphTab = page.getByText('graph', { exact: true })
    if (await graphTab.isVisible().catch(() => false)) {
      await graphTab.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'e2e-fixtures/04-graph.png' }).catch(() => {})
    }
  })

  test('B12: Check that the _NN index wikilinks resolved correctly', async ({ page }) => {
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })

    // The parser should have followed [[HolaMundo_V_0-0-1_business_NN.md]]
    // from index.md. Check if model name or concepts visible.
    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    console.log('B12 all body text:', bodyText)

    const checks = {
      hasHolaMundo: bodyText.includes('Hola Mundo'),
      hasProductos: bodyText.includes('Productos'),
      hasClientes: bodyText.includes('Clientes'),
      hasCogNNitive: bodyText.includes('CogNNitive'),
      hasInnfoEditor: bodyText.includes('Innfo Editor'),
      hasDesarrolladores: bodyText.includes('Desarrolladores'),
      hasArquitectos: bodyText.includes('Arquitectos'),
      hasParseIssues: bodyText.includes('Workspace loaded with issues'),
      hasNoModel: bodyText.includes('No model loaded'),
    }
    console.log('B12 content checks:', JSON.stringify(checks))
  })
})
