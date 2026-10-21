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
const InnfoConsole = require(join(consoleDir, 'nn-runtime.js'))

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
      .querySelector('.innfo-edit-btn-save')
      .dispatchEvent(new window.Event('click', { bubbles: true }))

  const widget = () => modal.querySelector('[data-innfo-widget]')
  const proposeButton = () =>
    [...modal.querySelectorAll('.innfo-edit-mode-btn')].find((b) => /propose/i.test(b.textContent))
  const errorBox = () => modal.querySelector('.innfo-edit-error')

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
      const select = t.modal.querySelector('select[data-innfo-widget="select"]')
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
      const select = t.modal.querySelector('select[data-innfo-widget="select"]')
      assert.equal(select.value, '')
      t.save()
      assert.equal(t.getSaved().proposed, '')
    })
  })

  describe('array and object values', () => {
    it('opens comment-only for an array with Propose disabled and no value input', () => {
      const t = mount({ type: 'string', value: ['a', 'b'] })
      assert.equal(t.modal.querySelector('.innfo-edit-form-propose').style.display, 'none')
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
      assert.equal(t.modal.querySelector('.innfo-edit-form-propose').style.display, 'none')
      const ta = t.modal.querySelector('.innfo-edit-form-comment textarea')
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

      const res = InnfoConsole.composeChangesetExport(
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

  it('a reference proposes [[Display Name]] and keeps an unchanged value as it was', () => {
    const candidates = [{ id: 'ana', name: 'Ana', concept: 'Person' }, { id: 'ben', name: 'Ben', concept: 'Person' }]
    const t = mount({ title: 'Edit owner', fieldName: 'owner', type: 'reference', value: '[[Ana]]', candidates })
    assert.deepEqual(
      [...t.modal.querySelectorAll('datalist option')].map((o) => o.value),
      ['Ana', 'Ben'],
    )
    t.save()
    assert.equal(t.getSaved().proposed, '[[Ana]]')
    const changed = mount({ title: 'Edit owner', fieldName: 'owner', type: 'reference', value: '[[Ana]]', candidates })
    changed.modal.querySelector('.innfo-edit-reference input').value = 'Ben'
    changed.save()
    assert.equal(changed.getSaved().proposed, '[[Ben]]')
    const blank = mount({ title: 'Edit owner', fieldName: 'owner', type: 'reference', value: '[[Ana]]', candidates })
    blank.modal.querySelector('.innfo-edit-reference input').value = ''
    blank.save()
    assert.equal(blank.getSaved().proposed, '')
  })


  it('a reference only accepts a name among the candidates, case-insensitively, and no brackets', () => {
    const candidates = [{ id: 'ana', name: 'Ana', concept: 'Person' }, { id: 'ben', name: 'Ben', concept: 'Person' }]
    const typed = (text) => {
      const t = mount({ title: 'Edit owner', fieldName: 'owner', type: 'reference', value: '[[Ana]]', candidates })
      t.modal.querySelector('.innfo-edit-reference input').value = text
      t.save()
      return t
    }
    const unknown = typed('Nobody')
    assert.equal(unknown.saveCount(), 0, 'an unknown name is not saved')
    assert.notEqual(unknown.errorBox().style.display, 'none', 'the error box is shown')
    assert.equal(typed('Ana]] x [[Ben').saveCount(), 0, 'brackets in the name are rejected')
    assert.equal(typed('[[Nobody]]').saveCount(), 0, 'a wrapped unknown name is rejected too')
    const lower = typed('ben')
    assert.equal(lower.saveCount(), 1)
    assert.equal(lower.getSaved().proposed, '[[Ben]]', 'proposes the candidate display name')
  })
})
