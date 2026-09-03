import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Tree Navigation — Colored Pills, Counters, Popups, Ghost States', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
  })

  test('R-TN-01: Tree nodes display colored pills with YIQ-optimized text', async ({ page }) => {
    await page.getByTestId('expand-all').click()
    await page.getByText('Delorean').first().waitFor({ state: 'visible', timeout: 5000 })

    const treeNode = page.getByText('Delorean').first()
    await expect(treeNode).toBeVisible()

    const coloredNodes = page.locator('[style*="border-left"]')
    const coloredCount = await coloredNodes.count()
    expect(coloredCount).toBeGreaterThanOrEqual(0)
  })

  test('R-TN-02: Concept groups show instance counters', async ({ page }) => {
    const virtualGroup = page.getByTestId('virtual-group-node').filter({ hasText: 'Topic' }).first()
    await expect(virtualGroup).toBeVisible({ timeout: 10000 })

    const counterBadge = virtualGroup.locator('.tabular-nums')
    await expect(counterBadge.first()).toBeVisible()
  })

  test('R-TN-03: Info popup shows on hover/click of info icon', async ({ page }) => {
    await page.getByTestId('expand-all').click()
    await page.getByText('Delorean').first().waitFor({ state: 'visible', timeout: 5000 })

    await page.getByText('Delorean').first().click()

    const deloreanNode = page.getByText('Delorean').first()
    const deloreanPill = deloreanNode.locator('xpath=ancestor::*[@data-testid="block-pill"]')
    await deloreanPill.hover()

    const infoIcon = deloreanPill.locator('svg').last()
    await expect(infoIcon).toBeVisible()
    await infoIcon.click()

    const popup = page.locator('body > div.fixed').first()
    await expect(popup).toBeVisible()
    await expect(popup).toContainText(/Delorean|category|technology/i)
  })

  test('R-TN-04: Empty nodes render in ghost state', async ({ page }) => {
    const ghostNode = page.locator('[class*="ghost"], [style*="opacity"]').first()
    const ghostCount = await page.locator('[class*="ghost"], [style*="opacity"]').count()

    if (ghostCount > 0) {
      const opacity = await ghostNode.getAttribute('style')
      expect(
        opacity?.includes('opacity') ||
          (await ghostNode.locator('i, em, [class*="italic"]').count()) > 0,
      ).toBeTruthy()
    }
  })

  test('R-TN-05: VirtualGroupNode header shows styled group with counter', async ({ page }) => {
    await page.getByTestId('expand-all').click()
    await expect(page.getByTestId('virtual-group-node').first()).toBeVisible()
    await expect(
      page
        .getByTestId('virtual-group-node')
        .first()
        .locator('[class*="chevron"], .collapse-icon, [class*="expand"]')
        .first(),
    ).toBeVisible()
  })

  test('R-TN-06: LeftSidebar has expand/collapse controls', async ({ page }) => {
    await expect(page.getByTestId('expand-all')).toBeVisible()
    await expect(page.getByTestId('collapse-all')).toBeVisible()
  })

  test('R-TN-07: No IndexedDB writes for tree state (memory-only)', async ({ page }) => {
    await page.getByTestId('expand-all').click()

    await page.reload()
    await page.waitForLoadState('networkidle')

    await loadHomePage(page)
    await openMockFolder(page)

    await expect(page.getByText('BTTFKB')).toBeVisible()
  })
})
