import { test, expect } from '@playwright/test'

/**
 * Regression coverage for URL synchronisation when navigating the left
 * sidebar tree. Selecting tree nodes (elements and virtual concept groups)
 * must update the URL hash so that browser back/forward restores the
 * previously selected node.
 */

const MODEL = `---
spec_version: "V_0-1-5"
spec_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/v0.1.5/specs/FORMAT_V_0-1-5_F.md"
level: 3
parent_spec:
  name: "business_V_0-1-1"
  url: "https://spec.mock/business_V_0-1-1_FORMAT.md"
model_version: "V_0-0-1"
title: "Hola Mundo"
---

# _NN index

* _NN Productos
* _NN Clientes

# _NN Productos

* _NN Productos: CogNNitive
  \`\`\`yaml
  tipo: software
  \`\`\`
  La plataforma central.

* _NN Productos: Innfo Editor
  \`\`\`yaml
  tipo: editor
  \`\`\`
  Editor visual.

# _NN Clientes

* _NN Clientes: Desarrolladores
  \`\`\`yaml
  segmento: tech
  \`\`\`
  Equipos que modelan.

* _NN Clientes: Arquitectos
  \`\`\`yaml
  segmento: enterprise
  \`\`\`
  Disenan sistemas.
`

const TEMPLATE = `---
kind: template
name: "business_V_0-1-1"
concepts:
  - name: "Productos"
    type: "producto"
    color: "#7C3AED"
  - name: "Clientes"
    type: "cliente"
    color: "#0891B2"
matrices: []
markers: []
---
`

test.describe('URL sync on sidebar tree navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://spec.mock/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/markdown', body: TEMPLATE })
    })
    await page.route('https://model.mock/**', (route) => {
      route.fulfill({ status: 200, contentType: 'text/markdown', body: MODEL })
    })

    await page.goto('/app/')
    await page.waitForLoadState('networkidle')
    await page
      .locator('input[type="url"]')
      .fill('https://model.mock/HolaMundo_V_0-0-1_business_NN.md')
    await page.getByRole('button', { name: /Load Workspace/i }).click()
    await page.waitForURL('**/workspace', { timeout: 15000 })
    await page.getByText('Productos').first().waitFor({ state: 'visible', timeout: 15000 })
  })

  test('clicking an element node updates the URL hash', async ({ page }) => {
    await page.getByTestId('expand-all').click()
    await page.getByText('CogNNitive').first().waitFor({ state: 'visible', timeout: 5000 })

    const urlBefore = page.url()
    await page.getByText('CogNNitive').first().click()
    await page.waitForTimeout(400)

    expect(page.url()).not.toBe(urlBefore)
    expect(page.url()).toContain('#CogNNitive')
  })

  test('browser back restores the previously selected element', async ({ page }) => {
    await page.getByTestId('expand-all').click()
    await page.getByText('CogNNitive').first().waitFor({ state: 'visible', timeout: 5000 })

    await page.getByText('CogNNitive').first().click()
    await page.waitForTimeout(400)
    const url1 = page.url()

    await page.getByText('Innfo Editor').first().click()
    await page.waitForTimeout(400)

    await page.goBack()
    await page.waitForTimeout(400)

    expect(page.url()).toBe(url1)
  })

  test('clicking a virtual concept group header updates the URL hash', async ({ page }) => {
    await page.getByTestId('expand-all').click()
    await page.getByText('CogNNitive').first().waitFor({ state: 'visible', timeout: 5000 })

    const urlBefore = page.url()
    await page.getByText('Productos', { exact: true }).first().click()
    await page.waitForTimeout(400)

    expect(page.url()).not.toBe(urlBefore)
    expect(page.url()).toContain('#@Productos')
  })

  test('back from an element restores the virtual group selection', async ({ page }) => {
    await page.getByTestId('expand-all').click()
    await page.getByText('CogNNitive').first().waitFor({ state: 'visible', timeout: 5000 })

    await page.getByText('Productos', { exact: true }).first().click()
    await page.waitForTimeout(300)
    const groupUrl = page.url()

    await page.getByText('CogNNitive').first().click()
    await page.waitForTimeout(300)

    await page.goBack()
    await page.waitForTimeout(400)
    expect(page.url()).toBe(groupUrl)

    const selectedHeader = page
      .locator('[data-testid="virtual-group-node"]', { hasText: 'Productos' })
      .first()
    await expect(selectedHeader.locator('[class*="font-semibold"]').first()).toBeVisible()
  })

  test('switching views preserves the selected node hash', async ({ page }) => {
    await page.getByTestId('expand-all').click()
    await page.getByText('CogNNitive').first().waitFor({ state: 'visible', timeout: 5000 })

    await page.getByText('CogNNitive').first().click()
    await page.waitForTimeout(300)

    await page.getByRole('button', { name: /graph/i }).click()
    await page.waitForTimeout(400)

    expect(page.url()).toContain('view=graph')
    expect(page.url()).toContain('#CogNNitive')
  })
})
