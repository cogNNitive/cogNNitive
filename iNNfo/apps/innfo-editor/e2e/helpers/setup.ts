import { type Page, type BrowserContext } from '@playwright/test'

/**
 * Injects a mock `showDirectoryPicker` into the page BEFORE the app loads.
 * This lets the "Open Local Folder" flow work without a real native file picker.
 */
export async function injectMockFileSystem(
  page: Page,
  context: BrowserContext,
  customTree?: Record<string, any>,
) {
  // Note: file-system-read/write permissions not available in Chromium Playwright.
  // The mock file system is injected via addInitScript bypassing browser's native API.

  // Inject mock BEFORE navigation — addInitScript runs on every page
  await context.addInitScript((customTreeArg) => {
    // ── Mock root workspace tree (iNNfo _NN.md syntax) ────────────
    //
    // CRITICAL: The app's recursiveParse() only processes wikilinks ending
    // with _NN.md. Section headers use # _NN prefix, element markers use
    // * _NN Concept: Name — NOT the old _F syntax.
    const MOCK_TREE: Record<string, any> = customTreeArg || {
      'index.md':
        '# _NN index\n\n* [[HillValleyCorp_NN.md]]\n* [[TimeTravelProtocol_NN.md]]\n* [[BTTFKB_NN.md]]\n',
      // ── Business model ──
      // Root node name: "HillValleyCorp"
      'HillValleyCorp_NN.md': `---
spec_version: "V_0-1-5"
model_version: "V_1-0-0"
title: "Hill Valley Time Travel Corp"
concepts:
  - name: "Stakeholders"
    type: "stakeholder"
    color: "#7C3AED"
markers:
  - name: "priority"
    symbol: "!"
    color: "#E11D48"
  - name: "weight"
    symbol: "#"
    color: "#8B5CF6"
---

# _NN index

* _NN Stakeholders
  * _NN Founders

# _NN Stakeholders

* _NN Stakeholders: Dr. Emmett Brown
  \x60\x60\x60yaml
  weight: 10
  colorHex: "#7C3AED"
  role: CEO
  \x60\x60\x60
  Founder and CEO.

* _NN Stakeholders: Marty McFly
  \x60\x60\x60yaml
  weight: 9
  colorHex: "#0891B2"
  role: Test Pilot
  \x60\x60\x60
  Test pilot.

# _NN matrices: stakeholder-risk matrix

| Stakeholder \\\\ Risk | Paradox | Fuel |
| :--- | :---: | :---: |
| Dr. Emmett Brown | High | Max |
| Marty McFly | Medium | High |
`,
      // ── Procedures model ──
      // Root node name: "TimeTravelProtocol"
      'TimeTravelProtocol_NN.md': `---
spec_version: "V_0-1-5"
model_version: "V_1-0-0"
title: "Time Travel Protocol"
concepts:
  - name: "Procedure"
    type: "step"
  - name: "Role"
    type: "role"
---

# _NN index

* _NN Procedure
* _NN Role

# _NN Procedure

* _NN Procedure: Calibrate Flux
  Standard flux capacitor calibration procedure.

* _NN Procedure: Accelerate
  \x60\x60\x60yaml
  safety_check: required
  \x60\x60\x60
  Engage time circuits and accelerate to 88 mph.

# _NN matrices: work-roles matrix

| Work \\\\ Role | Pilot | Navigator |
| :--- | :---: | :---: |
| Calibrate flux | — | Accountable |
| Accelerate | Responsible | — |
`,
      // ── KB model (flat — recursiveParse only reads wikilinks, not subdirs) ──
      // Root node name: "BTTFKB"
      'BTTFKB_NN.md': `---
spec_version: "V_0-1-5"
model_version: "V_1-0-0"
title: "Back to the Future KB"
type: "KB"
concepts:
  - name: "Topic"
    type: "topic"
    icon: "wrench"
    color: "#059669"
    fields:
      - name: "category"
        type: "string"
      - name: "status"
        type: "string"
      - name: "year_introduced"
        type: "string"
      - name: "max_speed"
        type: "number"
      - name: "color"
        type: "string"
      - name: "rating"
        type: "string"
      - name: "power_output"
        type: "number"
      - name: "power_unit"
        type: "string"
  - name: "Persona"
    type: "persona"
    icon: "user"
    color: "#0891B2"
    fields:
      - name: "role"
        type: "string"
      - name: "expertise_level"
        type: "string"
      - name: "birth_year"
        type: "number"
      - name: "rating"
        type: "string"
matrices:
  - name: "topic-persona"
    source: "Topic"
    target: "Persona"
    widgetType: "text"
    params: ""
topic-persona||Delorean||DocBrown: "Owner"
topic-persona||Delorean||MartyMcFly: "Driver"
---

# _NN index

* _NN Topic
  * _NN Vehicles
  * _NN Devices
* _NN Persona

# _NN Topic

* _NN Topic: Delorean
  \x60\x60\x60yaml
  category: technology
  status: published
  year_introduced: 1981
  max_speed: 88
  color: "#C0C0C0"
  rating: 5
  \x60\x60\x60
  DeLorean DMC-12 time machine invented by [[DocBrown]].

\x60\x60\x60javascript
const fluxCapacitor = true;
\x60\x60\x60

| Feature | Value |
| --- | --- |
| Speed | 88 mph |

* _NN Topic: FluxCapacitor
  \x60\x60\x60yaml
  category: technology
  year_invented: 1955
  power_output: 1.21
  power_unit: gigawatts
  rating: 5
  \x60\x60\x60
  Flux Capacitor — makes time travel possible.

* _NN Topic: Hoverboard
  \x60\x60\x60yaml
  category: technology
  year_introduced: 2015
  max_speed: 35
  rating: 3
  \x60\x60\x60
  Hoverboard — magnetic levitation skateboard.

# _NN Persona

* _NN Persona: DocBrown
  \x60\x60\x60yaml
  role: inventor
  expertise_level: expert
  birth_year: 1920
  rating: 5
  \x60\x60\x60
  Dr. Emmett Brown. Inventor of the flux capacitor.

* _NN Persona: MartyMcFly
  \x60\x60\x60yaml
  role: time traveler
  expertise_level: advanced
  birth_year: 1968
  rating: 4
  \x60\x60\x60
  Marty McFly — time traveling teenager.

# _NN matrices: topic-persona

| Topic \\\\ Persona | DocBrown | MartyMcFly |
| :--- | :---: | :---: |
| Delorean | Owner | Driver |
`,
    }

    // ── Mock FileSystemDirectoryHandle ──
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

      async getFileHandle(name: string, _options?: { create?: boolean }): Promise<any> {
        let value = this.tree[name]
        if (typeof value !== 'string') {
          if (_options?.create) {
            value = ''
            this.tree[name] = value
          } else {
            throw new Error(`File not found: ${name}`)
          }
        }
        return new MockFileHandle(name, value)
      }

      async getDirectoryHandle(name: string, _options?: { create?: boolean }): Promise<any> {
        let value = this.tree[name]
        if (typeof value !== 'object') {
          if (_options?.create) {
            value = {}
            this.tree[name] = value
          } else {
            throw new Error(`Directory not found: ${name}`)
          }
        }
        return new MockDirectoryHandle(name, value)
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
          async close() {
            /* noop */
          },
        }
      }
    }

    // Override showDirectoryPicker globally (direct assignment, no defineProperty)
    const rootHandle = new MockDirectoryHandle('Sandbox', MOCK_TREE)
    ;(window as any).showDirectoryPicker = async () => rootHandle

    // Also override showOpenFilePicker for single-file load
    ;(window as any).showOpenFilePicker = async () => {
      const content = MOCK_TREE['HillValleyCorp_NN.md']
      return [new MockFileHandle('HillValleyCorp_NN.md', content)]
    }

    // Mock clipboard for copy operations
    ;(navigator as any).clipboard = {
      writeText: async () => {},
      readText: async () => '',
    }
  }, customTree)
}

/**
 * Loads the home page and waits for it to be fully rendered.
 */
export async function loadHomePage(page: Page) {
  await page.goto('/app/')
  await page.waitForLoadState('networkidle')
  await page
    .locator('button', { hasText: /Open folder/i })
    .first()
    .waitFor({ state: 'visible', timeout: 10000 })
}

/**
 * Opens a folder via the mocked showDirectoryPicker.
 * Clicks the "Open Local Folder" button and waits for workspace to load.
 */
export async function openMockFolder(page: Page) {
  // Click the "Open folder…" button
  const folderBtn = page.locator('button', { hasText: /Open folder/i }).first()
  await folderBtn.waitFor({ state: 'visible', timeout: 10000 })
  await folderBtn.click()

  // Wait for workspace navigation and tree to render
  await page.waitForURL('**/workspace', { timeout: 15000 }).catch(() => {})

  // Wait for at least one tree root node to appear
  await page.getByText('BTTFKB').first().waitFor({ state: 'visible', timeout: 10000 })
}

/**
 * Expands all tree nodes by clicking the "Expand All" button in the sidebar header.
 * Required before interacting with child elements (collapsed by default).
 */
export async function expandAllNodes(page: Page) {
  const expandBtn = page.getByTitle('Expand All').first()
  if (await expandBtn.isVisible()) {
    await expandBtn.click()
    // Wait for tree nodes to become visible
    await page
      .getByText('Delorean')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {})
  }
}

// MOCK_TREE is defined inside addInitScript (browser context), not exported from Node.js
