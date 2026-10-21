// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const consoleDir = join(import.meta.dirname!, '..', '..', '..', 'specs', 'bluepriNNts', 'console')
const runtime = req(join(consoleDir, 'nn-runtime.js')) as any

// Spec: console-ui-kit "Renderers Consume the Kit" — renderDocument builds
// element and value units through Ku, addressed by canonical address.
describe('renderDocument Ku migration', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="innfo-doc"></div>'
  })

  it('renders the document element and its fields as addressed Ku units', () => {
    runtime.renderDocument(
      document,
      [
        {
          el: { id: 'root', slug: 'root', name: 'Root', concept: 'Thing' },
          fields: {},
          children: [],
        },
        {
          el: { id: 'step', slug: 'step', name: 'Step', concept: 'Thing' },
          fields: { step_type: 'start', owner: 'Egon' },
          children: [],
        },
      ],
      { modelId: 'lab' },
    )
    const element = document.querySelector('#innfo-doc [data-ku-kind="element"]')!
    expect(element).toBeTruthy()
    expect(element.getAttribute('data-ku-address')).toBe('lab@root')
    const values = [...document.querySelectorAll('#innfo-doc [data-ku-kind="value"]')]
    expect(values.length).toBeGreaterThan(0)
    for (const v of values) {
      expect((v as HTMLElement).getAttribute('data-ku-address')).toMatch(/^lab@(root|step)&/)
    }
  })
})
