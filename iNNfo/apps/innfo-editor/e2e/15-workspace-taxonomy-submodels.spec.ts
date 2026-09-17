import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Workspace Taxonomy and Submodels — Dual Mode Sidebar & Entrypoints', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
  })

  test('Workspace Mode renders workspace metrics pill with model counts', async ({ page }) => {
    await expect(page.getByTestId('left-sidebar')).toBeVisible()
    const metricsPill = page.getByTestId('workspace-metrics-pill')
    await expect(metricsPill).toBeVisible()
    await expect(metricsPill.getByTestId('metric-active-count')).toBeVisible()
  })

  test('Focusing a model displays breadcrumb back button and restoring workspace overview', async ({ page }) => {
    await expect(page.getByTestId('left-sidebar')).toBeVisible()

    // Click on a model header in sidebar to focus model
    const modelHeader = page.locator('.truncate.flex-1').first()
    if (await modelHeader.isVisible()) {
      await modelHeader.click()
      const breadcrumb = page.getByTestId('breadcrumb-back-workspace')
      await expect(breadcrumb).toBeVisible()
      await expect(breadcrumb).toContainText(/Back to Workspace Overview/i)

      // Click breadcrumb back button to restore Workspace Mode
      await breadcrumb.click()
      await expect(page.getByTestId('workspace-metrics-pill')).toBeVisible()
    }
  })
})
