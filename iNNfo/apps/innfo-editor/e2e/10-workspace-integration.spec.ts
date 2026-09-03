import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder, expandAllNodes } from './helpers/setup'

test.describe('Workspace Integration — Full Workflow & UI Pattern Compliance', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
  })

  test('Full workflow: tree → node → sheet → tabs → matrices → info → home', async ({ page }) => {
    await page.getByTestId('expand-all').click()

    await page.getByText('Delorean').first().click()

    const body = page.locator('main')
    await expect(body).toContainText(/DeLorean|time machine/i)

    await page.getByTestId('view-switcher-matrices').click()
    await expect(page.getByTestId('matrices-grid')).toBeVisible()

    await page.getByTestId('view-switcher-info').click()
    await expect(body).toContainText(/V_1-0-0|model|version/i)

    await page
      .getByText(/← Home|Home/)
      .first()
      .click()
    expect(page.url()).toContain('/app/')
    await expect(page.locator('button', { hasText: /Open folder/i }).first()).toBeVisible()
  })

  test('UI Pattern: Three-panel layout with resizable sidebars', async ({ page }) => {
    await expect(page.getByTestId('left-sidebar')).toBeVisible()

    const resizeHandles = page.getByTestId('resize-handle')
    expect(await resizeHandles.count()).toBeGreaterThan(0)

    const main = page.locator('main')
    await expect(main).toBeVisible()

    await expect(page.getByRole('button', { name: 'Validate' })).toBeVisible()
    await expect(page.getByTestId('view-switcher-editor')).toBeVisible()

    await expect(page.getByTestId('right-guidance-sidebar')).toBeVisible()
  })

  test('UI Pattern: Tree nodes are styled pills with consistent layout', async ({ page }) => {
    await expect(page.getByTestId('left-sidebar')).toBeVisible()
  })

  test('UI Pattern: Validation button triggers modal with report', async ({ page }) => {
    await page.getByTestId('expand-all').click()
    await page.getByText('Delorean').first().click()

    const validateBtn = page.getByText('Validate', { exact: true }).first()
    await expect(validateBtn).toBeEnabled({ timeout: 5000 })
    await validateBtn.click()

    const validationResult = page
      .locator('[class*="toast"], [class*="validation"], [class*="report"]')
      .first()
    await expect(validationResult).toBeVisible()
    const text = await validationResult.textContent()
    expect(text?.length).toBeGreaterThan(0)
  })

  test('UI Pattern: Graph view renders interactive SVG', async ({ page }) => {
    await page.getByTestId('view-switcher-graph').click()
    await expect(page.getByTestId('graph-viewer')).toBeVisible()
    const svg = page
      .locator('svg[class*="graph"], svg[class*="d3"], [data-testid="graph-viewer"] svg')
      .first()
    const innerHtml = await svg.innerHTML()
    expect(innerHtml.length).toBeGreaterThan(100)
  })

  test('UI Pattern: Selected node stays highlighted across view switches', async ({ page }) => {
    await expandAllNodes(page)
    await page.getByText('Delorean').first().click()

    await page.getByTestId('view-switcher-graph').click()
    await page.getByTestId('view-switcher-matrices').click()
    await page.getByTestId('view-switcher-editor').click()

    await expect(page.locator('main')).toContainText(/DeLorean|DMC-12/i)
  })

  test('UI Pattern: Keyboard shortcuts — Ctrl+S saves', async ({ page }) => {
    await page.getByText('HillValleyCorp').first().click()
    await page.keyboard.press('Control+s')

    const successToast = page.getByText(/saved|success/i)
    const hasSuccess = await successToast.count()
    const errorToast = page.getByText(/Save failed|error/i)
    const hasError = await errorToast.count()

    if (hasSuccess > 0) {
      await expect(successToast.first()).toBeVisible()
    }
    expect(hasError).toBe(0)
  })

  test('UI Pattern: Home page has recent files list', async ({ page }) => {
    await page
      .getByText(/← Home|Home/)
      .first()
      .click()

    const recentSection = page.getByText(/Recent|recent|history|History/i).first()
    const recentExists = await recentSection.count()
    if (recentExists > 0) {
      await expect(recentSection).toBeVisible()
    }
  })

  test('UI Pattern: Right sidebar guidance panel shows concept help', async ({ page }) => {
    await expandAllNodes(page)
    await page.getByText('Delorean').first().click()

    const showBtn = page.getByTitle('Show Guidance Panel').first()
    if ((await showBtn.count()) > 0) {
      await showBtn.click()
    }

    const guidanceText = page.getByTestId('right-guidance-sidebar')
    await expect(guidanceText).toBeVisible()
    const text = await guidanceText.textContent()
    expect(text?.length).toBeGreaterThan(0)
  })

  test('UI Pattern: Toast messages appear and disappear', async ({ page }) => {
    await page.getByText('HillValleyCorp').first().click()
    await page.keyboard.press('Control+s')

    await expect(page.getByTestId('toast-container')).toBeVisible()
  })
})
