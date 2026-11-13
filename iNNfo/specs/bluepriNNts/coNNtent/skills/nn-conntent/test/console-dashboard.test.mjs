import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const source = readFileSync(new URL('../../../assets/console-view-conntent.js', import.meta.url), 'utf8')

function fixture() {
  const dom = new JSDOM('<div id="view"></div>', { runScripts: 'outside-only' })
  const { window } = dom
  window.HTMLMediaElement.prototype.pause = function () {}
  const views = []
  window.registerView = (view) => views.push(view)
  window.eval(source)
  const drafts = []
  const listeners = new Set()
  const episode = (slug) => ({
    slug, title: 'Episode ' + slug, status: 'draft', knowledgeId: slug,
    reviewGates: ['script'], gates: [{ gate: 'script', scene: 'shared', state: 'open' }],
    scenes: [{ slug: 'shared', name: 'Shared scene', elementId: slug + '@shared',
      narration: 'Narration for ' + slug, scriptHash: 'hash-' + slug,
      still: slug + '/still.png', video: slug + '/scene.mp4', audio: slug + '/voice.mp3',
      gates: [{ gate: 'script', state: 'open' }], layers: [], sources: [], fields: {} }],
    deliveries: [],
  })
  const episodes = [episode('one'), episode('two')]
  const container = window.document.getElementById('view')
  const mounted = views[0].mount({ container, payload: { model: { meta: {} } },
    viewData: { tree: { series: [{ slug: 'series', title: 'Test series', episodes }] },
      pending: episodes.map(e => ({ series: 'series', episode: e.slug, gate: 'script', scene: 'shared', state: 'open' })) },
    store: { drafts: () => drafts,
      propose: (draft) => { drafts.push(draft); listeners.forEach(fn => fn()) },
      onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn) } },
  })
  return { dom, container, drafts, listeners, mounted }
}

function click(container, label) {
  const button = [...container.querySelectorAll('button')].find(b => b.textContent === label)
  assert.ok(button, 'Missing button: ' + label)
  button.click()
}

test('dashboard selects an episode, filters the list and exposes scene media', () => {
  const { container, dom } = fixture()
  assert.match(container.textContent, /Your production at a glance/)
  assert.equal(container.querySelector('[data-nn-section="episode"]').hidden, true)
  click(container, 'Episodes')
  const search = container.querySelector('input[aria-label="Search episodes or series"]')
  search.value = 'two'
  search.dispatchEvent(new dom.window.Event('input'))
  const list = search.closest('section')
  assert.equal(list.querySelectorAll('.nn-pipeline-row').length, 1)
  click(list, 'Open episode')
  click(container, 'Script & review')
  const cards = container.querySelectorAll('[data-nn-episode-config]')
  assert.equal(cards[0].hidden, true)
  assert.equal(cards[1].hidden, false)
  const video = cards[1].querySelector('.nn-pipeline-player')
  assert.equal(video.getAttribute('src'), 'two/scene.mp4')
  assert.equal(video.controls, true)
  assert.equal(video.getAttribute('poster'), 'two/still.png')
  assert.equal(cards[1].querySelector('audio').getAttribute('src'), 'two/voice.mp3')
  assert.equal(cards[1].querySelector('[data-nn-subsection="config"]').hidden, true)
  container.querySelector('button[aria-pressed="false"]').parentNode.querySelectorAll('button')[2].click()
  assert.equal(cards[1].querySelector('[data-nn-subsection="script"]').hidden, true)
  assert.equal(cards[1].querySelector('[data-nn-subsection="config"]').hidden, false)
  dom.window.close()
})

test('a review proposal updates only its episode and appears in shared Changes', () => {
  const { container, drafts, listeners, mounted, dom } = fixture()
  click(container, 'Episodes')
  const rows = container.querySelectorAll('.nn-pipeline-workspace > section .nn-pipeline-row')
  const target = [...rows].find(row => row.textContent.includes('Episode two') && row.querySelector('button').textContent === 'Open episode')
  click(target, 'Open episode')
  click(container, 'Script & review')
  const cards = container.querySelectorAll('[data-nn-episode-config]')
  click(cards[1], 'Approve')
  assert.equal(drafts[0].elementId, 'two@shared')
  assert.equal(drafts[0].reviewed_hash, 'hash-two')
  assert.equal(cards[1].querySelector('[data-nn-verdict-pill]').textContent, 'Approval proposed')
  assert.equal(cards[0].querySelector('[data-nn-verdict-pill]').textContent, 'open')
  click(container, 'Changes (1)')
  assert.match(container.textContent, /Proposed · not applied/)
  mounted.unmount()
  assert.equal(listeners.size, 0)
  dom.window.close()
})

test('lightbox plays the scene video even when a still exists', () => {
  const { container, dom } = fixture()
  container.querySelector('[data-nn-media-open]').click()
  const lightbox = dom.window.document.querySelector('.nn-lightbox')
  assert.equal(lightbox.querySelector('video').getAttribute('src'), 'one/scene.mp4')
  assert.equal(lightbox.querySelector('video').getAttribute('poster'), 'one/still.png')
  lightbox.querySelector('button').click()
  assert.equal(dom.window.document.querySelector('.nn-lightbox'), null)
  dom.window.close()
})
