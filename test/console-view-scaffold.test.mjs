import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, readFile, cp } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(here, '..', 'scripts', 'export-console.mjs')
const samples = resolve(here, '..', '_samples_nn')

describe('scaffoldConsoleView (--new-view)', () => {
  let tmp

  before(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'nn-scaffold-view-'))
    await cp(samples, tmp, { recursive: true })
  })

  after(async () => {
    await rm(tmp, { recursive: true, force: true })
  })

  it('rejects invalid or reserved view slugs', async () => {
    await assert.rejects(
      async () => {
        await execFileAsync(process.execPath, [scriptPath, tmp, '--new-view', 'Invalid_Slug'])
      },
      /VIEWS_INVALID|Invalid view slug/,
    )

    await assert.rejects(
      async () => {
        await execFileAsync(process.execPath, [scriptPath, tmp, '--new-view', 'explorer'])
      },
      /VIEWS_INVALID|reserved/,
    )
  })

  it('scaffolds a domain table view and compiles it into domaiNN_console.html', async () => {
    const slug = 'resumen-programas'
    const { stdout } = await execFileAsync(process.execPath, [
      scriptPath,
      tmp,
      '--new-view',
      slug,
      '--template',
      'table',
      '--title',
      'Resumen de Programas',
    ])
    assert.match(stdout, /Created console view "Resumen de Programas"/)

    const targetFile = join(tmp, 'consoles', 'views', `${slug}.js`)
    assert.equal(existsSync(targetFile), true)
    const code = await readFile(targetFile, 'utf8')
    assert.match(code, /title: 'Resumen de Programas'/)
    assert.match(code, /nnUI\.DataTable/)

    // Export domain console and verify new view is recognized and inlined
    const exportRes = await execFileAsync(process.execPath, [scriptPath, tmp, '--domain', '--no-open'], {
      maxBuffer: 64 * 1024 * 1024,
    })
    assert.match(exportRes.stdout, /domaiNN_console\.html/)

    const html = await readFile(join(tmp, 'domaiNN_console.html'), 'utf8')
    assert.match(html, /viewRegistrar\("resumen-programas"/)
  })

  it('scaffolds a blueprint KPI view under blueprint assets directory', async () => {
    const slug = 'kpi-summary'
    const { stdout } = await execFileAsync(process.execPath, [
      scriptPath,
      tmp,
      '--new-view',
      slug,
      '--template',
      'kpi',
      '--blueprint',
      'metrics',
    ])
    assert.match(stdout, /Created console view/)

    const targetFile = join(tmp, 'specs', 'bluepriNNts', 'metrics', 'assets', `console-view-${slug}.js`)
    assert.equal(existsSync(targetFile), true)
    const code = await readFile(targetFile, 'utf8')
    assert.match(code, /nnUI\.KpiGrid/)
  })

  it('--status reports domain console as stale when bundle is newer than the console file', async () => {
    const consolePath = join(tmp, 'domaiNN_console.html')
    const past = new Date(Date.now() - 86400000)
    const { utimes } = await import('node:fs/promises')
    await utimes(consolePath, past, past)

    const { stdout } = await execFileAsync(process.execPath, [scriptPath, tmp, '--status'])
    assert.match(stdout, /Domain console: .* \[stale\]/)
  })
})
