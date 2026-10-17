// S3b groups 9-12 end to end: a real fixture domaiNN is exported through
// scripts/export-console.mjs and the result is booted in jsdom, so none of this
// rests on a hand-fed payload.
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { InnfoConsole, bootConsole } from './helpers/console-boot.mjs'

const execFileAsync = promisify(execFile)
const here = dirname(fileURLToPath(import.meta.url))
const scriptPath = resolve(here, '..', 'scripts', 'export-console.mjs')

const BLUEPRINT = `---
level: 2
spec_version: V_0-1-0
title: "Roadmap"
---

# NN Concept Definition
## NN Concept Definition: Initiative
type:: list

## NN Concept Definition: Person
type:: list

# NN Field Definition
## NN Field Definition: tags
concept:: *
type:: select
options:: []
multiple:: true

## NN Field Definition: stage
concept:: Initiative
type:: select
options:: [idea, build, run]

## NN Field Definition: owner
concept:: Initiative
type:: reference
target_concepts:: [Person]

## NN Field Definition: peer
concept:: Initiative
type:: reference

## NN Field Definition: demo
concept:: Initiative
type:: video

## NN Field Definition: clip
concept:: Initiative
type:: video

## NN Field Definition: brief
concept:: Initiative
type:: markdown_inline

## NN Field Definition: home
concept:: Initiative
type:: knowledge
`

const model = (body) =>
  `---\ntitle: "x"\nmodel_version: "V_1-0-0"\nlevel: 3\nparent_spec:\n  name: "roadmap_V_0-1-0"\n---\n\n${body}\n`

const ROADMAP = model(`# NN Initiative
tags:: [core]

## NN Initiative: Alpha
  slug:: alpha
  tags:: [AI, Pricing]
  stage:: build
  owner:: [[Ana]]
  peer:: [[Beta]]
  demo:: sources/demo.mp4
  clip:: https://example.com/v.mp4
  brief:: **bold** and [bad](javascript:alert(1))
  home:: [[kNNowledge/pricing_NN.md]]
  sources:: sources/nn/interview.md@## Clients

## NN Initiative: Beta
  slug:: beta
  tags:: ai
  stage:: idea
  home:: [[kNNowledge/unknown_NN.md]]

# NN Person
## NN Person: Ana
  slug:: ana

## NN Person: Ben
  slug:: ben`)

const PRICING = model(`# NN Person
## NN Person: Zed
  slug:: zed

## NN Person: Retail
  slug:: retail
  tags:: retail`)

function slotOf(html, id) {
  const m = html.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)</script>`))
  assert.ok(m, `slot ${id} present`)
  return JSON.parse(m[1])
}

describe('S3b parity (groups 9-12) on a real export', () => {
  let root
  let schema
  let model_
  let scoped

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-s3b-'))
    const dir = join(root, 'specs', 'bluepriNNts', 'roadmap')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'spec_NN.md'), BLUEPRINT, 'utf-8')
    await mkdir(join(root, 'models'), { recursive: true })
    await writeFile(join(root, 'models', 'roadmap_NN.md'), ROADMAP, 'utf-8')
    await writeFile(join(root, 'models', 'pricing_NN.md'), PRICING, 'utf-8')
    await mkdir(join(root, 'sources', 'nn'), { recursive: true })
    await writeFile(join(root, 'sources', 'demo.mp4'), 'x', 'utf-8')
    await writeFile(join(root, 'sources', 'nn', 'interview.md'), '# Interview\n\n## Clients\nAcme buys.\n', 'utf-8')
    await execFileAsync(process.execPath, [scriptPath, root, '--domain', '--no-open'])
    const html = await readFile(join(root, 'domaiNN_console.html'), 'utf-8')
    schema = slotOf(html, 'innfo-schema')
    model_ = slotOf(html, 'innfo-model')
    await execFileAsync(process.execPath, [scriptPath, root, 'roadmap', '--no-open'])
    const files = await readdir(join(root, 'artifacts'), { recursive: true })
    const deeper = files.find((f) => String(f).endsWith('.html'))
    assert.ok(deeper, 'a scoped console was written under artifacts/')
    scoped = slotOf(await readFile(join(root, 'artifacts', deeper), 'utf-8'), 'innfo-model')
  })

  after(() => rm(root, { recursive: true, force: true }))

  const el = (m, name) => m.elements.find((e) => e.name === name)

  describe('group 9: tags in the payload', () => {
    it('carries own tags in fields.tags and inherited in inherited.tags', () => {
      assert.deepEqual(el(model_, 'Alpha').fields.tags, ['AI', 'Pricing'])
      assert.deepEqual(el(model_, 'Alpha').inherited.tags.value, ['core'])
      assert.equal(el(model_, 'Beta').fields.tags, 'ai')
      assert.deepEqual(el(model_, 'Beta').inherited.tags.value, ['core'])
      assert.equal(el(model_, 'Ana').fields.tags, undefined)
    })
  })

  describe('group 10: relative links', () => {
    it('rebases a declared video for a console written deeper, leaves remote values alone', () => {
      assert.equal(el(scoped, 'Alpha').fields.demo, '../../sources/demo.mp4')
      assert.equal(el(scoped, 'Alpha').fields.clip, 'https://example.com/v.mp4')
    })

    it('the domain console at the root keeps ./ relative values', () => {
      assert.equal(el(model_, 'Alpha').fields.demo, './sources/demo.mp4')
    })

    it('citation entries keep a domain-relative path and gain an href relative to the file', () => {
      const atRoot = el(model_, 'Alpha').citations.sources[0]
      assert.equal(atRoot.path, 'sources/nn/interview.md')
      assert.equal(atRoot.href, './sources/nn/interview.md')
      const deep = el(scoped, 'Alpha').citations.sources[0]
      assert.equal(deep.path, 'sources/nn/interview.md')
      assert.equal(deep.href, '../../sources/nn/interview.md')
    })
  })

  function boot(extra = {}) {
    const registry = InnfoConsole.createViewRegistry()
    let ctx
    registry.register({
      id: 'probe',
      title: 'probe',
      icon: 'chart',
      order: 20,
      kind: 'editable',
      mount(c) {
        ctx = c
      },
    })
    const booted = bootConsole({ registry, model: model_, schema, ...extra })
    booted.document.querySelector('.innfo-view-tab[data-tab="probe"]').click()
    const idOf = (name) => model_.elements.find((e) => e.name === name).id
    return { ...booted, ctx, idOf }
  }

  describe('group 10: select, reference, media in the booted console', () => {
    it('a declared select renders a pill and edits through a select with no free-text input', () => {
      const { document, ctx, idOf } = boot()
      assert.ok(
        [...document.querySelectorAll('.innfo-field-select')].some((n) => n.textContent === 'build'),
        'stage renders as a pill',
      )
      assert.equal(ctx.modal.edit({ elementId: idOf('Alpha'), field: 'stage' }), true)
      const modal = document.querySelector('.innfo-edit-modal')
      assert.ok(modal.querySelector('select[data-innfo-widget="select"]'))
      assert.equal(modal.querySelector('input[type="text"]'), null, 'no free-text input for a select')
    })

    it('reference candidates are the target concepts of the same model, proposing [[Name]]', () => {
      const { document, ctx, idOf } = boot()
      const window = document.defaultView
      assert.equal(ctx.modal.edit({ elementId: idOf('Alpha'), field: 'owner' }), true)
      const modal = document.querySelector('.innfo-edit-modal')
      const names = [...modal.querySelectorAll('datalist option')].map((o) => o.value).sort()
      assert.deepEqual(names, ['Ana', 'Ben'], 'Person elements of the same model only')
      const input = modal.querySelector('.innfo-edit-reference input')
      input.value = 'Ben'
      modal.querySelector('.innfo-edit-btn-save').dispatchEvent(new window.Event('click', { bubbles: true }))
      const stored = Object.keys(window.localStorage).map((k) => window.localStorage.getItem(k)).join('|')
      assert.ok(stored.includes('[[Ben]]'), 'the draft proposes [[Ben]]')
    })

    it('a reference with no declared targets offers the same model and no other', () => {
      const { document, ctx, idOf } = boot()
      assert.equal(ctx.modal.edit({ elementId: idOf('Alpha'), field: 'peer' }), true)
      const names = [...document.querySelectorAll('.innfo-edit-modal datalist option')].map((o) => o.value)
      assert.ok(['Alpha', 'Beta', 'Ana', 'Ben'].every((n) => names.includes(n)))
      assert.ok(!names.includes('Zed') && !names.includes('Retail'), 'no element of the other model')
    })

    it('a declared video renders a player, and so does a remote declared video', () => {
      const { document } = boot()
      const srcs = [...document.querySelectorAll('video.innfo-field-media')].map((v) => v.getAttribute('src'))
      assert.ok(srcs.includes('./sources/demo.mp4'))
      assert.ok(srcs.includes('https://example.com/v.mp4'))
    })
  })

  describe('group 11: markdown through the booted console', () => {
    it('a markdown_inline field renders structure and the unsafe link stays text', () => {
      const { document } = boot()
      const md = document.querySelector('.innfo-field-markdown')
      assert.ok(md, 'markdown field rendered through the safe renderer')
      assert.equal(md.querySelector('strong').textContent, 'bold')
      assert.equal(md.querySelector('a'), null, 'javascript: link is not an anchor')
    })
  })

  describe('group 12: tag row, knowledge click-through, open original', () => {
    const cards = (document) =>
      [...document.querySelectorAll('#innfo-content [data-innfo-component="element-card"]')].map((c) =>
        c.getAttribute('data-element-id'),
      )
    const cardOf = (document, id) => document.querySelector(`#innfo-content article[data-element-id="${id}"]`)

    it('shows the tag row from effective tags and none when empty', () => {
      const { document, idOf } = boot()
      const chips = [...cardOf(document, idOf('Alpha')).querySelectorAll('[data-innfo-component="tag-row"] [data-tag]')]
      assert.deepEqual(chips.map((c) => c.getAttribute('data-tag')), ['ai', 'pricing', 'core'])
      assert.equal(cardOf(document, idOf('Ana')).querySelector('[data-innfo-component="tag-row"]'), null)
    })

    it('clicking a chip adds tags:<t> to the filter and filters', () => {
      const { document, idOf } = boot()
      cardOf(document, idOf('Alpha')).querySelector('[data-tag="pricing"]').click()
      assert.match(document.getElementById('innfo-search').value, /tags:pricing/)
      assert.deepEqual(cards(document), [idOf('Alpha')])
    })

    it('tags: is exact, so tags:ai does not list the retail-tagged element', () => {
      const { document, idOf } = boot()
      cardOf(document, idOf('Alpha')).querySelector('[data-tag="ai"]').click()
      assert.deepEqual(cards(document).sort(), [idOf('Alpha'), idOf('Beta')].sort())
    })

    it('a knowledge pill naming a model applies its model filter', () => {
      const { document, idOf } = boot()
      const pill = cardOf(document, idOf('Alpha')).querySelector('[data-field-type="knowledge"]')
      assert.equal(pill.getAttribute('data-knowledge-bound'), 'true')
      pill.click()
      const pricingId = model_.meta.models.find((m) => m.filePath === 'pricing_NN.md').id
      assert.equal(document.getElementById('innfo-search').value, `model:${pricingId}`)
      assert.ok(cards(document).length > 0)
      assert.ok(cards(document).every((id) => model_.elements.find((e) => e.id === id).modelId === pricingId))
    })

    it('an unknown model is inert and offers no create or bind control', () => {
      const { document, idOf } = boot()
      const pill = cardOf(document, idOf('Beta')).querySelector('[data-field-type="knowledge"]')
      assert.equal(pill.getAttribute('data-knowledge-bound'), null)
      const before = document.getElementById('innfo-search').value
      assert.doesNotThrow(() => pill.click())
      assert.equal(document.getElementById('innfo-search').value, before)
      assert.equal(document.querySelector('[data-innfo-ctl="knowledge-create"], [data-innfo-ctl="knowledge-bind"]'), null)
    })

    it('the citation dialog offers Open original for a resolved entry', () => {
      const { document, idOf } = boot()
      document.defaultView.HTMLDialogElement.prototype.showModal ||= function () {
        this.setAttribute('open', '')
      }
      cardOf(document, idOf('Alpha')).querySelector('.cite-icons .cite-icon').click()
      const link = document.getElementById('innfo-citation-dialog').querySelector('a.innfo-cite-open')
      assert.ok(link, 'Open original link')
      assert.equal(link.getAttribute('href'), './sources/nn/interview.md')
      assert.equal(link.getAttribute('target'), '_blank')
      assert.equal(link.getAttribute('rel'), 'noopener noreferrer')
    })
  })
})

describe('Open original: unsafe and unresolved entries get no link', () => {
  it('error entries and javascript: hrefs show no link', () => {
    const entries = [
      { path: 'sources/a.md', error: 'missing', href: './sources/a.md' },
      { path: 'sources/b.md', href: 'javascript:alert(1)' },
      { path: 'sources/c.md' },
    ]
    const { document } = bootConsole({
      model: {
        meta: { title: 'M', modelId: 'm', modelVersion: 'V_1-0-0' },
        elements: [
          { id: 'e1', concept: 'Fleet', name: 'E1', fields: {}, hash: '0123456789abcdef', citations: { sources: entries } },
        ],
        matrices: [],
      },
    })
    document.defaultView.HTMLDialogElement.prototype.showModal ||= function () {
      this.setAttribute('open', '')
    }
    document.querySelector('.cite-icons .cite-icon').click()
    const dialog = document.getElementById('innfo-citation-dialog')
    assert.ok(dialog, 'dialog opened')
    assert.equal(dialog.querySelector('a'), null)
  })
})
