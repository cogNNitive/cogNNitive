import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { pathToFileURL } from 'url'
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..', '..', '..')
const consoleDir = resolve(repoRoot, 'iNNfo', 'specs', 'templates', 'console')
const assetsDir = resolve(repoRoot, 'iNNfo', 'specs', 'templates', 'business', 'assets')

const schemaFixture = {
  concepts: [
    { name: 'Problems', color: 'red', weight: 90 },
    { name: 'Value propositions', color: 'blue', weight: 80 },
  ],
}
const modelFixture = {
  meta: { title: 'Ghostbusters', template: 'business_V_0-2-3', modelVersion: 'V_0-2-1' },
  elements: [
    {
      id: 'problems-paranormal-infestation',
      concept: 'Problems',
      name: 'Paranormal Infestation',
      description: 'Sites overrun by hostile spectral entities.',
      fields: { severity: 'high' },
      markers: { importance: 'High' },
      relations: [
        {
          field: 'resolved_by',
          target: 'value-propositions-removal-service',
          targetLabel: 'Removal Service',
        },
      ],
    },
    {
      id: 'value-propositions-removal-service',
      concept: 'Value propositions',
      name: 'Removal Service',
      description: 'We come, we see, we kick its ass.',
      fields: {},
      markers: {},
      relations: [],
    },
  ],
  matrices: [
    {
      name: 'Problems-Value propositions',
      rows: ['Paranormal Infestation'],
      cols: ['Removal Service'],
      cells: { 'Paranormal Infestation': { 'Removal Service': 'Max' } },
    },
  ],
}

function fillSlots(shell: string): string {
  return shell
    .replace(
      /(<script type="application\/json" id="innfo-schema">)[\s\S]*?(<\/script>)/,
      `$1\n      ${JSON.stringify(schemaFixture)}\n    $2`,
    )
    .replace(
      /(<script type="application\/json" id="innfo-model">)[\s\S]*?(<\/script>)/,
      `$1\n      ${JSON.stringify(modelFixture)}\n    $2`,
    )
}

/** Original (pre-extraction, inline renderer) vs thinned shell, same slots. */
function buildHarnesses(): { origUrl: string; newUrl: string } {
  const scratch = resolve(repoRoot, 'temp', 'innfo-viewer-e2e')
  fs.mkdirSync(scratch, { recursive: true })
  const origShell = execSync('git show HEAD:iNNfo/specs/templates/business/assets/model_viewer.html', {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  const newShell = fs.readFileSync(resolve(assetsDir, 'model_viewer.html'), 'utf8')
  for (const f of ['innfo-runtime.js', 'render-model-viewer.js']) {
    fs.copyFileSync(resolve(consoleDir, f), resolve(scratch, f))
  }
  const origPath = resolve(scratch, 'orig-viewer.html')
  const newPath = resolve(scratch, 'new-viewer.html')
  fs.writeFileSync(origPath, fillSlots(origShell))
  fs.writeFileSync(newPath, fillSlots(newShell))
  return { origUrl: pathToFileURL(origPath).href, newUrl: pathToFileURL(newPath).href }
}

async function gotoOffline(page: Page, url: string) {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort())
  await page.route('https://raw.githubusercontent.com/**', (route) => route.abort())
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  await page.goto(url)
  await expect(page.locator('.element').first()).toBeVisible({ timeout: 10000 })
  return errors
}

async function snapshot(page: Page) {
  return page.evaluate(() => ({
    title: document.getElementById('doc-title')?.textContent,
    meta: document.getElementById('doc-meta')?.textContent,
    rail: document.getElementById('rail')?.textContent,
    content: (document.getElementById('content')?.innerHTML || '').replace(/\s+/g, ' '),
  }))
}

test.describe('model-viewer renderer extraction', () => {
  test('thinned shell renders byte-identical DOM to the inline original', async ({ page }) => {
    const { origUrl, newUrl } = buildHarnesses()
    await gotoOffline(page, origUrl)
    const before = await snapshot(page)
    await gotoOffline(page, newUrl)
    const after = await snapshot(page)
    expect(after).toEqual(before)
  })

  test('viewer behaviors survive extraction: rail, collapse, chips, relations, matrix, search, hash', async ({
    page,
  }) => {
    const { newUrl } = buildHarnesses()
    const errors = await gotoOffline(page, newUrl)

    await expect(page.locator('#doc-title')).toHaveText('Ghostbusters')
    await expect(page.locator('nav#rail button').first()).toContainText('All concepts')
    await expect(page.locator('.element')).toHaveCount(2)

    await test.step('collapsible element with marker chip', async () => {
      const first = page.locator('#el-problems-paranormal-infestation')
      await expect(first.locator('.chip')).toContainText('importance')
      await first.locator('.el-head').click()
      await expect(first).toHaveClass(/open/)
    })

    await test.step('relationship link resolves to the target anchor', async () => {
      const href = await page
        .locator('#el-problems-paranormal-infestation .rel-list a')
        .getAttribute('href')
      expect(href).toBe('#el-value-propositions-removal-service')
    })

    await test.step('matrix grid renders cells', async () => {
      await expect(page.locator('table.matrix td', { hasText: 'Max' })).toBeVisible()
    })

    await test.step('search filters elements', async () => {
      await page.fill('#search', 'removal service')
      await expect(page.locator('.element')).toHaveCount(1)
      await page.fill('#search', '')
      await expect(page.locator('.element')).toHaveCount(2)
    })

    await test.step('hash opens the target element', async () => {
      await page.goto(`${newUrl}#el-value-propositions-removal-service`)
      await expect(page.locator('#el-value-propositions-removal-service.open')).toBeVisible()
    })

    expect(errors.filter((e) => e.includes('innfo-model-viewer boot failed'))).toEqual([])
  })
})
