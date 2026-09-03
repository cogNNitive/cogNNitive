import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Ghost Concepts — ghost groups, add lifecycle', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
  })

  test('R-TGC-03: Selecting a ghost concept opens empty table view', async ({ page }) => {
    await page.getByTestId('expand-all').click()

    const ghostHeaders = page.getByTestId('ghost-group-header')
    if ((await ghostHeaders.count()) > 0) {
      const firstGhost = ghostHeaders.first()
      await firstGhost.click()

      // Should open the table view in the central panel
      // Verify empty table status message is visible
      await expect(page.locator('text=No elements for this concept.')).toBeVisible()

      // The "Add Element" button should be visible in the table header
      const addBtn = page.getByTestId('add-element-btn')
      await expect(addBtn).toBeVisible()
    }
  })

  test('R-TGC-04: Adding element from table creates element and updates sidebar', async ({
    page,
  }) => {
    await page.getByTestId('expand-all').click()

    const ghostHeaders = page.getByTestId('ghost-group-header')
    if ((await ghostHeaders.count()) > 0) {
      // Record the count of ghosts before adding
      const initialGhostCount = await ghostHeaders.count()

      const firstGhost = ghostHeaders.first()

      await firstGhost.click()

      // Click the Add Element button inside the empty table view
      const addBtn = page.getByTestId('add-element-btn')
      await addBtn.click()

      // Wait a tick for reactivity
      await page.waitForTimeout(200)

      // Once created, the concept is no longer empty, so it should not render as a ghost anymore.
      // Ghost headers count should decrease by 1.
      const newGhostCount = await page.getByTestId('ghost-group-header').count()
      expect(newGhostCount).toBe(initialGhostCount - 1)

      // The new element should be selected and its detail block visible
      await expect(page.getByTestId('block-sheet')).toBeVisible()
    }
  })
})
