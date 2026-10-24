import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = join(here, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const shellPath = join(consoleDir, 'artifact_shell.html')
const registryPath = join(consoleDir, 'needs-registry.json')
const runtimePath = join(consoleDir, 'nn-runtime.js')

function readShell(): string {
  return readFileSync(shellPath, 'utf8')
}

describe('artifact_shell.html (console shell)', () => {
  it('exists as a standalone file:// document', () => {
    expect(existsSync(shellPath)).toBe(true)
    expect(readShell().toLowerCase()).toContain('<!doctype html>')
  })

  it('declares exactly the nn-config block plus innfo-schema and innfo-model slots', () => {
    const html = readShell()
    expect(html).toContain('id="nn-config"')
    expect(html).toContain('id="innfo-schema"')
    expect(html).toContain('id="innfo-model"')
    const schemaSlots = (html.match(/id="innfo-schema"/g) ?? []).length
    const modelSlots = (html.match(/id="innfo-model"/g) ?? []).length
    expect(schemaSlots).toBe(1)
    expect(modelSlots).toBe(1)
  })

  it('declares needs[] inside nn-config', () => {
    const html = readShell()
    expect(html).toContain('"needs"')
  })

  it('loads the shared runtime via static script tags (no fetch, no modules)', () => {
    const html = readShell()
    expect(html).toContain('nn-runtime.js')
    expect(html).not.toContain('type="module"')
    expect(html).not.toContain('fetch(')
  })

  it('does not contain hardcoded review banner or export modal (bundle-injected)', () => {
    const html = readShell()
    expect(html).not.toContain('id="nn-banner"')
    expect(html).not.toContain('id="nn-export-modal"')
  })
})

describe('needs-registry.json (capability pins)', () => {
  it('exists and adheres to capability-only shape (no version, no URLs)', () => {
    expect(existsSync(registryPath)).toBe(true)
    const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Record<string, any>
    expect(registry.version).toBeUndefined()
    expect(registry.runtime).toBeUndefined()
    expect(Object.keys(registry)).toContain('feedback-export')
    expect(Object.keys(registry)).toContain('charts')
  })

  it('registers the feedback-export capability with required anchors', () => {
    const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Record<string, { description: string; anchors: string[][] }>
    expect(registry['feedback-export']).toBeDefined()
    expect(registry['feedback-export'].description.length).toBeGreaterThan(0)
    expect(Array.isArray(registry['feedback-export'].anchors)).toBe(true)
  })

  it('registers the charts capability with anchors and optional renderer', () => {
    const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as Record<string, { description?: string; renderer?: string; anchors: string[][] }>
    expect(registry['charts']).toBeDefined()
    expect(registry['charts'].description).toBeDefined()
    expect(registry['charts'].renderer).toBeDefined()
    expect(Array.isArray(registry['charts'].anchors)).toBe(true)
  })
})

describe('nn-runtime.js (module hygiene)', () => {
  it('ships as UMD with no fetch() and no type=module', () => {
    const source = readFileSync(runtimePath, 'utf8')
    expect(source).toContain('nnConsole')
    expect(source).not.toContain('fetch(')
    expect(source).not.toContain('type=module')
  })
})

describe('nn-console.bundle.js (single-file distribution)', () => {
  const bundlePath = join(consoleDir, 'nn-console.bundle.js')

  it('exists and embeds console globals in order', () => {
    expect(existsSync(bundlePath)).toBe(true)
    const bundle = readFileSync(bundlePath, 'utf8')
    expect(bundle).toContain('nnPreact')
    expect(bundle).toContain('nnVisuals')
    expect(bundle).toContain('nnIcons')
    expect(bundle).toContain('nnConsole')
    expect(bundle).not.toContain('nnModelViewer')
    expect(bundle).toContain('nnProcedureStepper')
  })

  it('keeps the no-fetch / no-module hygiene of the runtime', () => {
    const bundle = readFileSync(bundlePath, 'utf8')
    expect(bundle).not.toContain('fetch(')
    expect(bundle).not.toContain('type=module')
  })

  it('matches the runtime version stamp', () => {
    // Single source of truth for console version is iNNfo/specs/bluepriNNts/console/package.json (AD-6).
    const repoRoot = join(here, '..', '..', '..', '..')
    const consolePkgPath = join(repoRoot, 'iNNfo', 'specs', 'bluepriNNts', 'console', 'package.json')
    const consolePkg = JSON.parse(readFileSync(consolePkgPath, 'utf8'))
    const declared = consolePkg.version

    expect(declared, 'console package.json must declare a version').toBeTruthy()

    const bundle = readFileSync(bundlePath, 'utf8')
    expect(bundle).toContain(`Version ${declared}`)
  })
})
