import { test, expect } from '@playwright/test'
import { injectMockFileSystem, loadHomePage, openMockFolder } from './helpers/setup'

test.describe('Home Page — Landing & Workspace Entry', () => {
  test.beforeEach(async ({ page, context }) => {
    await injectMockFileSystem(page, context)
  })

  test('R-TN-00: Home page loads with all entry points', async ({ page }) => {
    await loadHomePage(page)

    await test.step('Open folder button must be available', async () => {
      await expect(page.locator('button', { hasText: /Open folder/i }).first()).toBeVisible({ timeout: 10000 })
      await expect(page.locator('button', { hasText: /Open folder/i }).first()).toBeEnabled()
    })

    await test.step('Explore example models section should be visible', async () => {
      await expect(page.getByText('Explore example models')).toBeVisible()
      const cards = page.locator('button.sample-card')
      expect(await cards.count()).toBeGreaterThanOrEqual(1)
    })
  })

  test('Open folder loads workspace with tree', async ({ page }) => {
    await loadHomePage(page)

    await test.step('Cuando hace clic en "Open folder" para cargar el espacio de trabajo', async () => {
      await page.locator('button', { hasText: /Open folder/i }).first().click()
    })

    await test.step('Entonces es redirigido a la vista de workspace y se cargan los nodos del árbol', async () => {
      await page.waitForURL('**/workspace', { timeout: 15000 })
      await expect(page.getByText('BTTFKB').first()).toBeVisible({ timeout: 15000 })
    })

    await test.step('Y puede ver la opción de volver a Home', async () => {
      await expect(page.getByTestId('header-home-button')).toBeVisible()
    })
  })

  test('Workspace layout shows panels', async ({ page }) => {
    await loadHomePage(page)
    await openMockFolder(page)

    await test.step('Se debe visualizar el modelo cargado en el árbol', async () => {
      await expect(page.getByText('BTTFKB').first()).toBeVisible()
    })

    await test.step('Y el selector de vistas del editor debe estar visible', async () => {
      await expect(page.getByTestId('view-switcher-editor')).toBeVisible()
    })
  })
})
