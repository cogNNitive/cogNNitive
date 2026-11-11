/**
 * test/export-console-hierarchical-ids.test.mjs
 *
 * #606 defect 2: the domain console addresses a model by the domain index id, never by
 * its filename stem. A distributed coNNtent episode under `series/<s>/episodes/<e>/` is
 * `<s>/<e>` in its element ids and `el.modelId`, so a verdict drafted on one of its
 * scenes exports `target:: <s>/<e>@<scene>` (what `apply_change` resolves, and what
 * `produce` reads its verdicts under). A compact model keeps its stem id.
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { JSDOM } from 'jsdom'

import { writeConsole } from '../scripts/export-console.mjs'
import { nnConsole, bootConsole } from './helpers/console-boot.mjs'

const BLUEPRINT = path.resolve('iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md')

const PARENT = `parent_spec:
  name: "coNNtent_V_0-18-0"
  url: "https://example.invalid/coNNtent/spec_NN.md"`

function domain() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nn-console-ids-'))
  fs.writeFileSync(path.join(root, 'domaiNN_NN.md'), '---\nname: "Probe"\nworkspace_id: "probe"\n---\n\n# NN DomaiNN\n')
  // The workspace package tier, so the storage declarations resolve offline.
  const pkg = path.join(root, 'specs', 'bluepriNNts', 'coNNtent')
  fs.mkdirSync(path.join(pkg, 'V_0-18-0'), { recursive: true })
  fs.copyFileSync(BLUEPRINT, path.join(pkg, 'spec_NN.md'))
  fs.copyFileSync(BLUEPRINT, path.join(pkg, 'V_0-18-0', 'spec_NN.md'))
  const series = path.join(root, 'series', 'ingenieria-oculta')
  const episode = path.join(series, 'episodes', 'e01-alcantarillas')
  fs.mkdirSync(episode, { recursive: true })
  fs.writeFileSync(
    path.join(series, 'ingenieria-oculta_coNNtent_NN.md'),
    `---\nlevel: 3\nscope: true\n${PARENT}\ntitle: "Ingenieria oculta"\n---\n\n# NN Series\n\n## NN Series: Ingenieria oculta\nslug:: ingenieria-oculta\n`,
  )
  fs.writeFileSync(
    path.join(episode, 'e01-alcantarillas_coNNtent_NN.md'),
    `---\nlevel: 3\n${PARENT}\nknowledge_version: "V_0-1-0"\ntitle: "E01"\n---\n\n# NN Video\n\n## NN Video: E01\nslug:: e01-alcantarillas\nstatus:: draft\n\n# NN Scene\n\n## NN Scene: Gancho\nslug:: 00-gancho\nkind:: Libre\n\nUna frase.\n`,
  )
  return root
}

async function exportedModel(root) {
  await writeConsole({ rootDir: root, scope: 'domain', open: false })
  const html = fs.readFileSync(path.join(root, 'domaiNN_console.html'), 'utf8')
  const dom = new JSDOM(html)
  return JSON.parse(dom.window.document.getElementById('nn-model').textContent)
}

test('a distributed episode is addressed by its hierarchical id, not its filename stem', async () => {
  const root = domain()
  try {
    const model = await exportedModel(root)
    const scene = model.elements.find((el) => el.slug === '00-gancho')
    assert.ok(scene, 'the scene is exported')
    assert.equal(scene.modelId, 'ingenieria-oculta/e01-alcantarillas')
    assert.equal(scene.id, 'ingenieria-oculta/e01-alcantarillas@' + scene.id.split('@').pop())
    const series = model.elements.find((el) => el.concept === 'Series')
    assert.equal(series.modelId, 'ingenieria-oculta', 'a distributed series is its slug id')
    for (const el of model.elements) {
      assert.doesNotMatch(String(el.modelId), /_coNNtent$/, `${el.id} must not carry a filename stem`)
    }

    // A verdict drafted on that scene exports a target `produce` and apply_change accept.
    const booted = bootConsole({ model, schema: { concepts: [{ name: 'Scene' }, { name: 'Video' }, { name: 'Series' }] } })
    booted.res.state.store.addDraft({
      kind: 'verdict',
      knowledge_id: scene.modelId,
      element_slug: scene.slug,
      gate: 'script',
      verdict: 'approved',
      reviewed_hash: 'a'.repeat(64),
    })
    const res = nnConsole.composeChangesetExport(
      {
        modelTitle: 'Probe',
        modelId: 'probe',
        meta: { changesBlueprintVersion: 'V_0-8-1' },
        store: booted.res.state.store,
      },
      'Ana',
    )
    assert.equal(res.ok, true, res.errors && res.errors.join('; '))
    assert.match(res.text, /^target:: ingenieria-oculta\/e01-alcantarillas@00-gancho$/m)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('a compact model keeps its stem id', async () => {
  const root = domain()
  try {
    fs.writeFileSync(
      path.join(root, 'notes_NN.md'),
      '---\nlevel: 3\nparent_spec:\n  name: "blank_V_0-1-0"\n  url: "https://example.invalid/blank/spec_NN.md"\ntitle: "Notes"\n---\n\n# NN Note\n\n## NN Note: First\nslug:: first\n',
    )
    const model = await exportedModel(root)
    const note = model.elements.find((el) => el.slug === 'first')
    assert.ok(note, 'the compact model is exported')
    assert.equal(note.modelId, 'notes')
    assert.equal(note.id, 'notes@' + note.id.split('@').pop())
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('the coNNtent view addresses scenes with the same ids the payload carries', async () => {
  const root = domain()
  try {
    const model = await exportedModel(root)
    const payloadIds = new Set(model.elements.map((el) => el.id))
    const { collect } = await import('../iNNfo/specs/bluepriNNts/coNNtent/assets/console-view-conntent.data.mjs')
    const data = await collect({ rootDir: root })
    const episodes = (data.tree?.series || []).flatMap((s) => s.episodes || [])
    assert.equal(episodes.length, 1, 'the view lists the episode')
    const [episode] = episodes
    assert.equal(episode.knowledgeId, 'ingenieria-oculta/e01-alcantarillas')
    for (const scene of episode.scenes || []) {
      assert.ok(payloadIds.has(scene.elementId), `view scene ${scene.elementId} must be a payload element id`)
    }
    assert.ok((episode.scenes || []).length > 0, 'the view lists scenes')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
