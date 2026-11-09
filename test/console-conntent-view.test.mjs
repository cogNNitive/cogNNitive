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

const HASH = 'a'.repeat(64)
const PREVIEW_HASH = 'b'.repeat(64)

const MODEL = {
  meta: { title: 'Probe', modelId: 'e_probe', changesBlueprintVersion: 'V_0-8-1' },
  elements: [
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
                elementId: 'e_probe@one',
                narration: 'hola',
                scriptHash: HASH,
                previewHash: PREVIEW_HASH,
                planHash: HASH,
                fields: { voice: { value: 'series-voice', source: 'series' } },
                sources: [
                  { name: 'voice', source: 'series' },
                  { name: 'transition', source: 'series' },
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
            pending: [{ gate: 'script', scene: 'one', state: 'open' }],
            deliveries: ['v1', 'v2'],
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

test('a scene card shows its still, audio, layers and inherited source line', () => {
  const { document } = bootConntent()
  const scene = document.querySelector('[data-nn-scene="one"]')
  assert.ok(scene, 'the scene card exists')
  assert.equal(scene.querySelector('.nn-review-still').getAttribute('src'), 'series/s/episodes/e/media/one.png')
  assert.equal(scene.querySelector('[data-nn-narration-audio]').getAttribute('src'), '.cognnitive/cache/video/tts/one.mp3')
  assert.match(scene.querySelector('[data-nn-layer="one-bg"]').textContent, /media/)
  const voiceSource = scene.querySelector('[data-nn-source="voice"]')
  assert.ok(voiceSource, 'the inherited voice is a chip')
  assert.match(voiceSource.textContent, /series/, 'the chip names where the value came from')
  assert.equal(scene.querySelectorAll('[data-nn-source]').length, 2, 'one chip per inherited value')
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
  assert.match(scene.textContent, /Approved for script/)
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
  const voice = card.querySelector('[data-nn-field="voice"]')
  assert.match(voice.textContent, /series-voice/)
  assert.match(voice.textContent, /series/, 'the source level is shown')
  const v1 = card.querySelector('[data-nn-delivery="v1"]')
  assert.ok(v1.getAttribute('data-nn-superseded') !== null, 'v1 is marked superseded')
  assert.match(card.querySelector('[data-nn-delivery="v2"]').textContent, /latest/)
})

test('the view never writes the review field and offers no Deliver button', () => {
  const code = readFileSync(VIEW_FILE, 'utf8')
  assert.doesNotMatch(code, /field:\s*'review'/, 'a verdict is not a review:: write')
  const { document } = bootConntent()
  const buttons = [...document.querySelectorAll('button')].map((b) => b.textContent)
  assert.equal(buttons.some((text) => /deliver/i.test(text)), false)
  assert.equal(document.body.textContent.includes('Clean orphans'), false)
})
