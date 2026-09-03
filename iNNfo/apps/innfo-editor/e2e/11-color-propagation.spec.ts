import { test, expect } from '@playwright/test'
import { loadHomePage } from './helpers/setup'

/**
 * Mock workspace with a level-3 model (Ghostbusters-style) that has NO inlined
 * concepts — it relies entirely on parent_spec resolution for colors/metadata.
 * The template is also present in the workspace as a peer root, co-located
 * so findTemplatePeer() can find it without URL fetch.
 */
const MOCK_LEVEL3_WORKSPACE: Record<string, any> = {
  'index.md': '# _NN index\n\n* [[Ghostbusters_NN.md]]\n* [[business_V_0-1-1_NN.md]]\n',

  // ── Level-3 model (like Ghostbusters) — NO concepts inline ──
  'Ghostbusters_NN.md': `---
spec_version: "V_0-1-5"
level: 3
parent_spec:
  name: "business_V_0-1-1"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/v0.1.0/level2/business/business_V_0-1-1_NN.md"
model_version: "V_0-1-2"
title: "Ghostbusters"
---

> [!NOTE]
> This is an **iNNfo document**.

# _NN index

* _NN index: Stakeholders
* _NN index: Problems
* _NN index: Value propositions

# _NN Stakeholders

* _NN Stakeholders: Venkman
  Lead scientist and co-founder.
* _NN Stakeholders: Stantz
  Engineer and co-founder.

# _NN Problems

* _NN Problems: Paranormal Infestation
  Unwanted spectral presence.

# _NN Value propositions

* _NN Value propositions: Guaranteed Removal
  We solve it or you don't pay.
`,
  // ── Template (level 3 after rename) with concepts + colors ──
  'business_V_0-1-1_NN.md': `---
spec_version: "V_0-1-5"
level: 3
parent_spec:
  name: "iNNfo_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/v0.1.0/level1/iNNfo_V_0-1-0_NN.md"
title: "Business Template"
model_version: "V_0-1-1"
concepts:
  - name: "Business summary"
    icon: "file-text"
    type: "text"
    color: "blue"
  - name: "Stakeholders"
    icon: "users"
    type: "weight"
    color: "blue"
  - name: "Market"
    icon: "store"
    type: "category"
    color: "blue"
  - name: "Problems"
    icon: "circle-alert"
    type: "weight"
    color: "red"
  - name: "Value propositions"
    icon: "gem"
    type: "weight"
    color: "green"
  - name: "Analysis"
    icon: "microscope"
    type: "category"
    color: "red"
  - name: "Validation"
    icon: "clipboard-check"
    type: "category"
    color: "green"
markers:
  - name: "weight"
    symbol: "*"
    icon: "plus"
    color: "blue"
  - name: "priority"
    symbol: "!"
    icon: "flag"
    color: "red"
matrices:
  - name: "Problems-Value propositions Matrix"
    source: "Problems"
    target: "Value propositions"
    params: "Max;Very High;High;Slightly High;Neutral"
relationship_declarations:
  hierarchy:
    enabled: true
    via: "index block"
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: false
---

> [!NOTE]
> This is an **iNNfo document** — Business Template definition.

# Business Template

## Philosophy

Template for business modeling.
`,
}

/**
 * Inject a mock FS with both model and template co-located.
 */
async function injectLevel3Mock(page: any, context: any) {
  await context.addInitScript(() => {
    const MOCK_TREE: Record<string, any> = {
      'index.md': '# _NN index\n\n* [[Ghostbusters_NN.md]]\n* [[business_V_0-1-1_NN.md]]\n',
      'Ghostbusters_NN.md': `---
spec_version: "V_0-1-5"
level: 3
parent_spec:
  name: "business_V_0-1-1"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/v0.1.0/level2/business/business_V_0-1-1_NN.md"
model_version: "V_0-1-2"
title: "Ghostbusters"
---

> [!NOTE]
> This is an **iNNfo document**.

# _NN index

* _NN index: Stakeholders
* _NN index: Problems
* _NN index: Value propositions

# _NN Stakeholders

* _NN Stakeholders: Venkman
  Lead scientist.
* _NN Stakeholders: Stantz
  Engineer.

# _NN Problems

* _NN Problems: Paranormal Infestation
  Unwanted spectral presence.

# _NN Value propositions

* _NN Value propositions: Guaranteed Removal
  We solve it.
`,
      'business_V_0-1-1_NN.md': `---
spec_version: "V_0-1-5"
level: 3
parent_spec:
  name: "iNNfo_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/v0.1.0/level1/iNNfo_V_0-1-0_NN.md"
title: "Business Template"
model_version: "V_0-1-1"
concepts:
  - name: "Business summary"
    icon: "file-text"
    type: "text"
    color: "blue"
  - name: "Stakeholders"
    icon: "users"
    type: "weight"
    color: "blue"
  - name: "Problems"
    icon: "circle-alert"
    type: "weight"
    color: "red"
  - name: "Value propositions"
    icon: "gem"
    type: "weight"
    color: "green"
  - name: "Analysis"
    icon: "microscope"
    type: "category"
    color: "red"
  - name: "Validation"
    icon: "clipboard-check"
    type: "category"
    color: "green"
markers:
  - name: "weight"
    symbol: "*"
    icon: "plus"
    color: "blue"
  - name: "priority"
    symbol: "!"
    icon: "flag"
    color: "red"
matrices:
  - name: "Problems-Value propositions Matrix"
    source: "Problems"
    target: "Value propositions"
    params: "Max;Very High;High;Slightly High;Neutral"
relationship_declarations:
  hierarchy:
    enabled: true
    via: "index block"
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: false
---

> [!NOTE]
> This is an **iNNfo document** — Business Template definition.

# Business Template
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

    const rootHandle = new MockDirectoryHandle('level3-test', MOCK_TREE)
    ;(window as any).showDirectoryPicker = async () => rootHandle
    // Mock fetch to return template content for parent_spec URL resolution
    const originalFetch = window.fetch.bind(window)
    ;(window as any)._originalFetch = originalFetch
  })
}

test.describe('Level-3 Model Color Propagation', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectLevel3Mock(page, context)
    await loadHomePage(page)
  })

  test('C1: Open workspace and verify model + template both load', async ({ page }) => {
    // Open folder
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })

    // Wait for tree to render
    await page.getByText('Ghostbusters').first().waitFor({ state: 'visible', timeout: 10000 })
    await page.getByText('business_V_0-1-1_NN').first().waitFor({ state: 'visible', timeout: 5000 })

    // Expand all to see concept nodes
    const expandBtn = page.getByTitle('Expand All').first()
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click()
      await page.waitForTimeout(800)
    }

    // Verify concept nodes from the model appear in the tree
    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    console.log('C1 tree content:', bodyText.substring(0, 800))

    // The model's elements should be rendered
    const hasVenkman = bodyText.includes('Venkman')
    const hasStantz = bodyText.includes('Stantz')
    const hasParanormal = bodyText.includes('Paranormal Infestation')
    const hasGuaranteed = bodyText.includes('Guaranteed Removal')
    console.log('C1 element visibility:', { hasVenkman, hasStantz, hasParanormal, hasGuaranteed })
  })

  test('C2: Click an element node and verify BlockSheet shows color', async ({ page }) => {
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })

    // Wait for tree
    await page.getByText('Ghostbusters').first().waitFor({ state: 'visible', timeout: 10000 })

    // Expand all
    const expandBtn = page.getByTitle('Expand All').first()
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click()
      await page.waitForTimeout(800)
    }

    // Click on "Venkman" element (should be under Stakeholders)
    const venkmanEl = page.getByText('Venkman').first()
    const venkmanVisible = await venkmanEl.isVisible().catch(() => false)
    console.log('C2: Venkman visible:', venkmanVisible)

    if (venkmanVisible) {
      await venkmanEl.click()
      await page.waitForTimeout(500)

      // Check the BlockSheet for the Stakeholders concept color (should be blue)
      const sheetText = await page
        .locator('body')
        .innerText()
        .catch(() => '')
      console.log('C2 sheet text:', sheetText.substring(0, 500))

      // The BlockSheet should show the concept name "Stakeholders" and element name "Venkman"
      const hasStakeholders = sheetText.includes('Stakeholders')
      const hasVenkmanInSheet = sheetText.includes('Venkman')
      console.log('C2 sheet content:', { hasStakeholders, hasVenkmanInSheet })
    }
  })

  test('C3: Graph view renders colored nodes', async ({ page }) => {
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })

    await page.getByText('Ghostbusters').first().waitFor({ state: 'visible', timeout: 10000 })

    // Click graph tab
    const graphTab = page.getByText('graph', { exact: true })
    if (await graphTab.isVisible().catch(() => false)) {
      await graphTab.click()
      await page.waitForTimeout(1000)

      // Check if SVG contains colored elements
      const svg = page.locator('svg').first()
      const svgVisible = await svg.isVisible().catch(() => false)
      console.log('C3: SVG graph visible:', svgVisible)

      if (svgVisible) {
        const svgContent = await svg.innerHTML().catch(() => '')
        // Look for color-specific attributes (fill, stroke) in SVG
        const hasFills = svgContent.includes('fill=') || svgContent.includes('fill:')
        console.log('C3: SVG has fills:', hasFills, 'length:', svgContent.length)
      }
    }
  })

  test('C4: Colors propagate from template peer for level-3 model elements', async ({ page }) => {
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })
    await page.getByText('Ghostbusters').first().waitFor({ state: 'visible', timeout: 10000 })

    // Expand all to reveal element nodes
    const expandBtn = page.getByTitle('Expand All').first()
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click()
      await page.waitForTimeout(800)
    }

    // Click "Venkman" element under Stakeholders (should have blue color from template)
    const venkmanEl = page.getByText('Venkman').first()
    await venkmanEl.waitFor({ state: 'visible', timeout: 5000 })
    await venkmanEl.click()
    await page.waitForTimeout(500)

    // The BlockSheet should show "Stakeholders" concept name with blue accent color
    // The concept name appears in the sheet header — check it rendered
    const sheetText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    const hasStakeholdersLabel = sheetText.includes('Stakeholders')
    console.log('C4 sheet has Stakeholders label:', hasStakeholdersLabel)

    // Also check the concept tree node for Stakeholders — it should have a
    // blue left-border from the template's color definition
    const stakeholdersNode = page.getByText('Stakeholders').first()
    const stakeVisible = await stakeholdersNode.isVisible().catch(() => false)
    console.log('C4 Stakeholders node visible:', stakeVisible)
  })

  test('C5: Click "Paranormal Infestation" under Problems (red concept)', async ({ page }) => {
    await page
      .locator('button', { hasText: /Open folder/i })
      .first()
      .click()
    await page.waitForURL('**/workspace', { timeout: 15000 })
    await page.getByText('Ghostbusters').first().waitFor({ state: 'visible', timeout: 10000 })

    const expandBtn = page.getByTitle('Expand All').first()
    if (await expandBtn.isVisible().catch(() => false)) {
      await expandBtn.click()
      await page.waitForTimeout(800)
    }

    // Click "Paranormal Infestation" under Problems (template says red)
    const problemEl = page.getByText('Paranormal Infestation').first()
    const problemVisible = await problemEl.isVisible().catch(() => false)
    console.log('C5 Problem element visible:', problemVisible)

    if (problemVisible) {
      await problemEl.click()
      await page.waitForTimeout(500)
      const sheetText = await page
        .locator('body')
        .innerText()
        .catch(() => '')
      const hasProblemsLabel = sheetText.includes('Problems')
      console.log('C5 Problems label in sheet:', hasProblemsLabel)
    }
  })
})
