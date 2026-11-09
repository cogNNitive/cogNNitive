/**
 * coNNtent/assets/console-view-conntent.data.mjs
 *
 * Export-time facts for the unified `conntent` view (capability conntent-domain-console;
 * design D-C3; tasks 4b.1/4b.2). It calls the engine modules — layout, cascade, gates,
 * review-hash, library — and never re-implements them, so the console shows the same
 * effective value, source level and hash the engine uses.
 *
 * The exporter calls `collect({ rootDir, models })` and hands the JSON to the view as
 * `ctx.viewData`.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { loadKnowledgeModel } from '../skills/nn-conntent/scripts/lib/knowledge-model.mjs'
import { loadCascadeBags, withScriptPresets } from '../skills/nn-conntent/scripts/lib/video-scope.mjs'
import { createCascade } from '../skills/nn-conntent/scripts/lib/cascade.mjs'
import { lowerEpisode, scriptSubjectsFromScenes } from '../skills/nn-conntent/scripts/lib/review-subject.mjs'
import { previewSubjectsFromScenes } from '../skills/nn-conntent/scripts/lib/preview-subject.mjs'
import { evaluateGate, readAppliedVerdicts, reopenCause } from '../skills/nn-conntent/scripts/lib/gates.mjs'
import { latestDelivery } from '../skills/nn-conntent/scripts/lib/delivery.mjs'
import { CacheManager } from '../skills/nn-conntent/scripts/cache-manager.mjs'
import { resolveDefaultCacheDir } from '../skills/nn-conntent/scripts/lib/video-guard.mjs'
import registry from '../skills/nn-conntent/scripts/lib/field-registry.generated.json' with { type: 'json' }

const EPISODE_DOC = /_coNNtent_NN\.md$/i

async function listDir(dir) {
  try {
    return await readdir(dir, { withFileTypes: true })
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return []
    throw err
  }
}

/** Series folders under `series/`: a folder holding `<slug>_coNNtent_NN.md`. */
async function seriesDirs(rootDir) {
  const out = []
  for (const entry of await listDir(join(rootDir, 'series'))) {
    if (!entry.isDirectory()) continue
    const docs = (await listDir(join(rootDir, 'series', entry.name))).filter(
      (f) => f.isFile() && EPISODE_DOC.test(f.name),
    )
    if (docs.length > 0) out.push({ slug: entry.name, dir: join(rootDir, 'series', entry.name), docs })
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug))
}

/** Episode folders under `series/<s>/episodes/<slug>/`. */
async function episodeDirs(seriesDir) {
  const out = []
  for (const entry of await listDir(join(seriesDir, 'episodes'))) {
    if (!entry.isDirectory()) continue
    const dir = join(seriesDir, 'episodes', entry.name)
    const doc = (await listDir(dir)).find((f) => f.isFile() && EPISODE_DOC.test(f.name))
    if (doc) out.push({ slug: entry.name, dir, scriptPath: join(dir, doc.name) })
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug))
}

async function readPlanHash(episodeDir) {
  try {
    const plan = JSON.parse(await readFile(join(episodeDir, 'plan.json'), 'utf8'))
    return typeof plan.plan_hash === 'string' ? plan.plan_hash : null
  } catch {
    return null
  }
}

/** Every cascade field's effective value and source at one position. */
function fieldsFor(cascade, scene, layer) {
  const out = {}
  const at = cascade.at(scene, layer)
  for (const [name, def] of Object.entries(registry.fields || {})) {
    if (!def || !def.cascade) continue
    const resolved = at.get(name)
    out[name] = { value: resolved.value, source: resolved.source }
  }
  return out
}

async function episodeFacts({ rootDir, series, episode }) {
  const model = loadKnowledgeModel(episode.scriptPath)
  const video = (model.elements?.Video || [])[0] || {}
  const fields = video.fields || {}
  const slug = String(fields.slug || video.slug || episode.slug)
  const modelId = `${series.slug}/${slug}`
  const bags = withScriptPresets(loadCascadeBags(series.dir), model, episode.scriptPath)
  // The Video element's own fields are the innermost explicit level of the cascade.
  const videoBag = (model.elements?.Video || [])[0]?.fields || {}
  const cascadeBags = { ...bags, video: { ...(bags.video || {}), ...videoBag } }
  const cascade = createCascade({ model, scriptPath: episode.scriptPath, bags: cascadeBags })
  const language = cascade.at().get('language').value
  const reviewGates = cascade.at().get('review_gates').value
  const gateList = Array.isArray(reviewGates) ? reviewGates.map(String) : reviewGates ? [String(reviewGates)] : ['script', 'preview']

  const parsed = lowerEpisode({ model, bags, scriptDir: episode.dir })
  const scriptEntries = scriptSubjectsFromScenes(parsed.scenes || [], language)
  const verdicts = readAppliedVerdicts(rootDir, modelId)
  const planHash = await readPlanHash(episode.dir)

  const cacheManager = new CacheManager({ baseDir: resolveDefaultCacheDir(episode.dir), readOnly: true })
  const previewEntries = previewSubjectsFromScenes(parsed.scenes || [], Object.fromEntries(scriptEntries.map((e) => [e.scene, e])), {
    cacheManager,
    config: {},
    models: {},
    bags,
    planHashes: {},
  })

  const snapshot = { scenes: {} }
  try {
    const raw = JSON.parse(await readFile(join(rootDir, '.cognnitive', 'video', 'reviews', `${series.slug}__${slug}.json`), 'utf8'))
    if (raw && raw.scenes) snapshot.scenes = raw.scenes
  } catch {
    /* no record: the cause is unknown, the state is the same */
  }

  const gates = []
  if (gateList.includes('script')) {
    for (const entry of scriptEntries) {
      const state = evaluateGate({ gate: 'script', scene: entry.scene, currentHash: entry.hash, verdicts })
      const previous = snapshot.scenes[entry.scene]?.script
      const cause = state.state === 'reopened' && previous ? reopenCause({ previous: previous.subject, current: entry.subject, sources: previous.sources }) : null
      gates.push({ gate: 'script', scene: entry.scene, ...state, cause: cause || state.cause })
    }
  }
  if (gateList.includes('preview')) {
    for (const entry of previewEntries) {
      const state = evaluateGate({ gate: 'preview', scene: entry.scene, currentHash: entry.hash, planHash: entry.planHash, verdicts })
      gates.push({ gate: 'preview', scene: entry.scene, ...state })
    }
  }
  if (gateList.includes('budget') || (!gateList.includes('preview') && planHash)) {
    gates.push({ gate: 'budget', scene: null, ...evaluateGate({ gate: 'budget', scene: null, currentHash: planHash || '', planHash: planHash || null, verdicts }) })
  }

  const sceneViews = (parsed.scenes || []).map((scene) => {
    const entry = scriptEntries.find((e) => e.scene === (scene.slug || scene.id))
    const preview = previewEntries.find((e) => e.scene === (scene.slug || scene.id))
    return {
      slug: scene.slug || scene.id,
      name: scene.name,
      narration: scene.narration || '',
      scriptHash: entry ? entry.hash : null,
      previewHash: gateList.includes('preview') && preview ? preview.hash : null,
      fields: fieldsFor(cascade, scene.slug || scene.id),
      gates: gates.filter((g) => g.scene === (scene.slug || scene.id)),
    }
  })

  const latest = latestDelivery(episode.dir)
  const deliveries = []
  for (const entry of await listDir(join(episode.dir, 'deliveries'))) {
    if (entry.isDirectory() && /^v\d+$/.test(entry.name)) deliveries.push(entry.name)
  }

  return {
    slug,
    modelId,
    title: String(fields.title || slug),
    status: String(fields.status || ''),
    language: language || null,
    translationOf: fields.translation_of ? String(fields.translation_of) : null,
    reviewGates: gateList,
    planHash,
    scenes: sceneViews,
    gates,
    pending: gates.filter((g) => g.state !== 'approved'),
    deliveries: deliveries.sort(),
    latestDelivery: latest ? latest.version : null,
    thumbnail: fields.thumbnail ? String(fields.thumbnail) : null,
  }
}

export async function collect({ rootDir } = {}) {
  const root = String(rootDir || '.')
  const series = []
  for (const s of await seriesDirs(root)) {
    const seriesDoc = s.docs[0] ? loadKnowledgeModel(join(s.dir, s.docs[0].name)) : null
    const seriesFields = (seriesDoc?.elements?.Series || [])[0]?.fields || {}
    const episodes = []
    for (const e of await episodeDirs(s.dir)) {
      episodes.push(await episodeFacts({ rootDir: root, series: s, episode: e }))
    }
    series.push({
      slug: s.slug,
      title: String(seriesFields.title || seriesDoc?.frontmatter?.title || s.slug),
      episodes,
    })
  }
  const pending = series.flatMap((s) =>
    s.episodes.flatMap((e) => e.pending.map((gate) => ({ series: s.slug, episode: e.slug, ...gate }))),
  )
  return { tree: { domain: root, series }, pending }
}
