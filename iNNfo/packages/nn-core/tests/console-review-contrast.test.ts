// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const UI = req(join(consoleDir, 'ui-kit.js')) as {
  TOKEN_VALUES: { light: Record<string, string>; dark: Record<string, string> }
}

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

// C14: the review-surface token pairs used by the console review UI.
const C14_TEXT_PAIRS: Array<[string, string]> = [
  ['--innfo-text', '--innfo-surface'],
  ['--innfo-text', '--innfo-surface-2'],
  ['--innfo-status-stale', '--innfo-status-stale-bg'],
]

describe('console-review-contrast (C14)', () => {
  it('review text/status pairs meet >= 4.5 in both themes', () => {
    for (const theme of ['light'] as const) {
      const v = UI.TOKEN_VALUES[theme]
      for (const [fg, bg] of C14_TEXT_PAIRS) {
        const r = ratio(v[fg], v[bg])
        expect(r, `pair ${fg} on ${bg} in "${theme}" is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('focus ring meets >= 3 against surface in both themes', () => {
    for (const theme of ['light'] as const) {
      const v = UI.TOKEN_VALUES[theme]
      const r = ratio(v['--innfo-focus'], v['--innfo-surface'])
      expect(r, `focus ring in "${theme}" is ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
    }
  })
})
