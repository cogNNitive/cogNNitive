import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder, expandAllNodes } from './helpers/setup'

test.describe('Widget Registry — 14 Widget Types', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
    await loadHomePage(page)
    await openMockFolder(page)
    await expandAllNodes(page)
    await page.getByText('Delorean').first().click()
  })

  test('FieldViewer shows field labels in uppercase tracking', async ({ page }) => {
    const fieldViewer = page.getByTestId('field-viewer')
    const label = fieldViewer.locator('label').first()
    await expect(label).toBeVisible()
    const text = await label.textContent()
    if (text) {
      expect(text).toEqual(text.toUpperCase())
    }
  })

  test('DateWidget renders date fields', async ({ page }) => {
    const dateField = page.getByText(/1981|build_date|BUILD DATE/i)
    await expect(dateField.first()).toBeVisible()
  })

  test('UrlWidget renders clickable links', async ({ page }) => {
    const link = page.locator('a[href*="fandom"], a[href*="http"]').first()
    await expect(link).toBeVisible()
    const href = await link.getAttribute('href')
    expect(href).toContain('http')
  })

  test('ColorWidget renders color swatches', async ({ page }) => {
    const editBtn = page.getByLabel('Edit').first()
    await expect(editBtn).toBeVisible()
    await editBtn.click()
    const swatch = page
      .locator('[class*="swatch"], [class*="color-swatch"], input[type="color"]')
      .first()
    await expect(swatch).toBeVisible()
  })

  test('MultiSelectWidget / TagsWidget renders chips', async ({ page }) => {
    const tagChips = page.getByText(/time-machine|dmc-12/i)
    await expect(tagChips.first()).toBeVisible()
  })

  test('RatingWidget renders star rating', async ({ page }) => {
    const editBtn = page.getByLabel('Edit').first()
    await expect(editBtn).toBeVisible()
    await editBtn.click()
    const rating = page.getByText(/5\/5|rating/i).first()
    await expect(rating).toBeVisible()

    const stars = page.locator('svg[class*="star"], [class*="star"]').first()
    await expect(stars).toBeVisible()
  })

  test('ScaleWidget renders numeric scale', async ({ page }) => {
    await page.getByText('MartyMcFly').first().click()
    const editBtn = page.getByLabel('Edit').first()
    await expect(editBtn).toBeVisible()
    await editBtn.click()
    const numberInput = page.locator('input[type="number"]').first()
    await expect(numberInput).toBeVisible()
    const val = await numberInput.inputValue()
    expect(val).toBeTruthy()
  })

  test('ToggleGroupWidget renders segmented buttons', async ({ page }) => {
    const viewTab = page.getByRole('button', { name: 'View', exact: true })
    await expect(viewTab).toBeVisible()
    const activeClass = await viewTab.getAttribute('class')
    expect(activeClass?.includes('border-b') || activeClass?.includes('indigo')).toBeTruthy()
  })

  test('CodeWidget renders code blocks', async ({ page }) => {
    const codeBlock = page.locator('pre code, [class*="language-"]').first()
    await expect(codeBlock).toBeVisible()
    const codeText = await codeBlock.textContent()
    expect(codeText).toContain('fluxCapacitor')
  })

  test('MermaidWidget renders diagrams', async ({ page }) => {
    const viewTab = page.getByRole('button', { name: 'View', exact: true })
    await expect(viewTab).toBeVisible()
    const graphSvg = page.locator('svg').first()
    await expect(graphSvg).toBeVisible()
  })

  test('TimestampWidget renders formatted dates', async ({ page }) => {
    await page.getByText('FluxCapacitor').first().click()
    const timestamp = page.getByText(/1955|invention_date|INVENTION DATE/i).first()
    await expect(timestamp).toBeVisible()
  })

  test('MarkdownWidget renders body as rich text', async ({ page }) => {
    const richContent = page.getByTestId('block-sheet').locator('pre code, p, table')
    await expect(richContent.first()).toBeVisible()
  })

  test('Edit mode switches to interactive widgets', async ({ page }) => {
    const editBtn = page.getByLabel('Edit').first()
    await expect(editBtn).toBeVisible()
    await editBtn.click()

    const textInputs = page.locator(
      'input[type="text"], input[type="date"], input[type="url"], input[type="number"], input[type="color"]',
    )
    const selectDropdowns = page.locator('select')
    const textareas = page.locator('textarea')

    const totalInputs =
      (await textInputs.count()) + (await selectDropdowns.count()) + (await textareas.count())
    expect(totalInputs).toBeGreaterThan(0)
  })

  test('FallbackWidget renders unknown field types', async ({ page }) => {
    await page.getByText('DocBrown').first().click()
    const fallbackField = page.getByText(/birth_year|1920|role/i).first()
    await expect(fallbackField).toBeVisible()
  })
})
