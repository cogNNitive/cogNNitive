// Test access to the console's embedded slots. The nn-model slot is compressed
// (deflate-raw + base64), so tests encode and decode it with the exporter's own codec
// instead of reading it as JSON; nn-drafts stays plain JSON.
import {
  CONSOLE_MODEL_SLOT_TYPE,
  decodeConsoleModelText,
  encodeConsoleModel,
} from '../../scripts/export-console.mjs'

import { withDecodedModel } from '../../scripts/lib/console-fixture-freshness.js'

export { CONSOLE_MODEL_SLOT_TYPE, decodeConsoleModelText, encodeConsoleModel, withDecodedModel }

/**
 * The page with its model JSON rewritten by `edit(jsonText)` and compressed again, the
 * way a hand-edited or older console would carry it.
 */
export function rewriteModelText(html, edit) {
  const text = slotTextOf(html, 'nn-model')
  if (text === null) throw new Error('no nn-model slot in the page')
  const json = edit(decodeConsoleModelText(text))
  return html.replace(/<script type="[^"]*" id="nn-model">[\s\S]*?<\/script>/, () => modelSlotMarkup(JSON.parse(json)))
}

/** The `<script>` element markup for an nn-model slot holding `model`. */
export function modelSlotMarkup(model) {
  return `<script type="${CONSOLE_MODEL_SLOT_TYPE}" id="nn-model">${encodeConsoleModel(model)}</script>`
}

/** The raw text of the slot `id` in `html`, whatever its script type, or null. */
export function slotTextOf(html, id) {
  const match = new RegExp(`<script type="[^"]*" id="${id}">([\\s\\S]*?)</script>`).exec(html)
  return match ? match[1] : null
}

/** The decoded model an exported page carries (throws when the slot is missing). */
export function modelOf(html) {
  const text = slotTextOf(html, 'nn-model')
  if (text === null) throw new Error('no nn-model slot in the page')
  return JSON.parse(decodeConsoleModelText(text) || '{}')
}

/** The decoded payload JSON text of a document's nn-model slot ('' when empty). */
export function decodedModelTextOf(document) {
  const el = document.getElementById('nn-model')
  return el ? decodeConsoleModelText(el.textContent) : ''
}

/** The plain JSON nn-drafts slot of a page. */
export function draftsOf(html) {
  const text = slotTextOf(html, 'nn-drafts')
  if (text === null) throw new Error('no nn-drafts slot in the page')
  return JSON.parse(text)
}

/**
 * jsdom has no Compression Streams and no Response, which a browser page uses to decode
 * nn-model; a page under test borrows Node's. Call it from `beforeParse`.
 */
export function lendCompressionStreams(window) {
  window.Response = Response
  window.DecompressionStream = DecompressionStream
  window.CompressionStream = CompressionStream
}

/** Waits until an exported page, loaded with its scripts, finished its asynchronous self-boot. */
export async function pageBooted(dom) {
  if (dom.window.document.readyState !== 'complete') {
    await new Promise((ok) => dom.window.addEventListener('load', ok))
  }
  const res = await dom.window.nnConsole.whenBooted()
  if (res && res.ok === false) throw res.error || new Error('the page did not boot')
  return res
}
