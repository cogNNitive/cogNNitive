/**
 * test/console-conntent-view.test.mjs
 *
 * The unified `conntent` view: Pending is home, then Domain, Series and Episode sections;
 * there is no Deliver button and no orphan cleanup (capability conntent-domain-console;
 * design D-C3; tasks 4c.1/4c.2).
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { bootConsole, nnConsole, consoleDir } from './helpers/console-boot.mjs'

const VIEW_FILE = join(consoleDir, '..', 'coNNtent', 'assets', 'console-view-conntent.js')

const HASH = 'a'.repeat(64)
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
            title: 'Probe Episode',
            status: 'draft',
            language: 'es',
            planHash: HASH,
            reviewGates: ['script'],
            scenes: [
              {
                slug: 'one',
                name: 'One',
                narration: 'hola',
                scriptHash: HASH,
                previewHash: null,
                fields: { voice: { value: 'series-voice', source: 'series' } },
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

function bootConntent({ viewData = VIEW_DATA } = {}) {
  const registry = nnConsole.createViewRegistry()
  const factory = new Function('registerView', readFileSync(VIEW_FILE, 'utf8'))
  factory(registry.registrar('conntent', 'probe'))
  const booted = bootConsole({ registry, viewData: { conntent: viewData } })
  const tab = booted.document.querySelector('.nn-view-tab[data-tab="conntent"]')
  if (tab) tab.click()
  return booted
}

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

test('there is no Deliver button and no orphan cleanup', () => {
  const { document } = bootConntent()
  const buttons = [...document.querySelectorAll('button')].map((b) => b.textContent)
  assert.equal(buttons.some((text) => /deliver/i.test(text)), false)
  assert.equal(document.body.textContent.includes('Clean orphans'), false)
})
