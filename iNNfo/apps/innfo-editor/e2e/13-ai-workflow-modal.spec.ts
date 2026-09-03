import { test, expect, type Page } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('AI Workflow Modal — Unified Modal Integration', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
  })

  test('R-AI-01: Modal opens on "Use AI" click; tab switch renders correct content; Escape closes modal', async ({ page }) => {
    // ── Open modal ──
    const useAiBtn = page.locator('button', { hasText: 'Use AI' }).first()
    await expect(useAiBtn).toBeVisible()
    await useAiBtn.click()

    // Modal should be visible with Guide tab active
    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 5000 })
    await expect(modal.getByText(/This guide is generated/i)).toBeVisible()

    // ── Switch to Import tab ──
    await modal.locator('button', { hasText: /^Import$/ }).click()
    await expect(modal.getByText(/Transform documents into iNNfo/i)).toBeVisible()

    // ── Switch to Export tab ──
    await modal.locator('button', { hasText: /^Export$/ }).click()
    await expect(modal.getByText(/Generate an HTML visualizer/i)).toBeVisible()

    // ── Close via Escape ──
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()
  })

  test('R-AI-02: Modal closes on X button and backdrop click', async ({ page }) => {
    const useAiBtn = page.locator('button', { hasText: 'Use AI' }).first()
    await useAiBtn.click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible()

    // Close via X button
    await modal.locator('button[aria-label="Close modal"]').click()
    await expect(modal).not.toBeVisible()

    // Re-open and close via backdrop
    await useAiBtn.click()
    await expect(modal).toBeVisible()

    // Click the backdrop (the semi-transparent overlay)
    const backdrop = page.locator('.fixed.inset-0.z-50 > .bg-black\\/50')
    await backdrop.click({ position: { x: 10, y: 10 }, force: true })
    await expect(modal).not.toBeVisible()
  })

  test('R-AI-03: Guide tab — Copy button copies prompt starting with "innfo:" and shows confirmation', async ({ page }) => {
    // Mock clipboard
    const copiedText = ''
    await page.evaluate(() => {
      navigator.clipboard.writeText = async (text: string) => {
        ;(window as any).__clipboard = text
      }
    })

    await openModal(page)

    // Guide tab — first step should have a copy button
    const copyBtn = page.locator('[role="dialog"] button', { hasText: 'Copy' }).first()
    await expect(copyBtn).toBeVisible()

    // Stub: find the prompt text from the adjacent code block
    const codeBlock = page.locator('[role="dialog"] code').first()
    const promptText = await codeBlock.textContent()
    expect(promptText?.length).toBeGreaterThan(0)

    // Click Copy
    await copyBtn.click()

    // Wait for "Copied" state
    await expect(page.locator('[role="dialog"] button', { hasText: 'Copied' }).first()).toBeVisible({ timeout: 3000 })

    // Verify clipboard content starts with "innfo:"
    const clipboard = await page.evaluate(() => (window as any).__clipboard as string)
    expect(clipboard).toBeTruthy()
    expect(clipboard?.startsWith('innfo:')).toBe(true)

    // Copied state should disappear after 2 seconds
    await page.waitForTimeout(2500)
    await expect(page.locator('[role="dialog"] button', { hasText: 'Copy' }).first()).toBeVisible()
  })

  test('R-AI-04: Import tab — Copy button copies "innfo:"-prefixed prompt', async ({ page }) => {
    const copiedText = ''
    await page.evaluate(() => {
      navigator.clipboard.writeText = async (text: string) => {
        ;(window as any).__clipboard = text
      }
    })

    await openModal(page)

    // Switch to Import tab
    await page.locator('[role="dialog"] button', { hasText: /^Import$/ }).click()

    // Wait for import content to load
    await page.waitForTimeout(1000)

    // Find the Copy button in the Agent Prompt section
    const copyBtn = page.locator('[role="dialog"] button', { hasText: 'Copy' }).first()
    await expect(copyBtn).toBeVisible()

    await copyBtn.click()

    // Check confirmation state
    await expect(page.locator('[role="dialog"] button', { hasText: 'Copied' }).first()).toBeVisible({ timeout: 3000 })

    // Verify clipboard content starts with "innfo:"
    const clipboard = await page.evaluate(() => (window as any).__clipboard as string)
    expect(clipboard).toBeTruthy()
    expect(clipboard?.startsWith('innfo:')).toBe(true)
  })

  test('R-AI-05: Export tab — Copy button copies "innfo:"-prefixed prompt', async ({ page }) => {
    const copiedText = ''
    await page.evaluate(() => {
      navigator.clipboard.writeText = async (text: string) => {
        ;(window as any).__clipboard = text
      }
    })

    await openModal(page)

    // Switch to Export tab
    await page.locator('[role="dialog"] button', { hasText: /^Export$/ }).click()

    // Wait for export content to render
    await page.waitForTimeout(500)

    // Find the Copy button in the Export prompt section
    const copyBtn = page.locator('[role="dialog"] button', { hasText: 'Copy' }).first()
    await expect(copyBtn).toBeVisible()

    await copyBtn.click()

    // Check confirmation state
    await expect(page.locator('[role="dialog"] button', { hasText: 'Copied' }).first()).toBeVisible({ timeout: 3000 })

    // Verify clipboard content starts with "innfo:"
    const clipboard = await page.evaluate(() => (window as any).__clipboard as string)
    expect(clipboard).toBeTruthy()
    expect(clipboard?.startsWith('innfo:')).toBe(true)
  })
})

/** Opens the AI Workflow Modal via the "Use AI" header button. */
async function openModal(page: Page): Promise<void> {
  const useAiBtn = page.locator('button', { hasText: 'Use AI' }).first()
  await expect(useAiBtn).toBeVisible()
  await useAiBtn.click()
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 })
}
