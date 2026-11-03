/**
 * coNNtent/assets/console-view-episode-review.data.mjs
 *
 * Export-time data for the Episode review view (design A12/A13).
 *
 * Two jobs:
 *  1. Read the Episode documents with the real parser, so nested `### NN Variant:` and
 *     `### NN Layer:` elements keep their `parentSlug`. The console payload flattens
 *     elements and loses that link, and without it a review UI cannot show "the variants
 *     of this scene".
 *  2. Read the JSONL facts (`<domaiNN>/.cognnitive/video/*.jsonl`) for cost and timings.
 *
 * Nothing here runs in the browser: the console stays static and offline.
 */
import { readFile, readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { parseKnowledgeDocument } from '../skills/nn-conntent/scripts/lib/knowledge-model.mjs'
import { isPriceStale } from '../skills/nn-conntent/scripts/lib/catalog.mjs'

const FACTS_DIR = ['.cognnitive', 'video']
const EPISODE_DIRS = ['episodes', 'assets']

/** JSONL files in the facts folder whose name starts with `prefix`. */
async function factFiles(dir, prefix) {
  let entries
  try {
    entries = await readdir(dir)
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return []
    throw err
  }
  return entries
    .filter((name) => name.startsWith(prefix) && name.endsWith('.jsonl'))
    .sort()
    .map((name) => join(dir, name))
}

async function readRows(file) {
  let text
  try {
    text = await readFile(file, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT') return []
    throw err
  }
  const rows = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const row = JSON.parse(trimmed)
      if (row && typeof row === 'object') rows.push(row)
    } catch {
      // A torn last line from an interrupted append is not a fact.
    }
  }
  return rows
}

async function readAll(dir, prefix) {
  const rows = []
  for (const file of await factFiles(dir, prefix)) rows.push(...(await readRows(file)))
  return rows
}

/** Episode documents under `series/<s>/episodes/<slug>/`. */
async function episodeDocs(rootDir) {
  const seriesRoot = join(String(rootDir || '.'), 'series')
  let series
  try {
    series = await readdir(seriesRoot, { withFileTypes: true })
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return []
    throw err
  }
  const docs = []
  for (const entry of series) {
    if (!entry.isDirectory()) continue
    for (const sub of EPISODE_DIRS) {
      const dir = join(seriesRoot, entry.name, sub)
      let episodes
      try {
        episodes = await readdir(dir, { withFileTypes: true })
      } catch {
        continue
      }
      for (const episode of episodes) {
        if (!episode.isDirectory()) continue
        const files = await readdir(join(dir, episode.name)).catch(() => [])
        const doc = files.find((f) => f.endsWith('_NN.md') && /_coNNtent_/.test(f))
        if (!doc) continue
        docs.push({
          file: join(dir, episode.name, doc),
          slug: episode.name,
          series: entry.name,
          dir: join(dir, episode.name),
        })
      }
    }
  }
  return docs
}

/** One document → the shape the review cards need, nesting preserved. */
function sceneOf(scene, variants, layers) {
  const sceneSlug = String(scene.slug || scene.fields?.slug || '')
  const fields = scene.fields || {}
  return {
    slug: sceneSlug,
    name: String(scene.name || sceneSlug),
    kind: String(fields.kind || ''),
    narration: String(scene.description || '').trim(),
    review: String(fields.review || ''),
    fields: {
      transition: fields.transition ?? null,
      background_audio: fields.background_audio ?? null,
      background_audio_volume: fields.background_audio_volume ?? null,
      voice_speed: fields.voice_speed ?? null,
      presets: fields.presets ?? null,
    },
    // Nested elements declare their parent; that link is the whole point of parsing here.
    variants: variants
      .filter((v) => v.parentSlug === sceneSlug)
      .map((v) => ({
        slug: String(v.slug || ''),
        target: String(v.fields?.for || ''),
        value: String(v.description || '').trim(),
      })),
    layers: layers
      .filter((l) => l.parentSlug === sceneSlug)
      .map((l) => ({
        slug: String(l.slug || ''),
        type: String(l.fields?.type || ''),
        asset: String(l.fields?.asset || ''),
        text: String(l.fields?.text || ''),
      })),
  }
}

async function loadEpisode(doc) {
  const content = await readFile(doc.file, 'utf8')
  const model = parseKnowledgeDocument(content)
  const video = (model.elements.Video || [])[0] || {}
  const variants = model.elements.Variant || []
  const layers = model.elements.Layer || []
  return {
    slug: doc.slug,
    series: doc.series,
    title: String(video.fields?.title || video.name || doc.slug),
    status: String(video.fields?.status || ''),
    budget: video.fields?.budget ?? null,
    presets: video.fields?.presets ?? null,
    components: video.fields?.components ?? null,
    scenes: (model.elements.Scene || []).map((s) => sceneOf(s, variants, layers)),
  }
}

export async function collect({ rootDir } = {}) {
  const root = String(rootDir || '.')
  const factsDir = join(root, ...FACTS_DIR)
  const [ledger, timings, docs] = await Promise.all([
    readAll(factsDir, 'ledger'),
    readAll(factsDir, 'timings'),
    episodeDocs(root),
  ])

  const episodes = {}
  for (const doc of docs) {
    const episode = await loadEpisode(doc)
    const facts = (episodes[episode.slug] = episode)
    facts.realUsd = 0
    facts.staleRows = []
    facts.timings = []
  }

  for (const row of ledger) {
    const entry = episodes[String(row.episode || '')]
    if (!entry) continue
    const usd = Number(row.estUsd)
    if (Number.isFinite(usd) && usd > 0) entry.realUsd = Math.round((entry.realUsd + usd) * 1e6) / 1e6
    const priceDate = row.price_date ? String(row.price_date) : ''
    if (priceDate && isPriceStale(priceDate)) {
      entry.staleRows.push({ priceDate, model: String(row.model || ''), usd: Number(usd) || 0 })
    }
  }
  for (const row of timings) {
    const entry = episodes[String(row.episode || '')]
    if (!entry) continue
    entry.timings.push({
      stage: String(row.stage || ''),
      durationMs: Number(row.duration_ms) || 0,
      fingerprint: String((row.machine && row.machine.fp) || ''),
    })
  }

  return { episodes }
}
