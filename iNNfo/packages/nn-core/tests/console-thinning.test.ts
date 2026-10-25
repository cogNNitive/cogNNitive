import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const templatesDir = join(here, '..', '..', '..', 'specs', 'bluepriNNts')
const repoRoot = join(here, '..', '..', '..', '..')

const assets = {
  shell: join(templatesDir, 'console', 'artifact_shell.html'),
}
const timelineView = join(templatesDir, 'metrics', 'assets', 'console-view-timeline.js')

// Markers that would indicate a duplicated inline copy of the shared runtime.
// Static <script src="...nn-runtime.js"> tags are REQUIRED (not markers).
const INLINE_RUNTIME_MARKERS = [
  'INNFO_RUNTIME_INLINE',
  'nn-runtime-inline',
  'window.nnConsole=',
  'window.nnConsole =',
]

function readAsset(path: string): string {
  return readFileSync(path, 'utf8')
}

describe.each([['shell', assets.shell]])('%s console asset', (_name, path) => {
  it('declares an nn-config block with a needs[] capability list', () => {
    const html = readAsset(path)
    expect(html).toContain('id="nn-config"')
    const match = html.match(/<script[^>]*id="nn-config"[^>]*>([\s\S]*?)<\/script>/)
    expect(match).not.toBe(null)
    const config = JSON.parse((match as RegExpMatchArray)[1]) as { needs: string[] }
    expect(Array.isArray(config.needs)).toBe(true)
    expect(config.needs.length).toBeGreaterThan(0)
  })

  it('loads a shared runtime via static script tags', () => {
    const html = readAsset(path)
    expect(html).toMatch(/nn-(runtime|console\.bundle)\.js/)
    expect(html).not.toContain('type="module"')
  })

  it('ships no duplicated inline runtime block', () => {
    const html = readAsset(path)
    for (const marker of INLINE_RUNTIME_MARKERS) {
      expect(html).not.toContain(marker)
    }
  })
})

describe('artifact_shell slot payloads', () => {
  it('keeps the #innfo-schema and #innfo-model slots', () => {
    const html = readAsset(assets.shell)
    expect(html).toContain('id="innfo-schema"')
    expect(html).toContain('id="innfo-model"')
  })
})

// The single shell (artifact_shell.html) keeps the shared slots and the ref
// dialog; the runtime creates #nn-citation-dialog on demand and the
// citation-icon colour rules live in the kit (data-origin driven).
describe('single shell + kit citation styling', () => {
  it('keeps the shared slots and the ref dialog, without legacy cite-icon rules', () => {
    const html = readAsset(assets.shell)
    expect(html).toContain('id="innfo-schema"')
    expect(html).toContain('id="innfo-model"')
    expect(html).toContain('id="nn-ref-dialog"')
    expect(html).not.toContain('.cite-icon.cite-agent')
  })

  it('ships origin tokens and rules in nnUI', () => {
    const kit = readAsset(join(templatesDir, 'console', 'ui-kit.js'))
    for (const origin of ['agent', 'human', 'reviewer', 'document', 'error']) {
      expect(kit).toContain(`--nn-origin-${origin}`)
    }
    expect(kit).toContain('[data-origin=agent]')
  })
})

// The metrics timeline is a registered VIEW now, not a shell: a classic script
// with no bundle tag and no inline dashboard engine.
describe('timeline view asset', () => {
  it('is a classic registered view with no bundle tag or inline engine', () => {
    const code = readAsset(timelineView)
    expect(code).toContain('registerView(')
    expect(code).toContain('renderTimelineGrid')
    expect(code).not.toContain('nn-console.bundle.js')
    expect(code).not.toMatch(/^\s*(import|export)\b/m)
    for (const marker of ['const MODEL_DATA', 'const FORMULAS', 'const DEPS', 'const SERIES', 'new uPlot']) {
      expect(code).not.toContain(marker)
    }
  })
})

describe('frozen vendored console bundles (not migrated, not guarded)', () => {
  // These export/sample bundles are permanent history: they keep their own
  // inlined CSS and must never be swept into the token migration nor scanned
  // by the console-shell guard (which skips /samples/ and /export/).
  const frozen = [
    join(
      repoRoot,
      'iNNfo',
      'packages',
      'nn-core',
      'tests',
      'fixtures',
      'simulacro-refactorizacion',
      'bluepriNNts',
      'metrics',
      'samples',
      'Ghostbusters_V_0-1-0_console.html',
    ),
  ]

  it('keeps their legacy inline :root colors (proves they were not migrated)', () => {
    for (const f of frozen) {
      const html = readAsset(f)
      expect(html, `${f} must keep its frozen inline :root colors`).toMatch(/--(bg|surface):\s*#/)
    }
  })
})
