/**
 * Lineage Renderer.
 * Formats LineageProjection into markdown section strings for # NN Sources, # NN ModelRecords, and # NN Artifacts.
 */
import type { LineageProjection, LineageSource, LineageKnowledge, LineageArtifact } from './project.js'

const SOURCES_GUIDANCE = 'No sources ingested yet. Place files in sources/import and run a scan.'
const MODELS_GUIDANCE = 'Auto-synced from kNNowledge/ on every --scan/--import-url/--lineage. One ModelRecords element per Level 3 model.'
const ARTIFACTS_GUIDANCE = 'Auto-synced from artifacts/ on every --scan/--import-url/--lineage. One element per generated deliverable.'

export function renderSourcesSection(sources: LineageSource[]): string {
  let out = '# NN Sources\n'
  if (sources.length === 0) {
    out += `\n<!-- ${SOURCES_GUIDANCE} -->\n`
    return out
  }
  for (const s of sources) {
    out += `\n## NN Sources: ${s.name}\n`
    out += `raw_filename:: ${s.raw_filename}\n`
    if (s.media_filename) out += `media_filename:: ${s.media_filename}\n`
    if (s.raw_hash) out += `raw_hash:: ${s.raw_hash}\n`
    if (s.size) out += `size:: ${s.size}\n`
    if (s.source_format) out += `source_format:: ${s.source_format}\n`
    if (s.normalized_at) out += `normalized_at:: ${s.normalized_at}\n`
    if (s.normalized_by) out += `normalized_by:: ${s.normalized_by}\n`
    out += `normalized_content:: ${s.normalized_content}\n`
    if (s.curated_csv) out += `curated_csv:: ${s.curated_csv}\n`
    if (s.status) out += `status:: ${s.status}\n`
    if (s.version) out += `version:: ${s.version}\n`
    if (s.archive_path) out += `archive_path:: ${s.archive_path}\n`
    if (s.superseded_by) out += `superseded_by:: ${s.superseded_by}\n`
    if (s.derived_from && s.derived_from.length > 0) {
      out += `derived_from:: [${s.derived_from.join(', ')}]\n`
    }
  }
  return out
}

export function renderModelsSection(models: LineageKnowledge[]): string {
  if (models.length === 0) {
    return `# NN ModelRecords\n\n<!-- ${MODELS_GUIDANCE} -->\n`
  }
  let out = '# NN ModelRecords\n'
  for (const m of models) {
    out += `\n## NN ModelRecords: ${m.name}\n`
    out += `model_ref:: ${m.model_ref}\n`
    if (m.knowledge_version) out += `knowledge_version:: ${m.knowledge_version}\n`
    if (m.model_template) out += `model_template:: ${m.model_template}\n`
    const derived = Array.from(new Set(m.citations.map((c) => c.value)))
    if (derived.length > 0) {
      out += `derived_from:: [${derived.join(', ')}]\n`
    }
  }
  return out
}

export function renderArtifactsSection(artifacts: LineageArtifact[]): string {
  if (artifacts.length === 0) {
    return `# NN Artifacts\n\n<!-- ${ARTIFACTS_GUIDANCE} -->\n`
  }
  let out = '# NN Artifacts\n'
  for (const a of artifacts) {
    out += `\n## NN Artifacts: ${a.name}\n`
    out += `artifact_ref:: ${a.artifact_ref}\n`
    out += `artifact_format:: ${a.artifact_format}\n`
    const derived = Array.from(new Set(a.citations.map((c) => c.value)))
    if (derived.length > 0) {
      out += `derived_from:: [${derived.join(', ')}]\n`
    }
  }
  return out
}

export function renderLineageSections(p: LineageProjection): {
  sources: string
  modelRecords: string
  artifacts: string
} {
  return {
    sources: renderSourcesSection(p.sources),
    modelRecords: renderModelsSection(p.knowledge),
    artifacts: renderArtifactsSection(p.artifacts),
  }
}
