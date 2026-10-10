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
  console: join(templatesDir, 'workspace', 'assets', 'model_console.html'),
}
const timelineView = join(templatesDir, 'metrics', 'assets', 'console-view-timeline.js')
const consoleUiKit = join(templatesDir, 'console', 'ui-kit.js')

// Markers that would indicate a duplicated inline copy of the shared runtime.
// Static <script src="...innfo-runtime.js"> tags are REQUIRED (not markers).
const INLINE_RUNTIME_MARKERS = [
  'INNFO_RUNTIME_INLINE',
  'innfo-runtime-inline',
  'window.InnfoConsole=',
  'window.InnfoConsole =',
]

function readAsset(path: string): string {
  return readFileSync(path, 'utf8')
}

describe.each([
  ['shell', assets.shell],
  ['console', assets.console],
])('%s console asset', (_name, path) => {
  it('declares an innfo-config block with a needs[] capability list', () => {
    const html = readAsset(path)
    expect(html).toContain('id="innfo-config"')
    const match = html.match(/<script[^>]*id="innfo-config"[^>]*>([\s\S]*?)<\/script>/)
    expect(match).not.toBe(null)
    const config = JSON.parse((match as RegExpMatchArray)[1]) as { needs: string[] }
    expect(Array.isArray(config.needs)).toBe(true)
    expect(config.needs.length).toBeGreaterThan(0)
  })

  it('loads a shared runtime via static script tags', () => {
    const html = readAsset(path)
    expect(html).toMatch(/innfo-(runtime|console\.bundle)\.js/)
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

// The workspace-level console asset is the citation-aware sibling of the
// business viewer shell: same renderer contract, plus the native citation
// dialog and icon colour rules, plus the shared bundle (not the split
// innfo-runtime.js/render-model-viewer.js tags the business shell still
// uses).
describe('console (workspace) slot payloads', () => {
  it('keeps the #innfo-schema and #innfo-model slots', () => {
    const html = readAsset(assets.console)
    expect(html).toContain('id="innfo-schema"')
    expect(html).toContain('id="innfo-model"')
  })

  it('boots the shared console bundle (not the legacy split runtime/renderer tags)', () => {
    const html = readAsset(assets.console)
    expect(html).toContain('innfo-console.bundle.js')
    expect(html).not.toContain('innfo-runtime.js')
    expect(html).not.toContain('render-model-viewer.js')
  })

  it('declares the native citation dialog; colour rules now live in InnfoUI', () => {
    const html = readAsset(assets.console)
    expect(html).toContain('id="innfo-citation-dialog"')
    expect(html).toContain('aria-label="Citation details"')
    // Citation-icon colours moved to the kit (data-origin driven); the shell
    // must no longer carry the legacy .cite-icon.cite-* rules.
    expect(html).not.toContain('.cite-icon.cite-agent')
    const kit = readAsset(consoleUiKit)
    for (const origin of ['agent', 'human', 'reviewer', 'document', 'error']) {
      expect(kit).toContain(`--innfo-origin-${origin}`)
    }
    expect(kit).toContain('[data-origin=agent]')
  })

  it('widens the innfo-ref-dialog CSS selectors to also cover innfo-citation-dialog', () => {
    const html = readAsset(assets.console)
    expect(html).toContain('#innfo-ref-dialog, #innfo-citation-dialog')
  })
})

// The metrics timeline is a registered VIEW now, not a shell: a classic script
// with no bundle tag and no inline dashboard engine.
describe('timeline view asset', () => {
  it('is a classic registered view with no bundle tag or inline engine', () => {
    const code = readAsset(timelineView)
    expect(code).toContain('registerView(')
    expect(code).toContain('renderTimelineGrid')
    expect(code).not.toContain('innfo-console.bundle.js')
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
      templatesDir,
      'procedures',
      'samples',
      'export',
      'Ghostbusters_V_0-2-0_procedures_console',
      'Ghostbusters_V_0-2-0_procedures_console.html',
    ),
    join(
      templatesDir,
      'procedures',
      'procedures',
      'export',
      'document_sop_console',
      'document_sop_console.html',
    ),
    join(
      repoRoot,
      'iNNfo',
      'packages',
      'innfo-core',
      'tests',
      'fixtures',
      'simulacro-refactorizacion',
      'bluepriNNts',
      'metrics',
      'samples',
      'Ghostbusters_V_0-1-0_console.html',
    ),
    join(
      repoRoot,
      'iNNfo',
      'packages',
      'innfo-core',
      'tests',
      'legacy',
      'fixtures',
      'legacy-domain',
      'templates',
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
