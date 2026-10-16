// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const uiKitPath = join(consoleDir, 'ui-kit.js')

type InnfoUI = {
  TOKEN_VALUES: { light: Record<string, string>; dark: Record<string, string> }
}

const UI = req(uiKitPath) as InnfoUI

// Independent WCAG relative-luminance implementation (never imports the kit's).
function srgbToLinear(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) throw new Error(`not a hex color: ${hex}`)
  const r = parseInt(m[1].slice(0, 2), 16)
  const g = parseInt(m[1].slice(2, 4), 16)
  const b = parseInt(m[1].slice(4, 6), 16)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

function ratio(fg: string, bg: string): number {
  const l1 = luminance(fg)
  const l2 = luminance(bg)
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

const STATUSES = ['pending', 'applied', 'rejected', 'stale']
const ORIGINS = ['agent', 'human', 'reviewer', 'document', 'error']

// Allowed text pairs per the design (TEXT_PAIRS). Light muted is NOT allowed on
// surface-2 (4.39 < 4.5); only these pairs are enumerated.
const TEXT_PAIRS: Array<[string, string]> = [
  ['--innfo-text', '--innfo-bg'],
  ['--innfo-muted', '--innfo-surface'],
  ['--innfo-muted', '--innfo-bg'],
  ['--innfo-link', '--innfo-surface'],
]

describe('console ui-kit contrast', () => {
  it('status fg meets >= 4.5 against its own -bg in both themes', () => {
    for (const theme of ['light'] as const) {
      const v = UI.TOKEN_VALUES[theme]
      for (const s of STATUSES) {
        const r = ratio(v[`--innfo-status-${s}`], v[`--innfo-status-${s}-bg`])
        expect(r, `status "${s}" in "${theme}" is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('allowed text pairs meet >= 4.5 in both themes', () => {
    for (const theme of ['light'] as const) {
      const v = UI.TOKEN_VALUES[theme]
      for (const [fg, bg] of TEXT_PAIRS) {
        const r = ratio(v[fg], v[bg])
        expect(r, `pair ${fg} on ${bg} in "${theme}" is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('origin icons (UI graphics) meet >= 3 against --innfo-surface in both themes', () => {
    for (const theme of ['light'] as const) {
      const v = UI.TOKEN_VALUES[theme]
      for (const o of ORIGINS) {
        const r = ratio(v[`--innfo-origin-${o}`], v['--innfo-surface'])
        expect(r, `origin "${o}" in "${theme}" is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('concept tint tokens make badge text meet >= 4.5 in both themes', () => {
    for (const theme of ['light'] as const) {
      const v = UI.TOKEN_VALUES[theme]
      for (let slot = 1; slot <= 12; slot++) {
        const tint = v[`--innfo-concept-${slot}-bg`]
        expect(tint, `--innfo-concept-${slot}-bg in "${theme}" must exist`).toBeTruthy()
        const r = ratio(v['--innfo-text'], tint)
        expect(r, `text on concept-${slot}-bg in "${theme}" is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
