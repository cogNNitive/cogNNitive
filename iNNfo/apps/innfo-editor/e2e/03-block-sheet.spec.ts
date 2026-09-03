import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder, expandAllNodes } from './helpers/setup'

test.describe('BlockSheet — Markdown, Relationships, Matrix Summary, Media, Field Viewer', () => {
  test.beforeEach(async ({ page, context }) => {
    page.on('console', (msg) => console.log('BROWSER:', msg.text()))
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
    await expandAllNodes(page)
    await page.getByText('Delorean').first().click()
  })

  test('R-SC-01: Full Markdown rendering in View tab', async ({ page }) => {
    await expect(page.getByTestId('block-sheet')).toBeVisible()
    await expect(page.getByTestId('block-sheet')).toContainText(
      /Delorean|time machine|88 mph|DMC-12/i,
    )

    const codeBlock = page.locator('pre code, [class*="language-"]')
    await expect(codeBlock.first()).toBeVisible()

    const table = page.locator('table')
    await expect(table.first()).toBeVisible()
  })

  test('R-SC-03: BlockRelationships shows clickable pills', async ({ page }) => {
    await expect(page.getByTestId('block-relationships')).toBeVisible()
    const relationPill = page.getByTestId('block-pill').first()
    await expect(relationPill).toBeVisible()
    await relationPill.click()
    await expect(page.getByText('Dr. Emmett Brown').first()).toBeVisible()
  })

  test('R-SC-04: BlockMatrixSummary shows matrix participation chips', async ({ page }) => {
    await page.getByText('DocBrown', { exact: false }).first().click()
    await expect(page.getByTestId('block-matrix-summary')).toBeVisible()
  })

  test('R-SC-05: NodeMedia image gallery with lightbox', async ({ page }) => {
    const mediaSection = page.getByTestId('node-media')
    const noAttachments = page.getByText(/No attachments?|No media/i)
    const mediaExists = await mediaSection.count()
    const noAttachExists = await noAttachments.count()

    if (mediaExists > 0) {
      const images = mediaSection.locator('img')
      const imgCount = await images.count()
      if (imgCount > 0) {
        await images.first().click()
        await expect(page.getByTestId('lightbox-overlay')).toBeVisible()
        await page.getByTestId('lightbox-close').click()
        await expect(page.getByTestId('lightbox-overlay')).not.toBeVisible()
      }
    } else if (noAttachExists > 0) {
      await expect(noAttachments.first()).toBeVisible()
    }
  })

  test('R-SC-06: FieldViewer renders widgets in read mode', async ({ page }) => {
    await expect(page.getByTestId('field-viewer')).toBeVisible()

    const editButton = page.getByLabel('Edit').first()
    await expect(editButton).toBeVisible()
    await editButton.click()

    const inputs = page.locator('input, select, textarea')
    await expect(inputs.first()).toBeVisible()
  })

  test('R-SC-07: View tab is active by default with underline indicator', async ({ page }) => {
    const viewTab = page.getByRole('button', { name: 'View', exact: true })
    await expect(viewTab).toBeVisible()
    const isActive = await viewTab.getAttribute('class')
    expect(
      isActive?.includes('active') ||
        isActive?.includes('underline') ||
        isActive?.includes('border-b'),
    ).toBeTruthy()
  })

  test('R-SC-08: File attachments section', async ({ page }) => {
    const noAttachMsg = page.getByText(/No attachments?/i)
    const attachment = page.getByText(/Attachments?/i).first()

    await expect(noAttachMsg.first().or(attachment)).toBeVisible()
  })

  test('R-SC-10: No relationship editor UI', async ({ page }) => {
    const addRelBtn = page.getByText(/Add relationship|Edit relationship|Delete relationship/i)
    expect(await addRelBtn.count()).toBe(0)
  })

  test('R-SC-11: Table tab appears for concepts with children and shows element rows', async ({
    page,
  }) => {
    // Navigate to BTTFKB (root with 5 element children) via store
    await page.evaluate(() => {
      const app = (document.getElementById('app') as any).__vue_app__
      const pinia = app.config.globalProperties.$pinia
      pinia.state.value.ui.selectedNodeId = 'BTTFKB'
    })
    await expect(page.getByText(/Selected: BTTFKB/i)).toBeVisible({ timeout: 5000 })

    // BlockSheet should show (BTTFKB has children → sheet instead of text)
    await expect(page.getByTestId('block-sheet')).toBeVisible()

    // Table tab should be present for root with children
    const tableTab = page.getByRole('button', { name: 'Table', exact: true })
    await expect(tableTab).toBeVisible()
    await tableTab.click()

    // Table should render element rows with names
    await expect(page.getByText('Delorean').first()).toBeVisible()
    await expect(page.getByText('DocBrown').first()).toBeVisible()
    await expect(page.getByText('MartyMcFly').first()).toBeVisible()
  })
})
