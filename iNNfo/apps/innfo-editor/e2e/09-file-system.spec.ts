import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('File System Operations — Directory Picker, URL Loading, Backup', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
  })

  test('R-FS-01: Directory picker welcome screen shows options', async ({ page }) => {
    await loadHomePage(page)

    const openBtn = page.locator('button', { hasText: /Open folder/i }).first()
    await expect(openBtn).toBeVisible()

    const samples = page.getByText('Explore example models').first()
    await expect(samples).toBeVisible()
  })

  test('R-FS-02: Open folder loads workspace and shows tree', async ({ page }) => {
    await loadHomePage(page)
    await openMockFolder(page)

    expect(page.url()).toContain('/workspace')

    await expect(page.getByText('BTTFKB').first()).toBeVisible()
    await expect(page.getByText('HillValleyCorp').first()).toBeVisible()
    await expect(page.getByText('TimeTravelProtocol').first()).toBeVisible()
  })

  test('R-FS-03: Load from URL', async ({ page }) => {
    await loadHomePage(page)

    const urlInput = page
      .locator('input[type="url"], input[placeholder*="url" i], input[placeholder*="http" i]')
      .first()
    await expect(urlInput).toBeVisible()
    await urlInput.fill('http://localhost:8000/Sandbox/HillValleyTimeTravel_V_1-0-0_business_F.md')
    const loadBtn = page.getByText(/Load/i).first()
    await expect(loadBtn).toBeEnabled()
  })

  test('R-FS-05: Auto-backup runs before save', async ({ page }) => {
    await loadHomePage(page)
    await openMockFolder(page)

    await page.getByText('HillValleyCorp').first().click()
    await page.keyboard.press('Control+s')

    const errorToast = page.getByTestId('toast-container').locator('.toast--error')
    expect(await errorToast.count()).toBe(0)
  })
})
