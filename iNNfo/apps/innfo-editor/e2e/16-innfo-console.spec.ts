import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { pathToFileURL } from 'url'
import { createRequire } from 'module'
import fs from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = resolve(here, '../../../specs/templates/console')
const blueprintPath = resolve(consoleDir, 'artifact_blueprint.html')

/**
 * Builds a faithful generated console in repo temp/ scratch: the blueprint
 * with schema/model slots pre-filled plus the vendored runtime next to it —
 * exactly what the compile procedures ship. Returns the file:// URL so the
 * single auto-boot renders real data (no artificial double boot).
 */
function buildHarnessConsole(tag: string): string {
  const scratch = resolve(here, '../../../../temp/innfo-console-e2e')
  fs.mkdirSync(scratch, { recursive: true })
  fs.copyFileSync(resolve(consoleDir, 'innfo-runtime.js'), resolve(scratch, 'innfo-runtime.js'))
  const shell = fs.readFileSync(blueprintPath, 'utf8')
  const withSchema = shell.replace(
    /(<script type="application\/json" id="innfo-schema">)[\s\S]*?(<\/script>)/,
    `$1\n      ${JSON.stringify(schemaFixture)}\n    $2`,
  )
  const withModel = withSchema.replace(
    /(<script type="application\/json" id="innfo-model">)[\s\S]*?(<\/script>)/,
    `$1\n      ${JSON.stringify(modelFixture)}\n    $2`,
  )
  const outPath = resolve(scratch, `Acme_V_0-1-0_console_${tag}.html`)
  fs.writeFileSync(outPath, withModel)
  return pathToFileURL(outPath).href
}

const require = createRequire(import.meta.url)
const converters = require(
  '../../../../actioNN/skills/nn-trannsform/scripts/lib/scanner-converters.js',
) as {
  isFeedbackJsonPath: (p: string) => boolean
  validateFeedbackJson: (doc: unknown) => { meta: Record<string, unknown>; items: unknown[] }
  convertFeedbackJson: (content: string, baseName: string) => string
}

const schemaFixture = {
  concepts: [{ name: 'Goal' }, { name: 'Metric' }],
}
const modelFixture = {
  meta: { title: 'Acme', modelVersion: 'V_0-1-0' },
  elements: [
    {
      id: 'goal-grow',
      concept: 'Goal',
      name: 'Grow',
      description: 'Grow the business',
      fields: { owner: 'Lucas' },
    },
  ],
  matrices: [],
}

const validFeedbackFixture = {
  meta: {
    source_model: 'Acme',
    source_model_version: 'V_0-1-0',
    artifact: 'Acme_console.html',
    artifact_version: '0.1.0',
    exported_at: '2026-09-09T12:00:00Z',
    author: 'Lucas, primera revisión',
    feedback_slug: 'lucas-primera-revision',
    viewer: 'innfo-console/0.1.0',
  },
  items: [
    {
      id: 'fb-001',
      kind: 'comment',
      target: { element_id: 'goal-grow', concept: 'Goal', element: 'Grow' },
      comment: 'Clarify the owner field',
      status: 'pending',
    },
  ],
}

async function gotoOfflineBlueprint(page: Page, consoleUrl: string) {
  await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort())
  await page.route('https://raw.githubusercontent.com/**', (route) => route.abort())
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  await page.goto(consoleUrl)
  await page.waitForFunction(() => (window as unknown as { InnfoConsole?: unknown }).InnfoConsole, null, {
    timeout: 10000,
  })
  return errors
}

test.describe('innfo-console — feedback loop E2E', () => {
  test('offline file:// render from slots with search and hash routing', async ({ page }) => {
    const errors = await gotoOfflineBlueprint(page, buildHarnessConsole('render'))

    await expect(page.locator('.innfo-card h3', { hasText: 'Grow' })).toBeVisible({ timeout: 10000 })

    await expect(page.locator('#innfo-banner')).toContainText('Acme')
    await expect(page.locator('#innfo-banner')).toContainText('V_0-1-0')
    await expect(page.locator('.innfo-rail-item').first()).toContainText('Goal')
    await expect(page.locator('.innfo-card h3', { hasText: 'Grow' })).toBeVisible()

    const protocol = await page.evaluate(() => window.location.protocol)
    expect(protocol).toBe('file:')

    await page.fill('#innfo-search', 'grow')
    await expect(page.locator('.innfo-card')).toHaveCount(1)
    await page.fill('#innfo-search', 'zzz-no-match')
    await expect(page.locator('.innfo-card')).toHaveCount(0)

    expect(errors.filter((e) => e.includes('innfo-console boot failed'))).toEqual([])
  })

  test('export modal gates on identifier and resumes drafts after reload', async ({ page }) => {
    await gotoOfflineBlueprint(page, buildHarnessConsole('export'))

    const storageWorks = await page.evaluate(() => {
      try {
        window.localStorage.setItem('__innfo_probe', '1')
        window.localStorage.removeItem('__innfo_probe')
        return true
      } catch {
        return false
      }
    })

    await page.evaluate(
      (seed) => {
        const c = window as unknown as {
          InnfoConsole: {
            getDraftKey: (m: string, v: string) => string
          }
        }
        if (seed) {
          try {
            window.localStorage.setItem(
              c.InnfoConsole.getDraftKey('Acme', 'V_0-1-0'),
              JSON.stringify([
                {
                  id: 'fb-001',
                  kind: 'comment',
                  target: { element_id: 'goal-grow' },
                  comment: 'seeded draft',
                  status: 'pending',
                },
              ]),
            )
          } catch {
            /* file:// without storage — modal still gates, resume degrades gracefully */
          }
        }
      },
      storageWorks,
    )

    await page.click('#innfo-export-open')
    await expect(page.locator('#innfo-export-modal[open]')).toBeVisible()
    await expect(page.locator('#innfo-export-modal [data-innfo="instructions"]')).toContainText(
      storageWorks ? '1 pending draft' : '0 pending draft',
    )

    await page.click('#innfo-export-modal [data-innfo="download"]')
    await expect(page.locator('#innfo-export-modal[open]')).toBeVisible()

    await page.fill('#innfo-export-modal [data-innfo="identifier"]', 'Lucas, primera revisión')
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 5000 }),
      page.click('#innfo-export-modal [data-innfo="download"]'),
    ])
    expect(download.suggestedFilename()).toMatch(
      /^Acme_V_0-1-0_lucas-primera-revision_feedback_\d{8}-\d{6}\.json$/,
    )

    if (storageWorks) {
      await page.reload()
      const resumed = await page.evaluate(() => {
        const c = window as unknown as {
          InnfoConsole: { getDraftKey: (m: string, v: string) => string }
        }
        try {
          const raw = window.localStorage.getItem(c.InnfoConsole.getDraftKey('Acme', 'V_0-1-0'))
          return raw ? (JSON.parse(raw) as unknown[]).length : 0
        } catch {
          return 0
        }
      })
      expect(resumed).toBe(1)
    }
  })

  test('happy-path export validates and follows the feedback filename contract', async ({ page }) => {
    await gotoOfflineBlueprint(page, buildHarnessConsole('contract'))

    const result = await page.evaluate(() => {
      const c = window as unknown as {
        InnfoConsole: {
          buildExportDoc: (args: unknown) => { meta: unknown; items: unknown[] }
          validateFeedback: (doc: unknown) => { ok: boolean; errors: string[] }
          buildFeedbackFilename: (m: string, v: string, s: string, w: Date) => string
          parseFeedbackFilename: (f: string) => { model: string; version: string; slug: string } | null
        }
      }
      const doc = c.InnfoConsole.buildExportDoc({
        meta: {
          source_model: 'Acme',
          source_model_version: 'V_0-1-0',
          artifact: 'Acme_console.html',
          artifact_version: '0.1.0',
          exported_at: '2026-09-09T12:00:00Z',
          author: 'Lucas, primera revisión',
          feedback_slug: 'lucas-primera-revision',
          viewer: 'innfo-console/0.1.0',
        },
        drafts: [
          {
            id: 'fb-001',
            kind: 'comment',
            target: { element_id: 'goal-grow' },
            comment: 'Looks good',
            status: 'pending',
          },
        ],
      })
      const check = c.InnfoConsole.validateFeedback(doc)
      const filename = c.InnfoConsole.buildFeedbackFilename(
        'Acme',
        '0-1-0',
        'Lucas, primera revisión',
        new Date('2026-09-09T12:00:00Z'),
      )
      return { doc, check, filename, parsed: c.InnfoConsole.parseFeedbackFilename(filename) }
    })

    expect(result.check.ok).toBe(true)
    expect(result.filename).toMatch(/^Acme_V_0-1-0_lucas-primera-revision_feedback_20260909-120000\.json$/)
    expect(result.parsed).toMatchObject({ model: 'Acme', version: '0-1-0', slug: 'lucas-primera-revision' })

    const validated = converters.validateFeedbackJson(validFeedbackFixture)
    expect(validated.items).toHaveLength(1)
    const markdown = converters.convertFeedbackJson(
      JSON.stringify(validFeedbackFixture),
      'Acme_V_0-1-0_lucas-primera-revision_feedback_20260909-120000',
    )
    expect(markdown).toContain('## NN Meta')
    expect(markdown).toContain('### fb-001 (comment, pending)')
    expect(converters.isFeedbackJsonPath('sources/import/feedback/Acme_V_0-1-0_x_feedback_20260909-120000.json')).toBe(true)
  })

  test('stale feedback is reported and invalid payloads abort without side effects', async ({ page }) => {
    await gotoOfflineBlueprint(page, buildHarnessConsole('contract'))

    const browser = await page.evaluate(() => {
      const c = window as unknown as {
        InnfoConsole: {
          checkStaleness: (fb: string, live: string) => { stale: boolean; report: string }
          validateFeedback: (doc: unknown) => { ok: boolean; errors: string[] }
        }
      }
      const fresh = c.InnfoConsole.checkStaleness('V_0-1-0', 'V_0-1-0')
      const stale = c.InnfoConsole.checkStaleness('V_0-1-0', 'V_0-2-0')
      const bad = c.InnfoConsole.validateFeedback({
        meta: {
          source_model: 'Acme',
          source_model_version: 'V_0-1-0',
          artifact: 'Acme_console.html',
          artifact_version: '0.1.0',
          exported_at: '2026-09-09T12:00:00Z',
          author: 'Lucas',
          feedback_slug: 'lucas',
          viewer: 'innfo-console/0.1.0',
        },
        items: [{ id: 'fb-001', kind: 'rewrite', target: { element_id: 'goal-grow' }, status: 'pending' }],
      })
      return { fresh, stale, bad }
    })

    expect(browser.fresh.stale).toBe(false)
    expect(browser.stale.stale).toBe(true)
    expect(browser.stale.report).toContain('V_0-1-0')
    expect(browser.stale.report).toContain('V_0-2-0')
    expect(browser.bad.ok).toBe(false)
    expect(browser.bad.errors.join(' ')).toContain('rewrite')

    expect(() =>
      converters.validateFeedbackJson({
        ...validFeedbackFixture,
        items: [{ id: 'fb-001', kind: 'rewrite', target: { element_id: 'goal-grow' }, status: 'pending' }],
      }),
    ).toThrow(/fb-001/)
    expect(converters.isFeedbackJsonPath('sources/import/notes.json')).toBe(false)
  })
})
