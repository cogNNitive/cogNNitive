import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = join(here, '..', '..', '..', 'specs', 'templates', 'console')
const blueprintPath = join(consoleDir, 'artifact_blueprint.html')
const registryPath = join(consoleDir, 'needs-registry.json')
const runtimePath = join(consoleDir, 'innfo-runtime.js')

function readBlueprint(): string {
  return readFileSync(blueprintPath, 'utf8')
}

describe('artifact_blueprint.html (console shell)', () => {
  it('exists as a standalone file:// document', () => {
    expect(existsSync(blueprintPath)).toBe(true)
    expect(readBlueprint().toLowerCase()).toContain('<!doctype html>')
  })

  it('declares exactly the innfo-config block plus innfo-schema and innfo-model slots', () => {
    const html = readBlueprint()
    expect(html).toContain('id="innfo-config"')
    expect(html).toContain('id="innfo-schema"')
    expect(html).toContain('id="innfo-model"')
    const schemaSlots = (html.match(/id="innfo-schema"/g) ?? []).length
    const modelSlots = (html.match(/id="innfo-model"/g) ?? []).length
    expect(schemaSlots).toBe(1)
    expect(modelSlots).toBe(1)
  })

  it('declares needs[] inside innfo-config', () => {
    const html = readBlueprint()
    expect(html).toContain('"needs"')
  })

  it('loads the shared runtime via static script tags (no fetch, no modules)', () => {
    const html = readBlueprint()
    expect(html).toContain('innfo-runtime.js')
    expect(html).not.toContain('type="module"')
    expect(html).not.toContain('fetch(')
  })

  it('provides the review banner and export modal containers', () => {
    const html = readBlueprint()
    expect(html).toContain('id="innfo-banner"')
    expect(html).toContain('id="innfo-export-modal"')
  })
})

describe('needs-registry.json (capability pins)', () => {
  it('exists, is versioned, and pins the runtime CDN', () => {
    expect(existsSync(registryPath)).toBe(true)
    const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as {
      version: string
      runtime: { cdn: string; fallback: string }
      needs: Record<string, { description: string }>
    }
    expect(typeof registry.version).toBe('string')
    expect(registry.runtime.cdn).toContain('cdn.jsdelivr.net')
    expect(registry.runtime.cdn).toContain('innfo-runtime.js')
    expect(typeof registry.runtime.fallback).toBe('string')
  })

  it('registers the feedback-export capability', () => {
    const registry = JSON.parse(readFileSync(registryPath, 'utf8')) as {
      needs: Record<string, { description: string }>
    }
    expect(Object.keys(registry.needs)).toContain('feedback-export')
    expect(registry.needs['feedback-export'].description.length).toBeGreaterThan(0)
  })
})

describe('innfo-runtime.js (module hygiene)', () => {
  it('ships as UMD with no fetch() and no type=module', () => {
    const source = readFileSync(runtimePath, 'utf8')
    expect(source).toContain('InnfoConsole')
    expect(source).not.toContain('fetch(')
    expect(source).not.toContain('type=module')
  })
})
