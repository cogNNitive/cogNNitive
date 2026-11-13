/**
 * test/console-conntent-view.test.mjs
 *
 * The unified `conntent` view: Pending is home, then Domain, Series and Episode; the Episode
 * section is the review surface (gate strip, scene cards, verdicts). There is no Deliver
 * button and no orphan cleanup (capability conntent-domain-console; design D-C3; tasks
 * 4c.1/4c.2 and the 4c.3 approval flow).
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { bootConsole, nnConsole, consoleDir } from './helpers/console-boot.mjs'

const VIEW_FILE = join(consoleDir, '..', 'coNNtent', 'assets', 'console-view-conntent.js')
const FIELD_DEFINITIONS = JSON.parse(readFileSync(join(consoleDir, '..', 'coNNtent', 'skills', 'nn-conntent', 'scripts', 'lib', 'field-registry.generated.json'), 'utf8')).fields

const HASH = 'a'.repeat(64)
const PREVIEW_HASH = 'b'.repeat(64)

const MODEL = {
  meta: { title: 'Probe', modelId: 'e_probe', changesBlueprintVersion: 'V_0-8-1' },
  elements: [
    { id: 'e_probe@v', concept: 'Video', name: 'Probe Episode', slug: 'v', modelId: 'e_probe', fields: {}, hash: 'fedcba9876543210' },
    {
      id: 'e_probe@one',
      concept: 'Scene',
      name: 'One',
      slug: 'one',
      modelId: 'e_probe',
      fields: {},
      hash: '0123456789abcdef',
    },
  ],
  matrices: [],
}

const VIEW_DATA = {
  fieldDefinitions: FIELD_DEFINITIONS,
  tree: {
    domain: '/tmp/domain',
    series: [
      {
        slug: 's',
        title: 'Probe Series',
        episodes: [
          {
            slug: 'e',
            modelId: 's/e',
            knowledgeId: 'e_probe',
            elementId: 'e_probe@v',
            fields: { voice: { value: 'episode-voice', source: 'video' } },
            recordFields: { title: 'Probe Episode' },
            sceneKinds: ['Libre', 'Gancho'],
            title: 'Probe Episode',
            status: 'draft',
            language: 'es',
            planHash: HASH,
            reviewGates: ['script'],
            scenes: [
              {
                slug: 'one',
                name: 'One',
                kind: 'Gancho',
                recordFields: { kind: 'Gancho' },
                elementId: 'e_probe@one',
                narration: 'hola',
                scriptHash: HASH,
                previewHash: PREVIEW_HASH,
                stale: true,
                planHash: HASH,
                fields: { voice: { value: 'series-voice', source: 'series' }, transition: { value: 'fade', source: 'domain' } },
                sources: [
                  { name: 'voice', source: 'series', value: 'series-voice', type: 'string' },
                  { name: 'transition', source: 'domain', value: 'fade', type: 'select' },
                ],
                still: 'series/s/episodes/e/media/one.png',
                audio: '.cognnitive/cache/video/tts/one.mp3',
                layers: [
                  { slug: 'one-bg', type: 'media', style: '', text: '', asset: 'media/one.png', assetKind: 'image' },
                ],
                gates: [{ gate: 'script', scene: 'one', state: 'open' }],
              },
            ],
            gates: [{ gate: 'script', scene: 'one', state: 'open', cause: null }],
            staleScenes: ['one'],
            pending: [{ gate: 'script', scene: 'one', state: 'open' }],
            deliveries: [
              {
                version: 'v1',
                path: 'series/s/episodes/e/deliveries/v1',
                files: ['e_1920x1920.mp4', 'e_delivery.html'],
                html: 'series/s/episodes/e/deliveries/v1/e_delivery.html',
              },
              {
                version: 'v2',
                path: 'series/s/episodes/e/deliveries/v2',
                files: ['e_1920x1920.mp4'],
                html: null,
              },
            ],
            latestDelivery: 'v2',
          },
        ],
      },
    ],
  },
  pending: [{ series: 's', episode: 'e', gate: 'script', scene: 'one', state: 'open', notes: null }],
}

function bootConntent({ viewData = VIEW_DATA, model = MODEL } = {}) {
  const registry = nnConsole.createViewRegistry()
  const factory = new Function('registerView', readFileSync(VIEW_FILE, 'utf8'))
  factory(registry.registrar('conntent', 'probe'))
  const booted = bootConsole({ registry, model, viewData: { conntent: viewData } })
  const tab = booted.document.querySelector('.nn-view-tab[data-tab="conntent"]')
  if (tab) tab.click()
  return booted
}

const draftsOf = (booted) => booted.res.state.store.drafts()

test('the view ships as a classic script that reads ctx.viewData', () => {
  const code = readFileSync(VIEW_FILE, 'utf8')
  assert.match(code, /registerView\(\{/)
  assert.doesNotMatch(code, /^\s*(import|export)\s/m)
  assert.match(code, /ctx\.viewData/)
})

test('Pending is home and lists every open gate', () => {
  const { document } = bootConntent()
  const home = document.querySelector('[data-nn-section="pending"][data-nn-home]')
  assert.ok(home, 'the pending section is marked as home')
  assert.match(home.textContent, /Pending/)
  const gate = home.querySelector('[data-nn-gate="script"]')
  assert.ok(gate, 'the open gate is listed')
  assert.equal(gate.getAttribute('data-nn-state'), 'open')
  assert.match(gate.textContent, /e/)
})

test('Domain, Series and Episode sections exist', () => {
  const { document } = bootConntent()
  for (const id of ['domain', 'series', 'episode']) {
    assert.ok(document.querySelector(`[data-nn-section="${id}"]`), `section ${id}`)
  }
  assert.match(document.querySelector('[data-nn-series="s"]').textContent, /Probe Series/)
  assert.match(document.querySelector('[data-nn-episode-config="e"]').textContent, /Probe Episode/)
})

test('the gate strip names each gate, what it protects, and the automatic QA cell has no controls', () => {
  const { document } = bootConntent()
  const script = document.querySelector('[data-nn-gate-cell="script"]')
  assert.ok(script, 'the script gate has a cell')
  assert.match(script.textContent, /before any spend/)
  const qa = document.querySelector('[data-nn-gate-cell="qa"]')
  assert.ok(qa, 'the automatic QA cell is present')
  assert.equal(qa.querySelectorAll('button, input, select').length, 0, 'QA offers no controls')
})

test('a scene card shows its still, audio, layers and field origins', () => {
  const { document } = bootConntent()
  const scene = document.querySelector('[data-nn-scene="one"]')
  assert.ok(scene, 'the scene card exists')
  const thumb = scene.querySelector('[data-nn-media-open]')
  assert.ok(thumb, 'the media thumbnail opens the lightbox')
  assert.equal(thumb.querySelector('img').getAttribute('src'), 'series/s/episodes/e/media/one.png')
  assert.equal(scene.querySelector('[data-nn-narration-audio]').getAttribute('src'), '.cognnitive/cache/video/tts/one.mp3')
  assert.match(scene.querySelector('[data-nn-layer="one-bg"]').textContent, /media/)
  const voiceSource = scene.querySelector('[data-nn-settings="Scene"] [data-nn-setting="voice"]')
  assert.ok(voiceSource, 'the inherited voice is listed')
  assert.match(voiceSource.textContent, /series-voice/, 'the inherited value is shown')
  const transitionSource = scene.querySelector('[data-nn-settings="Scene"] [data-nn-setting="transition"]')
  assert.ok(transitionSource.querySelector('.nn-field-select'), 'a select value renders with the select widget')
  assert.match(transitionSource.textContent, /domain/, 'the origin badge is visible')
  assert.match(transitionSource.textContent, /transition/, 'the field name is not replaced by the origin')
  assert.ok(scene.querySelector('[data-nn-edit-setting="kind"]'), 'local fields are editable too')
})

test('approving a scene writes a review_gate verdict with the payload hash', () => {
  const booted = bootConntent()
  const scene = booted.document.querySelector('[data-nn-scene="one"]')
  scene.querySelector('[data-nn-verdict="approved"]').click()
  const drafts = draftsOf(booted)
  assert.equal(drafts.length, 1)
  const [draft] = drafts
  assert.equal(draft.kind, 'verdict')
  assert.equal(draft.gate, 'script')
  assert.equal(draft.verdict, 'approved')
  assert.equal(draft.reviewed_hash, HASH, 'the hash is copied from the payload, never computed')
  assert.equal(draft.element_slug, 'one')
  assert.match(scene.textContent, /Approval proposed for script/)
})

test('needs change without a reason writes nothing, and with a reason keeps it as notes', () => {
  const booted = bootConntent()
  const scene = booted.document.querySelector('[data-nn-scene="one"]')
  scene.querySelector('[data-nn-verdict="needs-change"]').click()
  assert.equal(draftsOf(booted).length, 0, 'an empty reason writes nothing')

  scene.querySelector('[data-nn-verdict-reason]').value = 'tighten the hook'
  scene.querySelector('[data-nn-verdict="needs-change"]').click()
  const [draft] = draftsOf(booted)
  assert.equal(draft.verdict, 'needs-change')
  assert.equal(draft.notes, 'tighten the hook')
})

test('an approved scene offers no approve control', () => {
  const viewData = JSON.parse(JSON.stringify(VIEW_DATA))
  const scene = viewData.tree.series[0].episodes[0].scenes[0]
  scene.gates = [{ gate: 'script', scene: 'one', state: 'approved' }]
  viewData.tree.series[0].episodes[0].gates = [{ gate: 'script', scene: 'one', state: 'approved' }]
  viewData.pending = []
  const { document } = bootConntent({ viewData })
  const card = document.querySelector('[data-nn-scene="one"]')
  assert.equal(card.querySelector('[data-nn-verdict="approved"]'), null, 'no approve on an approved scene')
  assert.match(card.textContent, /Approved for script/)
})

test('the episode shows gate state, field source and deliveries', () => {
  const { document } = bootConntent()
  const card = document.querySelector('[data-nn-episode-config="e"]')
  assert.ok(card.querySelector('[data-nn-gate-state="open"]'), 'the gate state is visible')
  const voice = card.querySelector('[data-nn-settings="Video"] [data-nn-setting="voice"]')
  assert.match(voice.textContent, /episode-voice/)
  assert.match(voice.textContent, /Set here/, 'episode configuration does not borrow the first scene')
  const v1 = card.querySelector('[data-nn-delivery="v1"]')
  assert.ok(v1.getAttribute('data-nn-superseded') !== null, 'v1 is marked superseded')
  assert.match(v1.textContent, /superseded/)
  assert.match(v1.textContent, /series\/s\/episodes\/e\/deliveries\/v1/, 'the folder is copyable text')
  const link = v1.querySelector('a[href="series/s/episodes/e/deliveries/v1/e_delivery.html"]')
  assert.ok(link, 'v1 links to its delivery page by relative path')
  const v2 = card.querySelector('[data-nn-delivery="v2"]')
  assert.match(v2.textContent, /latest/)
  assert.ok(!v2.getAttribute('data-nn-superseded'), 'the newest is not superseded')
  assert.ok(!v1.querySelector('button'), 'the folder is text, not a control')
})

test('a stale translation says so on the episode and on the scene', () => {
  const { document } = bootConntent()
  const card = document.querySelector('[data-nn-episode-config="e"]')
  assert.ok(card.hasAttribute('data-nn-stale'), 'the episode header carries the mark')
  assert.match(card.querySelector('.nn-stale-badge').textContent, /one/, 'the flag names the scene')
  const scene = card.querySelector('[data-nn-scene="one"]')
  assert.ok(scene.hasAttribute('data-nn-stale'), 'the scene row carries the mark')
  assert.match(scene.querySelector('.nn-stale-badge').textContent, /stale/)
})

test('the view never writes the review field and offers no Deliver button', () => {
  const code = readFileSync(VIEW_FILE, 'utf8')
  assert.doesNotMatch(code, /field:\s*'review'/, 'a verdict is not a review:: write')
  const { document } = bootConntent()
  const buttons = [...document.querySelectorAll('button')].map((b) => b.textContent)
  assert.equal(buttons.some((text) => /^Deliver(?: episode)?$/i.test(text)), false)
  assert.equal(document.body.textContent.includes('Clean orphans'), false)
})

function bootDelivery({ viewData = VIEW_DATA, model = MODEL, deliveryVersion = 'v1' } = {}) {
  const registry = nnConsole.createViewRegistry()
  const factory = new Function('registerView', readFileSync(VIEW_FILE, 'utf8'))
  const registrar = registry.registrar('conntent', 'probe')
  factory(registrar)
  const deliveryModel = {
    ...model,
    meta: {
      ...model.meta,
      consoleScope: {
        view: 'conntent-delivery',
        readOnly: true,
        models: ['e_probe'],
        label: 'Probe Episode v1',
      },
    },
  }
  const booted = bootConsole({
    registry,
    model: deliveryModel,
    viewData: { 'conntent-delivery': viewData, conntent: viewData },
  })
  return booted
}

test('the view module registers conntent-delivery as a readonly view', () => {
  const registry = nnConsole.createViewRegistry()
  const factory = new Function('registerView', readFileSync(VIEW_FILE, 'utf8'))
  factory(registry.registrar('conntent', 'probe'))
  const views = registry.list()
  const deliveryView = views.find((v) => v.id === 'conntent-delivery')
  assert.ok(deliveryView, 'conntent-delivery view is registered')
  assert.equal(deliveryView.kind, 'readonly')
})

test('conntent-delivery renders read-only episode panel with sibling relative media and no controls', () => {
  const booted = bootDelivery()
  const { document } = booted
  assert.equal(document.querySelector('#nn-rail'), null, 'no rail')
  assert.equal(document.querySelector('#nn-tab-explorer'), null, 'no explorer')
  const deliveryEl = document.querySelector('[data-nn-delivery-view]') || document.querySelector('.nn-delivery-view')
  assert.ok(deliveryEl, 'delivery view container is rendered')
  assert.match(deliveryEl.textContent, /Probe Episode/)
  assert.match(deliveryEl.textContent, /v1/)
  const players = deliveryEl.querySelectorAll('video')
  assert.ok(players.length > 0, 'at least one player exists')
  const src = players[0].getAttribute('src')
  assert.match(src, /^\.\//, 'media path starts with ./')
  assert.equal(deliveryEl.querySelectorAll('button[data-nn-verdict]').length, 0, 'no verdict buttons')
  assert.equal(deliveryEl.querySelectorAll('textarea.nn-narration').length, 0, 'no editable narration')
  assert.equal(draftsOf(booted).length, 0, 'no drafts created')
  assert.equal(deliveryEl.querySelector('[data-nn-subsection="config"]'), null, 'config omitted')
  assert.equal(deliveryEl.querySelector('[data-nn-subsection="status"]'), null, 'status omitted')
  assert.doesNotMatch(deliveryEl.textContent, /cost|budget|ledger/i, 'no cost/budget/ledger')
  assert.equal(deliveryEl.querySelector('[data-nn-superseded]'), null, 'no superseded mark')
})

test('editing a components slot opens the component picker dialog with slot filter and upward lookup', () => {
  const componentViewData = JSON.parse(JSON.stringify(VIEW_DATA))
  componentViewData.tree.series[0].episodes[0].components = [
    {
      name: 'boxed',
      slot: 'title',
      duration: 3,
      aspect: ['16:9'],
      source: 'local',
      tokens: ['colors.text'],
      level: 'series',
      shadowed: false,
      preview: 'series/s/library/components/boxed/preview.mp4',
    },
    {
      name: 'boxed',
      slot: 'title',
      duration: 3,
      aspect: ['16:9'],
      source: 'local',
      tokens: ['colors.text'],
      level: 'domain',
      shadowed: true,
      preview: 'library/components/boxed/preview.mp4',
    },
    {
      name: 'plain',
      slot: 'quote',
      duration: 2,
      aspect: ['16:9'],
      source: 'local',
      tokens: [],
      level: 'domain',
      shadowed: false,
      preview: null,
    },
    {
      name: 'kinetic',
      slot: 'title',
      duration: 4,
      aspect: ['16:9', '9:16'],
      source: 'registry:kinetic@1.0.0',
      tokens: ['colors.primary'],
      level: 'blueprint',
      shadowed: false,
      preview: 'library/components/kinetic/preview.mp4',
    },
  ]
  componentViewData.tree.series[0].episodes[0].fields.components = {
    source: 'series',
    value: ['title=boxed', 'quote=plain'],
  }
  const booted = bootConntent({ viewData: componentViewData })
  const { document, dom } = booted

  const openBtn = document.querySelector('[data-nn-picker="components"][data-nn-slot="title"]') ||
                  document.querySelector('[data-nn-component-slot="title"]')
  assert.ok(openBtn, 'picker trigger button exists for title slot')
  openBtn.click()

  const dialog = document.querySelector('[data-nn-component-picker]')
  assert.ok(dialog, 'picker dialog opened')

  const items = dialog.querySelectorAll('[data-nn-component-item]')
  assert.equal(items.length, 3, 'only 3 title components listed')
  assert.equal(dialog.querySelector('[data-nn-component="plain"]'), null, 'quote component not listed')

  const domainBoxed = dialog.querySelector('[data-nn-component="boxed"][data-nn-level="domain"]')
  assert.ok(domainBoxed.hasAttribute('data-nn-shadowed'), 'domain entry is marked shadowed')
  const seriesBoxed = dialog.querySelector('[data-nn-component="boxed"][data-nn-level="series"]')
  assert.ok(!seriesBoxed.hasAttribute('data-nn-shadowed'), 'series entry is selectable')

  const kineticItem = dialog.querySelector('[data-nn-component="kinetic"]')
  kineticItem.querySelector('[data-nn-select-component]').click()
  const drafts = draftsOf(booted)
  assert.equal(drafts.length, 1, 'draft proposed')
  assert.equal(drafts[0].field, 'components')
  assert.ok(drafts[0].proposed.includes('title=kinetic'))
  assert.equal(drafts[0].element_id, 'e_probe@v', 'components are episode-scoped')

  openBtn.click()
  assert.ok(document.querySelector('[data-nn-component-picker]'))
  const event = new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  document.dispatchEvent(event)
  assert.equal(document.querySelector('[data-nn-component-picker]'), null, 'dialog closed by Escape')
})

