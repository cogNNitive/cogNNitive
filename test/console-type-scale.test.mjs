import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { consoleDir } from './helpers/console-boot.mjs'

// Issue #914: the console rendered 23 distinct font sizes at half-pixel
// resolution. The fix is one 6-step scale (candidate A from the specimen) held
// in custom properties, and every `font-size` must name one of its steps.
//
// The step names say the job, not the size, so the ramp can move again without
// renaming the call sites.
const SCALE = {
  '--nn-text-micro': '12px',
  '--nn-text-small': '14px',
  '--nn-text-body': '16px',
  '--nn-text-title-sm': '18px',
  '--nn-text-title': '21px',
  '--nn-text-display': 'clamp(24px, 2.4vw, 32px)',
}

// The scale may only be declared in the console shell's own token block.
const css = readFileSync(join(consoleDir, 'nn-ui.css'), 'utf8')

function fontSizeValues() {
  const out = []
  for (const match of css.matchAll(/font-size:\s*([^;}]+)/g)) {
    out.push(match[1].replace('!important', '').trim())
  }
  return out
}

describe('the console keeps one 6-step type scale', () => {
  it('declares every step once, with candidate A cut points', () => {
    for (const [name, value] of Object.entries(SCALE)) {
      const declared = css.match(new RegExp(`${name}:\\s*([^;]+);`, 'g')) ?? []
      assert.equal(declared.length, 1, `${name} is declared exactly once`)
      assert.equal(
        declared[0].replace(`${name}:`, '').replace(';', '').trim(),
        value,
        `${name} keeps its cut point`,
      )
    }
  })

  it('never sets a font-size to a literal value', () => {
    // A lone 0 is not a size: it hides a node, it does not pick a step.
    const literals = fontSizeValues().filter(
      (value) => value !== '0' && !value.startsWith('var(--nn-text-'),
    )
    assert.deepEqual(literals, [], 'a raw font-size is how 23 sizes grew back')
  })

  it('only names steps from the scale', () => {
    const known = new Set(Object.keys(SCALE).map((name) => `var(${name})`))
    const unknown = fontSizeValues().filter((value) => value !== '0' && !known.has(value))
    assert.deepEqual(unknown, [], 'every font-size names a step of the scale')
  })

  it('does not carry the old per-size override into SVG text', () => {
    // The graph labels used to carry a literal 9px and the matrix corners a
    // literal 11px. Both now take the micro step, so they cannot drift apart.
    assert.ok(
      !/font-size:\s*\d+(?:\.\d+)?px/.test(css),
      'no px font-size survives anywhere in the stylesheet',
    )
  })
})
