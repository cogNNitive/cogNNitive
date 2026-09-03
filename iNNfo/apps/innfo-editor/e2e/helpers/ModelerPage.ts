import { type Page, type Locator } from '@playwright/test'

export class ModelerPage {
  readonly page: Page
  readonly heading: Locator
  readonly openFolderButton: Locator
  readonly sampleModelsSection: Locator
  readonly sampleCards: Locator
  readonly treeRootNode: Locator
  readonly homeButton: Locator
  readonly modelHeading: Locator
  readonly viewSwitcherEditor: Locator
  readonly viewSwitcherGraph: Locator
  readonly wizardSampleCards: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: /iNNfo|iNNfo modeler/i })
    this.openFolderButton = page.locator('button', { hasText: /Open folder/i }).first()
    this.sampleModelsSection = page.getByText('Explore example models').first()
    this.sampleCards = page.locator('button.sample-card')
    this.treeRootNode = page.getByText('BTTFKB')
    this.homeButton = page.getByTestId('header-home-button')
    this.modelHeading = page.getByText('BTTFKB').first()
    this.viewSwitcherEditor = page.getByTestId('view-switcher-editor')
    this.viewSwitcherGraph = page.getByTestId('view-switcher-graph')
    this.wizardSampleCards = page.locator('.wizard__sample-card')
  }

  async goto() {
    await this.page.goto('/app/')
    await this.page.waitForLoadState('networkidle')
    await this.openFolderButton.waitFor({ state: 'visible', timeout: 15000 })
  }

  async openMockFolder() {
    await this.openFolderButton.click()
    await this.page.waitForURL('**/workspace', { timeout: 15000 }).catch(() => {})
    await this.treeRootNode.first().waitFor({ state: 'visible', timeout: 15000 })
  }
}
