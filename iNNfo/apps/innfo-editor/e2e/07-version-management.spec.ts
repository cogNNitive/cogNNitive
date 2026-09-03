import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Version Management — Bump Major/Minor/Patch, Version Display', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
  })

  async function openModelInfo(page: any) {
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.getByTitle('View Model Info').click({ timeout: 5000 })
    await page.waitForTimeout(500)
  }

  async function expandVersionPanel(page: any) {
    // Version Management section starts collapsed — click the header to expand
    const header = page.getByText('Version Management').first()
    if (await header.isVisible()) {
      await header.click()
    }
  }

  test('R-VM-01: Version management section in ModelInfoPanel', async ({ page }) => {
    await openModelInfo(page)
    await expandVersionPanel(page)
    const versionSection = page.getByText(/Version Management|version management/i).first()
    await expect(versionSection).toBeVisible()
  })

  test('R-VM-02: Bump buttons present (major/minor/patch)', async ({ page }) => {
    await openModelInfo(page)
    await expandVersionPanel(page)

    const majorBtn = page.getByText(/Major|major/i).first()
    const minorBtn = page.getByText(/Minor|minor/i).first()
    const patchBtn = page.getByText(/Patch|patch/i).first()
    expect(
      (await majorBtn.count()) + (await minorBtn.count()) + (await patchBtn.count()),
    ).toBeGreaterThan(0)
    await expect(majorBtn).toBeVisible()
  })

  test('R-VM-03: Version display shows current version from frontmatter', async ({ page }) => {
    await openModelInfo(page)
    await expandVersionPanel(page)
    const versionDisplay = page.getByText(/V_1-0-0|1\.0\.0/i).first()
    await expect(versionDisplay).toBeVisible()
  })

  test('R-VM-06: Bump buttons are enabled when workspace is connected', async ({ page }) => {
    await openModelInfo(page)
    await expandVersionPanel(page)

    const majorBtn = page.getByText(/Major|major/i).first()
    await expect(majorBtn).toBeVisible()
    await expect(majorBtn).toBeEnabled()
  })

  test('R-VM-07: No git integration', async ({ page }) => {
    const gitElements = page.locator('[class*="git"], [class*="commit"], [class*="branch"]')
    const gitCount = await gitElements.count()

    if (gitCount > 0) {
      const area = page.getByText(/Version Management|version management/i)
      const hasGitInVersion = await area.locator('[class*="git"]').count()
      expect(hasGitInVersion).toBe(0)
    }
  })
})
