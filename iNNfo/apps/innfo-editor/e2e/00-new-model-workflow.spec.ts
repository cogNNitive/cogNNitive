import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Flujo de Creación de Nuevos Modelos', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
  })

  test('R-NW-01: Home page loads with wizard and template options', async ({ page }) => {
    await loadHomePage(page)
    await expect(page.getByText(/Before you start|iNNfo/i).first()).toBeVisible()
    await expect(page.locator('.wizard__sample-card').first()).toBeVisible()
  })

  test('R-NW-02: Open existing folder navigates to workspace with tree', async ({ page }) => {
    await loadHomePage(page)
    await openMockFolder(page)
    await expect(page.getByText('BTTFKB')).toBeVisible()
    await expect(page.getByText('HillValleyCorp').first()).toBeVisible()
  })

  test('R-NW-03: Workspace shows editor view after opening folder', async ({ page }) => {
    await loadHomePage(page)
    await openMockFolder(page)
    await expect(page.getByTestId('view-switcher-editor')).toBeVisible()
    const editorArea = page.locator('main')
    await expect(editorArea).toBeVisible()
  })
})
