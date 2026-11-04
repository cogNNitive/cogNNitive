import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const consoleDir = join(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'console')
const UI = require(join(consoleDir, 'ui-kit.js'))
const nnConsole = require(join(consoleDir, 'nn-runtime.js'))

// Mounts UI.EditModal in a fresh jsdom document and returns the capture helpers.
// The global window/document/localStorage mirror the pattern in
// test/console-review.test.mjs so composeChangesetExport can run.
function mount(data) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    url: 'http://localhost',
  })
  const { window } = dom
  const document = window.document
  global.window = window
  global.document = document
  global.localStorage = window.localStorage

  let saved = null
  let saves = 0
  const modal = UI.EditModal(data, {
    doc: document,
    onSave: (res) => {
      saves++
      saved = res
    },
  })
  document.body.appendChild(modal)

  const save = () =>
    modal
      .querySelector('.nn-edit-btn-save')
      .dispatchEvent(new window.Event('click', { bubbles: true }))

  const widget = () => modal.querySelector('[data-nn-widget]')
  const proposeButton = () =>
    [...modal.querySelectorAll('.nn-edit-mode-btn')].find((b) => /propose/i.test(b.textContent))
  const errorBox = () => modal.querySelector('.nn-edit-error')

  return {
    dom,
    window,
    document,
    modal,
    save,
    widget,
    proposeButton,
    errorBox,
    getSaved: () => saved,
    saveCount: () => saves,
  }
}

describe('Edit Modal Value Type Safety (S3b P0-2)', () => {
  describe('number', () => {
    it('proposes the edited value as a JavaScript number, not a string', () => {
      const t = mount({ title: 'Edit price', fieldName: 'price', type: 'number', value: 5 })
      const input = t.modal.querySelector('input[type="number"]')
      assert.ok(input, 'a number field edits through input[type=number]')
      input.value = '7'
      t.save()
      assert.equal(typeof t.getSaved().proposed, 'number')
      assert.equal(t.getSaved().proposed, 7)
    })

    it('refuses an empty input with an inline error and does not call onSave', () => {
      const t = mount({ title: 'Edit price', fieldName: 'price', type: 'number', value: 5 })
      t.modal.querySelector('input[type="number"]').value = ''
      t.save()
      assert.equal(t.saveCount(), 0, 'onSave was not called')
      const err = t.errorBox()
      assert.ok(err, 'an inline error node exists')
      assert.equal(err.style.display, 'block')
      assert.match(err.textContent, /number/i)
    })
  })

  describe('select', () => {
    it('contains a blank option and preserves an unknown current value on an unchanged save', () => {
      const t = mount({ type: 'select', value: 'legacy', options: ['a', 'b'] })
      const select = t.modal.querySelector('select[data-nn-widget="select"]')
      const values = [...select.querySelectorAll('option')].map((o) => o.value)
      assert.equal(values[0], '', 'the blank option is first')
      assert.ok(values.includes('legacy'), 'the unknown current value has its own option')
      const extra = [...select.querySelectorAll('option')].find((o) => o.value === 'legacy')
      assert.equal(extra.getAttribute('data-not-in-options'), 'true', 'marked as not in the options')
      assert.equal(select.value, 'legacy')
      t.save()
      assert.equal(t.getSaved().proposed, 'legacy')
    })

    it('preserves a blank current value on an unchanged save', () => {
      const t = mount({ type: 'select', value: '', options: ['a', 'b'] })
      const select = t.modal.querySelector('select[data-nn-widget="select"]')
      assert.equal(select.value, '')
      t.save()
      assert.equal(t.getSaved().proposed, '')
    })
  })

  describe('array and object values', () => {
    it('opens comment-only for an array with Propose disabled and no value input', () => {
      const t = mount({ type: 'string', value: ['a', 'b'] })
      assert.equal(t.modal.querySelector('.nn-edit-form-propose').style.display, 'none')
      const propose = t.proposeButton()
      assert.ok(propose, 'the Propose control is present')
      assert.equal(propose.disabled, true, 'the Propose control is disabled')
      assert.match(t.modal.textContent, /comment/i)
      const offenders = [...t.modal.querySelectorAll('input, textarea, select')].filter(
        (n) => String(n.value) === 'a,b',
      )
      assert.equal(offenders.length, 0, 'no control holds the String()-coerced list')
    })

    it('never turns an object into "[object Object]"', () => {
      const t = mount({ type: 'string', value: { w: 1 } })
      assert.equal(t.modal.querySelector('.nn-edit-form-propose').style.display, 'none')
      const ta = t.modal.querySelector('.nn-edit-form-comment textarea')
      ta.value = 'structured value needs review'
      t.save()
      const saved = t.getSaved()
      assert.equal(saved.isComment, true)
      assert.equal(saved.proposed, undefined)
      assert.notEqual(String(saved.proposed), '[object Object]')
    })
  })

  describe('string', () => {
    it('edits a multi-line string in a textarea and proposes it verbatim', () => {
      const value = 'line one\nline two'
      const t = mount({ type: 'string', value })
      assert.equal(t.widget().tagName, 'TEXTAREA')
      t.save()
      assert.equal(t.getSaved().proposed, value)
    })

    it('edits a string longer than 70 characters in a textarea', () => {
      const t = mount({ type: 'string', value: 'x'.repeat(71) })
      assert.equal(t.widget().tagName, 'TEXTAREA')
    })

    it('keeps the single-line input for a 70-character string', () => {
      const t = mount({ type: 'string', value: 'x'.repeat(70) })
      assert.equal(t.widget().tagName, 'INPUT')
    })
  })

  describe('draft export', () => {
    it('exports a number draft as an unquoted `to:: 7`', () => {
      const t = mount({ title: 'Edit price', fieldName: 'price', type: 'number', value: 5 })
      t.modal.querySelector('input[type="number"]').value = '7'
      t.save()
      const proposed = t.getSaved().proposed
      assert.equal(typeof proposed, 'number', 'the modal proposes a number end to end')

      const res = nnConsole.composeChangesetExport(
        {
          modelTitle: 'BusinessModel',
          meta: { changesBlueprintVersion: 'V_0-3-0' },
          store: {
            drafts: () => [
              {
                id: 'c-01',
                element_slug: 'enterprise_plan',
                field: 'price',
                original: 5,
                proposed,
                comment: '',
              },
            ],
          },
        },
        'author_jane',
      )
      assert.equal(res.ok, true)
      assert.match(res.text, /^to:: 7$/m)
      assert.doesNotMatch(res.text, /to:: "7"/)
    })
  })
})

describe('Markdown and reference widgets (S3b groups 10-11)', () => {
  it('a markdown_inline field edits in a textarea and proposes the text verbatim', () => {
    const text = 'line one\n**line** two'
    const t = mount({ title: 'Edit brief', fieldName: 'brief', type: 'markdown_inline', value: text })
    assert.equal(t.widget().tagName, 'TEXTAREA')
    t.save()
    assert.equal(t.getSaved().proposed, text)
    const edited = mount({ title: 'Edit brief', fieldName: 'brief', type: 'markdown_inline', value: text })
    edited.widget().value = 'changed\n\n# H'
    edited.save()
    assert.equal(edited.getSaved().proposed, 'changed\n\n# H')
  })

  it('a reference autocompletes over title and address, and writes the address', () => {
    const candidates = [
      { address: 'innteresante/intro', title: 'Intro' },
      { address: 'villabotijos-today/intro', title: 'Intro' },
      { address: 'villabotijos-today/pepper-mapache', title: 'El mapache fuera de la ley' },
    ]
    const t = mount({ title: 'Edit sequel', fieldName: 'sequel', type: 'reference', value: 'villabotijos-today/intro', candidates })
    assert.deepEqual(
      [...t.modal.querySelectorAll('[data-nn-reference-option]')].map((o) => o.textContent),
      ['Intro - innteresante/intro', 'Intro - villabotijos-today/intro', 'El mapache fuera de la ley - villabotijos-today/pepper-mapache'],
    )
    t.save()
    assert.equal(t.getSaved().proposed, 'villabotijos-today/intro', 'an unchanged value proposes the original address')
    const changed = mount({ title: 'Edit sequel', fieldName: 'sequel', type: 'reference', value: 'villabotijos-today/intro', candidates })
    changed.modal.querySelector('.nn-edit-reference input').value = 'innteresante/intro'
    changed.save()
    assert.equal(changed.getSaved().proposed, 'innteresante/intro', 'the selected address is what is stored')
    const blank = mount({ title: 'Edit sequel', fieldName: 'sequel', type: 'reference', value: 'villabotijos-today/intro', candidates })
    blank.modal.querySelector('.nn-edit-reference input').value = ''
    blank.save()
    assert.equal(blank.getSaved().proposed, '', 'a blank value clears the reference')
  })


  it('a reference only accepts an address among the candidates', () => {
    const candidates = [
      { address: 'innteresante/intro', title: 'Intro' },
      { address: 'villabotijos-today/intro', title: 'Intro' },
    ]
    const typed = (text) => {
      const t = mount({ title: 'Edit sequel', fieldName: 'sequel', type: 'reference', value: 'villabotijos-today/intro', candidates })
      t.modal.querySelector('.nn-edit-reference input').value = text
      t.save()
      return t
    }
    const unknown = typed('Intro')
    assert.equal(unknown.saveCount(), 0, 'a title is not an address: nothing is saved')
    assert.notEqual(unknown.errorBox().style.display, 'none', 'the error box is shown')
    // The message names the title and the address of every candidate.
    assert.match(unknown.errorBox().textContent, /"Intro" \(innteresante\/intro\)/)
    assert.equal(typed('[[Intro]]').saveCount(), 0, 'the removed bracket form is rejected')
    const exact = typed('innteresante/intro')
    assert.equal(exact.saveCount(), 1)
    assert.equal(exact.getSaved().proposed, 'innteresante/intro', 'an exact address is accepted')
  })
})
