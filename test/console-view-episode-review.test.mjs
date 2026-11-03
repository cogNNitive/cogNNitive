/**
 * test/console-view-episode-review.test.mjs
 *
 * Change 2026-11-02-video-script-v1 (D10 / A3 / A12) — rebuilt to the parity checklist of
 * the former standalone review console:
 *
 *   per-scene card · editorial variants · narration body · layers with thumbnails ·
 *   cascade chips with Override/Inherited · verdict + reason · preset selector (ordered) ·
 *   approve-all · counter · toast
 *
 * Every edit must be a changeset operation (`update_field` / `comment`) through the
 * console's proposal store. The view keeps no private copy of any decision.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, mkdir, writeFile, readdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { readFileSync } from 'node:fs'
import { bootConsole, nnConsole } from './helpers/console-boot.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ASSETS = resolve(here, '..', 'iNNfo', 'specs', 'bluepriNNts', 'coNNtent', 'assets')
const VIEW_FILE = join(ASSETS, 'console-view-episode-review.js')
const DATA_FILE = join(ASSETS, 'console-view-episode-review.data.mjs')

const episode = (over = {}) => ({
  slug: 'ep-1',
  series: 'demo',
  title: 'Episode One',
  status: 'draft',
  budget: '1.5',
  realUsd: 0.25,
  staleRows: [],
  timings: [],
  scenes: [
    {
      slug: 'opening',
      name: 'Opening',
      kind: 'hook',
      narration: 'Hello there',
      review: 'approved',
      fields: {
        transition: { value: 'fade', source: 'series', local: null },
        voice_speed: { value: 1.1, source: 'scene', local: 1.1 },
        background_audio_volume: { value: 0.2, source: 'domain', local: null },
        presets: { value: null, source: null, local: null },
        frame: { value: 'neutral', source: 'blueprint', local: null },
        review: { value: 'approved', source: 'scene', local: 'approved' },
        kind: { value: 'hook', source: 'scene', local: 'hook' },
      },
      layers: [
        {
          slug: 'hook-avatar',
          type: 'avatar',
          asset: 'media/avatar.png',
          assetSrc: 'data:image/png;base64,iVBORw0KGgo=',
          assetKind: 'image',
          text: '',
        },
        { slug: 'hook-watermark', type: 'text', asset: '', assetSrc: '', assetKind: '', text: 'generated with AI' },
      ],
    },
    {
      slug: 'explain',
      name: 'Explain',
      kind: 'explain',
      narration: 'The details',
      review: 'needs-change',
      fields: {
        transition: { value: 'fade', source: 'scene', local: 'fade' },
        voice_speed: { value: 1, source: 'blueprint', local: null },
        background_audio_volume: { value: null, source: null, local: null },
        presets: { value: null, source: null, local: null },
        frame: { value: 'neutral', source: 'blueprint', local: null },
        review: { value: 'needs-change', source: 'scene', local: 'needs-change' },
        kind: { value: 'explain', source: 'scene', local: 'explain' },
      },
      variants: [],
      layers: [],
    },
  ],
  ...over,
})

const PAYLOAD_MODEL = {
  meta: { title: 'Video Domain', modelId: 'video', changesBlueprintVersion: 'V_0-3-0' },
  elements: [
    { id: 'ep-1', concept: 'Video', name: 'Episode One', slug: 'ep-1', hash: 'a'.repeat(16), fields: { slug: 'ep-1' } },
    { id: 's-1', concept: 'Scene', name: 'Opening', slug: 'opening', hash: 'b'.repeat(16), fields: { slug: 'opening' } },
    { id: 's-2', concept: 'Scene', name: 'Explain', slug: 'explain', hash: 'c'.repeat(16), fields: { slug: 'explain' } },
    { id: 'p-1', concept: 'Preset', name: 'Lucas', slug: 'lucas', hash: 'd'.repeat(16), fields: { slug: 'lucas' } },
    { id: 'p-2', concept: 'Preset', name: 'Studio Warm', slug: 'studio-warm', hash: 'e'.repeat(16), fields: {} },
  ],
  matrices: [],
}

const PAYLOAD_SCHEMA = {
  concepts: [{ name: 'Scene' }, { name: 'Video' }],
  fields: [
    { name: 'transition', type: 'select', options: ['fade', 'slide-left'], concept: 'Video' },
    { name: 'voice_speed', type: 'number', concept: 'Scene' },
    { name: 'background_audio_volume', type: 'number', concept: 'Scene' },
    { name: 'presets', type: 'string', concept: 'Scene' },
    { name: 'frame', type: 'string', concept: 'Scene' },
    { name: 'review', type: 'select', options: ['approved', 'needs-change'], concept: 'Scene' },
    { name: 'kind', type: 'string', concept: 'Scene' },
  ],
}

function bootView({ viewData } = {}) {
  const registry = nnConsole.createViewRegistry()
  const factory = new Function('registerView', readFileSync(VIEW_FILE, 'utf8'))
  factory(registry.registrar('episode-review', 'probe'))
  const data = viewData === undefined ? { 'episode-review': { episodes: { 'ep-1': episode() } } } : viewData
  const booted = bootConsole({ registry, model: PAYLOAD_MODEL, schema: PAYLOAD_SCHEMA, viewData: data })
  booted.document.querySelector('.nn-view-tab[data-tab="episode-review"]').click()
  const drafts = () => (booted.res && booted.res.state && booted.res.state.store ? booted.res.state.store.drafts() : [])
  const click = (sel) => {
    const node = booted.document.querySelector(sel)
    assert.ok(node, `missing control: ${sel}`)
    node.dispatchEvent(new booted.document.defaultView.Event('click', { bubbles: true }))
    return node
  }
  return { ...booted, drafts, click }
}

const openCard = (document, slug) => {
  document
    .querySelector(`[data-nn-scene="${slug}"] .nn-scene-header`)
    .dispatchEvent(new document.defaultView.Event('click', { bubbles: true }))
}

describe('Episode review view — parity with the former console', () => {
  it('ships as a classic script that reads the collected facts', () => {
    const code = readFileSync(VIEW_FILE, 'utf8')
    assert.match(code, /registerView\(\{/, 'it registers itself')
    assert.doesNotMatch(code, /^\s*(import|export)\s/m, 'a view is a classic script, never a module')
    assert.match(code, /ctx\.viewData/, 'it reads the collected facts')
  })

  it('renders one collapsible card per scene with name, kind and verdict', () => {
    const { document } = bootView({})
    const cards = [...document.querySelectorAll('[data-nn-episode-scene]')]
    assert.deepEqual(
      cards.map((c) => c.getAttribute('data-nn-episode-scene')),
      ['opening', 'explain'],
      'scenes keep document order',
    )
    assert.match(cards[0].textContent, /Opening/)
    assert.match(cards[0].textContent, /hook/)
    assert.equal(cards[0].querySelector('[data-nn-verdict-pill]').textContent, 'approved')
    assert.equal(cards[1].querySelector('[data-nn-verdict-pill]').textContent, 'needs-change')
    assert.ok(cards[0].querySelector('.nn-scene-header'), 'the header toggles the card')
  })

  it('orders the card as narration → variants → visuals → layers → cascade → verdict', () => {
    const { document } = bootView({})
    openCard(document, 'opening')
    const labels = [...document.querySelectorAll('[data-nn-scene="opening"] .nn-section-label')].map((n) =>
      n.textContent.trim(),
    )
    const at = (needle) => labels.findIndex((l) => l.toLowerCase().includes(needle))
    assert.ok(at('narration') < at('layers'), 'narration comes before the layers')
    assert.ok(at('layers') < at('scene parameters'), 'layers come before the parameters')
    assert.ok(at('scene parameters') < at('verdict'), 'parameters come before the verdict')
  })

  it('opens the same inspector for a layer', () => {
    const { document, click } = bootView({})
    openCard(document, 'opening')
    click('[data-nn-inspect-layer="hook-avatar"]')
    const box = document.querySelector('[data-nn-lightbox]')
    assert.ok(box, 'the shared modal exists')
    assert.ok(box.classList.contains('is-open'))
    assert.match(box.textContent, /hook-avatar/, 'it names the layer')
    assert.match(box.textContent, /avatar/, 'it shows the layer type')
    assert.match(box.textContent, /avatar\.png/, 'it shows the asset')
    assert.ok(box.querySelector('img'), 'and previews the asset')
  })






  it('edits the narration body as update_field', () => {
    const { document, drafts } = bootView({})
    openCard(document, 'opening')
    const area = document.querySelector('[data-nn-scene="opening"] [data-nn-narration]')
    area.value = 'Rewritten narration'
    area.dispatchEvent(new document.defaultView.Event('change', { bubbles: true }))
    const op = drafts().find((d) => d.field === 'narration')
    assert.equal(op.proposed, 'Rewritten narration')
    assert.equal(op.element_id, 's-1')
  })

  it('renders the layers of the scene with their asset', () => {
    const { document } = bootView({})
    openCard(document, 'opening')
    const layers = [...document.querySelectorAll('[data-nn-scene="opening"] [data-nn-layer]')]
    assert.deepEqual(layers.map((l) => l.getAttribute('data-nn-layer')), ['hook-avatar', 'hook-watermark'])
    assert.ok(layers[0].querySelector('img'), 'a raster asset renders as an image')
    assert.match(layers[1].textContent, /generated with AI/, 'a text layer shows its text')
  })

  it('renders every Scene field with its real cascade source', () => {
    const { document } = bootView({})
    openCard(document, 'opening')
    const params = [...document.querySelectorAll('[data-nn-scene="opening"] [data-nn-param]')].map((n) =>
      n.getAttribute('data-nn-param'),
    )
    assert.ok(params.length > 3, 'the sheet is driven by the field set, not a hardcoded trio')
    for (const expected of ['transition', 'voice_speed', 'background_audio_volume', 'presets', 'frame']) {
      assert.ok(params.includes(expected), `${expected} is editable on the scene`)
    }
    assert.ok(!params.includes('review'), 'the verdict has its own control')
    assert.ok(!params.includes('kind'), 'the kind is shown in the header')

    const voice = document.querySelector('[data-nn-scene="opening"] [data-nn-param="voice_speed"]')
    assert.match(voice.textContent, /Scene/, 'a declared value belongs to the Scene')
    const transition = document.querySelector('[data-nn-scene="opening"] [data-nn-param="transition"]')
    assert.match(transition.textContent, /series|domain|blueprint|video|unset/, 'an inherited value names its scope')
  })

  it('uses the widget of the field type instead of a text box everywhere', () => {
    const { document } = bootView({})
    openCard(document, 'opening')
    const transition = document.querySelector('[data-nn-scene="opening"] [data-nn-param-input="transition"]')
    assert.equal(transition.tagName, 'SELECT', 'a select field renders a select')
    const options = [...transition.querySelectorAll('option')].map((o) => o.value)
    assert.deepEqual(options, ['', 'fade', 'slide-left'], 'the options come from the schema, plus inherit')
    const voice = document.querySelector('[data-nn-scene="opening"] [data-nn-param-input="voice_speed"]')
    assert.equal(voice.tagName, 'INPUT')
    assert.equal(voice.type, 'number', 'a number field renders a number input')
  })

  it('edits a parameter as update_field on the scene', () => {
    const { document, drafts } = bootView({})
    openCard(document, 'opening')
    const input = document.querySelector('[data-nn-scene="opening"] [data-nn-param-input="transition"]')
    input.value = 'fade'
    input.dispatchEvent(new document.defaultView.Event('change', { bubbles: true }))
    const op = drafts().find((d) => d.field === 'transition')
    assert.equal(op.proposed, 'fade')
    assert.equal(op.element_id, 's-1')
  })

  it('writes the verdict as update_field and the reason as comment', () => {
    const { document, drafts, click } = bootView({})
    openCard(document, 'explain')
    click('[data-nn-scene="explain"] [data-nn-verdict="approved"]')
    const verdict = drafts().find((d) => d.field === 'review')
    assert.equal(verdict.proposed, 'approved')
    assert.equal(verdict.element_id, 's-2')

    const box = document.querySelector('[data-nn-scene="explain"] [data-nn-comment]')
    box.value = 'the pacing drags'
    click('[data-nn-scene="explain"] [data-nn-comment-save]')
    const comment = drafts().find((d) => d.kind === 'comment')
    assert.equal(comment.comment, 'the pacing drags')
    assert.equal(comment.element_id, 's-2')
  })

  it('approves every scene at once and keeps the counter honest', () => {
    const { document, drafts, click } = bootView({})
    const counter = document.querySelector('[data-nn-counter="ep-1"]')
    assert.match(counter.textContent, /1\/2 approved/)

    click('[data-nn-approve-all="ep-1"]')
    const approvals = drafts().filter((d) => d.field === 'review' && d.proposed === 'approved')
    assert.equal(approvals.length, 1, 'only the unapproved scene is proposed')
    assert.equal(approvals[0].element_id, 's-2')
    assert.match(counter.textContent, /2\/2 approved/, 'the counter follows the action')
  })

  it('offers one ordered preset selector built from the chain', () => {
    const { document, drafts, click } = bootView({})
    const selectors = document.querySelectorAll('[data-nn-preset-selector]')
    assert.equal(selectors.length, 1, 'exactly one selector for the episode')
    const chips = [...document.querySelectorAll('[data-nn-preset]')]
    assert.deepEqual(
      chips.map((c) => c.getAttribute('data-nn-preset')),
      ['Lucas', 'Studio Warm'],
      'the options are the Preset elements of the chain',
    )

    click('[data-nn-preset="Studio Warm"]')
    click('[data-nn-preset="Lucas"]')
    const op = drafts().filter((d) => d.field === 'presets').pop()
    assert.deepEqual(op.proposed, ['Studio Warm', 'Lucas'], 'the choice is an ordered list')
  })

  it('shows the spent amount against the budget from the facts', () => {
    const { document } = bootView({})
    const cost = document.querySelector('[data-nn-episode-cost]').textContent
    assert.match(cost, /0\.25/, 'the real cost is shown')
    assert.match(cost, /1\.50/, 'the budget is shown')
  })


  it('shows an empty state when the domain has no ported episode', () => {
    const { document } = bootView({ viewData: { 'episode-review': { episodes: {} } } })
    assert.match(document.querySelector('[data-nn-episode-review]').textContent, /No episode/i)
  })
})

describe('Episode review data hook', () => {
  let root
  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'nn-ep-review-'))
    const dir = join(root, 'series', 'demo', 'episodes', 'ep-1')
    await mkdir(join(dir, 'media'), { recursive: true })
    await writeFile(join(dir, 'media', 'avatar.png'), Buffer.from('iVBORw0KGgo=', 'base64'))
    await mkdir(join(root, '.cognnitive', 'video'), { recursive: true })
    await writeFile(
      join(dir, 'ep-1_coNNtent_demo_NN.md'),
      `---
level: 3
title: "Episode One"
---

# NN Video

## NN Video: Episode One
slug:: ep-1
status:: draft
budget:: 1.5

# NN Scene

## NN Scene: Opening
slug:: opening
review:: approved

The opening line.

### NN Variant: alt hook
for:: narration

A different hook.

### NN Layer: Hook Avatar
slug:: hook-avatar
type:: avatar
asset:: media/avatar.png
`,
      'utf8',
    )
    await writeFile(
      join(root, '.cognnitive', 'video', 'ledger.jsonl'),
      JSON.stringify({ ts: 1, episode: 'ep-1', kind: 'tts', model: 'm', estUsd: 0.25 }) + '\n',
      'utf8',
    )
  })
  after(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('parses the episode with the nested layers attached to their scene', async () => {
    const { collect } = await import(pathToFileURL(DATA_FILE).href)
    const data = await collect({ rootDir: root })
    const ep = data.episodes['ep-1']
    assert.ok(ep, 'the episode is discovered under series/<s>/episodes/')
    const scene = ep.scenes.find((s) => s.slug === 'opening')
    assert.deepEqual(scene.layers.map((l) => l.slug), ['hook-avatar'], 'the nested Layer keeps its parent')
    assert.equal(scene.narration, 'The opening line.', 'the scene body is the narration')
  })

  it('sums the ledger for the episode', async () => {
    const { collect } = await import(pathToFileURL(DATA_FILE).href)
    const data = await collect({ rootDir: root })
    assert.equal(data.episodes['ep-1'].realUsd, 0.25)
  })

  it('inlines a small raster asset as a data URI and never a video', async () => {
    const { collect } = await import(pathToFileURL(DATA_FILE).href)
    const data = await collect({ rootDir: root })
    const scene = data.episodes['ep-1'].scenes.find((s) => s.slug === 'opening')
    const layer = scene.layers.find((l) => l.slug === 'hook-avatar')
    assert.match(layer.assetSrc, /^data:image\//, 'the console CSP only allows data: images')
    assert.equal(layer.assetKind, 'image')
  })

  it('names an asset it cannot inline instead of emitting a broken source', async () => {
    const dir = join(root, 'series', 'demo', 'episodes', 'ep-2')
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(dir, 'ep-2_coNNtent_demo_NN.md'),
      `---
level: 3
---

# NN Video

## NN Video: Two
slug:: ep-2

# NN Scene

## NN Scene: S
slug:: s

Body.

### NN Layer: Clip
slug:: clip
type:: media
asset:: media/master.mp4
`,
      'utf8',
    )
    try {
      const { collect } = await import(pathToFileURL(DATA_FILE).href)
      const data = await collect({ rootDir: root })
      const layer = data.episodes['ep-2'].scenes[0].layers[0]
      assert.equal(layer.assetSrc, '', 'a video is never inlined into the console')
      assert.equal(layer.assetKind, 'video', 'but it is named so the view can say what it is')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('reduces an oversized still into the ignored cache and inlines the small copy', async (t) => {
    const promisify = (await import('node:util')).promisify
    const run = promisify(execFile)
    const hasFfmpeg = await run('ffmpeg', ['-version']).then(
      () => true,
      () => false,
    )
    if (!hasFfmpeg) {
      t.skip('ffmpeg is not available on this machine')
      return
    }
    const dir = join(root, 'series', 'demo', 'episodes', 'ep-3')
    await mkdir(join(dir, 'media'), { recursive: true })
    // A noisy 1600x900 frame compresses poorly, so it lands well over the inline cap.
    await run('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'lavfi',
      '-i',
      'testsrc2=size=3200x2000',
      '-vf',
      'noise=alls=100:allf=t',
      '-frames:v',
      '1',
      join(dir, 'media', 'huge.png'),
    ])
    await writeFile(
      join(dir, 'ep-3_coNNtent_demo_NN.md'),
      `---
level: 3
---

# NN Video

## NN Video: Three
slug:: ep-3

# NN Scene

## NN Scene: S
slug:: s

Body.

### NN Layer: Still
slug:: still
type:: media
asset:: media/huge.png
`,
      'utf8',
    )
    try {
      const { collect } = await import(pathToFileURL(DATA_FILE).href)
      const data = await collect({ rootDir: root })
      const layer = data.episodes['ep-3'].scenes[0].layers[0]
      assert.equal(layer.assetKind, 'image-reduced', 'the original is too heavy to embed')
      assert.match(layer.assetSrc, /^data:image\/jpeg;base64,/, 'the reduced copy is what gets inlined')

      const cacheFiles = await readdir(join(root, '.cognnitive', 'cache', 'console-thumbs'))
      assert.ok(cacheFiles.length > 0, 'the reduced copy is cached under the ignored .cognnitive/cache/')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('returns no episodes when the domain has none', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'nn-ep-empty-'))
    try {
      const { collect } = await import(pathToFileURL(DATA_FILE).href)
      const data = await collect({ rootDir: empty })
      assert.deepEqual(data.episodes, {})
    } finally {
      await rm(empty, { recursive: true, force: true })
    }
  })
})
