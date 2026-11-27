/**
 * Lineage Projection.
 * Pure, deterministic, browser-safe projection over workspace FileSnapshot[].
 *
 * Roles come from the naming contract, never from folders: a file with a
 * co-located sidecar is a Source, an `isModelCandidate` document is
 * Knowledge, and any other file is an Artifact only when it is a family
 * member or declares upstream `sources`.
 */
import { parseFrontmatter } from '../parser/yaml.js'
import { splitSourceFieldValue } from '../sourceRef.js'
import type { CitationSite } from '../validator/workspaceSources.js'
import type { FileSnapshot } from '../queryUnits.js'
import {
  compareMembers,
  displayStem,
  familyOf,
  isExcludedPath,
  isModelCandidate,
  isRegenerableView,
  parseName,
  parentSpecNameOf,
  rawPathOfSidecar,
  roleOf,
} from '../naming/contract.js'
import { buildChangeLog } from '../changelog/load.js'
import { parsedKnowledgeOf, type SnapshotParses } from './snapshot-parses.js'
import { canonicalUnitModelId } from '../changeset/resolved-target.js'
import type { ChangeLog } from '../changelog/index.js'

export interface LineageSource {
  name: string
  /** Workspace-relative path of the Source subject (the raw file). */
  raw_filename: string
  raw_hash?: string
  size?: string
  source_format: string
  normalized_at?: string
  normalized_by?: string
  /** Workspace-relative path of the co-located sidecar. */
  normalized_content: string
  /** `V<rank>` in the subject's write-once family. */
  version: string
  /** Workspace-relative path of the next family member; absent on the latest. */
  superseded_by?: string
  derived_from: string[]
}

export interface LineageKnowledge {
  name: string
  model_ref: string
  knowledge_version?: string
  model_template?: string
  citations: CitationSite[]
}

export interface LineageArtifact {
  name: string
  artifact_ref: string
  artifact_format: 'document' | 'report' | 'board' | 'dataset'
  citations: CitationSite[]
}

export interface LineageDiagnostic {
  code: 'SIDECAR_SUBJECT_MISMATCH' | 'ARTIFACT_WITHOUT_RECORD'
  /** The offending sidecar. */
  path: string
  message: string
}

/** One log-derived edge of the lineage graph. */
export interface LineageEdge {
  from: string
  to: string
  /**
   * `evidence`: a cited file and the unit owner it feeds.
   * `target`: a unit address and the model or artifact that owns it.
   * `produced`: an artifact and the changeset that recorded its production.
   */
  kind: 'evidence' | 'target' | 'produced'
  /** Id of the applied change the edge derives from. */
  change: string
}

/**
 * A changeset projected as a lineage node: an L3 `changes` document whose role
 * derives from the naming contract (`parent_spec.name === "changes"`), not from
 * the `changes/` folder.
 */
export interface LineageChangeset {
  name: string
  changeset_ref: string
  status?: string
  /** Change ids declared by the changeset, in document order. */
  changes: string[]
}

export interface LineageProjection {
  sources: LineageSource[]
  knowledge: LineageKnowledge[]
  artifacts: LineageArtifact[]
  changesets: LineageChangeset[]
  diagnostics: LineageDiagnostic[]
}

/** The computed view: the filesystem inventory plus the log-derived edges. */
export interface LineageView extends LineageProjection {
  edges: LineageEdge[]
}

const SOURCE_FORMAT_OPTIONS = new Set(['txt', 'md', 'csv', 'json', 'docx', 'pdf', 'xlsx'])
const ARTIFACT_EXTENSIONS = new Set(['md', 'html', 'htm', 'csv', 'json'])

function mapSourceFormat(ext: string): string {
  const clean = ext.toLowerCase().replace(/^\./, '')
  return SOURCE_FORMAT_OPTIONS.has(clean) ? clean : 'md'
}

function posixPath(p: string): string {
  return p.split('\\').join('/')
}

function getBasename(p: string): string {
  const norm = posixPath(p)
  return norm.split('/').pop() || norm
}

function getDirname(p: string): string {
  const norm = posixPath(p)
  const idx = norm.lastIndexOf('/')
  return idx === -1 ? '' : norm.slice(0, idx)
}

function getExtension(p: string): string {
  const base = getBasename(p)
  const idx = base.lastIndexOf('.')
  return idx === -1 ? '' : base.slice(idx + 1).toLowerCase()
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function frontmatterOf(content: string): Record<string, unknown> {
  return (parseFrontmatter(content) || {}) as Record<string, unknown>
}

/**
 * THE citation extractor for every file that declares its own upstream
 * (artifacts, cognitivized sources, sidecars): one `sources` location per
 * file kind. kNNowledge documents declare theirs in element fields and are
 * read by the projection itself.
 */
export function extractDeclaredCitations(file: FileSnapshot): CitationSite[] {
  const p = posixPath(file.path)
  const ext = getExtension(p)
  const sites: CitationSite[] = []
  const push = (value: string, field: string): void => {
    sites.push({ value, referringPath: p, field })
  }

  if (ext === 'md') {
    const fm = frontmatterOf(file.content)
    if (fm.sources) {
      for (const raw of splitSourceFieldValue(fm.sources)) push(raw, 'sources')
    }
  } else if (ext === 'html' || ext === 'htm') {
    // Console exports carry their model payload in an inline script, but
    // `meta.sources` there names the model file, not its citations: a console
    // export declares no upstream through it (provenance is the change log).
    return sites
  } else if (ext === 'csv') {
    const lines = file.content.split(/\r?\n/)
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''))
    const sourcesIdx = header.indexOf('sources')
    if (sourcesIdx !== -1) {
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        const cell = line.split(',')[sourcesIdx]?.trim().replace(/^["']|["']$/g, '')
        if (cell) push(cell, 'sources')
      }
    }
  } else if (ext === 'json') {
    try {
      const parsed = JSON.parse(file.content)
      const items = Array.isArray(parsed) ? parsed : [parsed]
      for (const item of items) {
        if (item && typeof item === 'object' && 'sources' in item) {
          for (const raw of splitSourceFieldValue((item as Record<string, unknown>).sources)) {
            push(raw, 'sources')
          }
        }
      }
    } catch {
      // Ignore JSON parse error
    }
  }

  return sites
}

/**
 * Citation sites declared by every file that is not a kNNowledge document:
 * plain files (artifacts, cognitivized sources) and sidecars. Excluded paths
 * (staging, ignored roots, dot folders) declare nothing.
 */
export function extractFileCitations(files: FileSnapshot[]): CitationSite[] {
  const sites: CitationSite[] = []
  for (const file of files) {
    const p = posixPath(file.path)
    if (isExcludedPath(p)) continue
    const parsed = parseName(getBasename(p))
    if (parsed.kind === 'nn' && parsed.sidecarOf === undefined) continue
    sites.push(...extractDeclaredCitations(file))
  }
  return sites
}

function familyKey(path: string): string | null {
  const family = familyOf(path)
  return family ? `${family.dir}\u0000${family.key}\u0000${family.ext}` : null
}

/**
 * Citation sites for the evidence of applied changes (change-provenance:
 * consumers read the log; S5a removes `sources::`). Keyword evidence
 * (`decision`, `unknown`) is not a citation and is skipped.
 */
export function evidenceCitationSites(
  log: ChangeLog,
  scope: 'live' | 'all-time' = 'live',
): CitationSite[] {
  const sites: CitationSite[] = []
  for (const [citation, entries] of log.evidence(scope)) {
    const keyword = citation.toLowerCase()
    if (keyword === 'decision' || keyword === 'unknown') continue
    for (const entry of entries) {
      sites.push({ value: citation, referringPath: entry.unit, field: 'evidence' })
    }
  }
  return sites
}

/**
 * Pure projection from FileSnapshot[] to LineageView.
 *
 * Inventory (sources, knowledge, artifacts, changesets) comes from the files
 * and their sidecars. Edges come from the change log: `live` evidence by default
 * (the last applied change of each unit, after the epoch cut), every applied
 * change with `{ scope: 'all-time' }`. A non-regenerable artifact with no
 * `produce_artifact` change is an `ARTIFACT_WITHOUT_RECORD` warning. Nothing is
 * read from or written to disk here.
 */
export function projectLineage(
  files: FileSnapshot[],
  log: ChangeLog = buildChangeLog(files),
  options: {
    scope?: 'live' | 'all-time'
    /** The parses of `files` already made for this snapshot (`readLineageSnapshot`). */
    parses?: SnapshotParses
  } = {},
): LineageView {
  const live = files
    .map((f) => ({ path: posixPath(f.path), content: f.content }))
    .filter((f) => !isExcludedPath(f.path))
    .sort((a, b) => compareStrings(a.path, b.path))
  const byFilePath = new Map(live.map((f) => [f.path, f]))
  const diagnostics: LineageDiagnostic[] = []

  // 1. Sources: the subject of every sidecar.
  const subjects: { subject: string; sidecar: FileSnapshot; fm: Record<string, unknown> }[] = []
  for (const sidecar of live) {
    const subject = rawPathOfSidecar(sidecar.path)
    if (subject === null) continue
    const fm = frontmatterOf(sidecar.content)
    const declared = typeof fm.source_file === 'string' ? posixPath(fm.source_file.trim()) : undefined
    if (declared !== subject) {
      diagnostics.push({
        code: 'SIDECAR_SUBJECT_MISMATCH',
        path: sidecar.path,
        message: `Sidecar source_file "${declared ?? ''}" does not match the subject "${subject}" derived from its name`,
      })
    }
    subjects.push({ subject, sidecar, fm })
  }
  subjects.sort((a, b) => compareStrings(a.subject, b.subject))

  const families = new Map<string, string[]>()
  for (const { subject } of subjects) {
    const key = familyKey(subject)
    if (key === null) continue
    families.set(key, [...(families.get(key) ?? []), subject])
  }
  for (const members of families.values()) {
    members.sort((a, b) => compareMembers(a, b) || compareStrings(a, b))
  }

  const sources: LineageSource[] = subjects.map(({ subject, sidecar, fm }) => {
    const key = familyKey(subject)
    const members = key === null ? [subject] : families.get(key)!
    const rank = members.indexOf(subject)
    const subjectFile = byFilePath.get(subject)
    // The subject's own declared citations win; a binary or a frontmatter-less text file
    // (a curated CSV) carries its upstream in the sidecar instead.
    const declared = subjectFile ? extractDeclaredCitations(subjectFile).map((c) => c.value) : []
    const derivedFrom =
      declared.length > 0 ? declared : fm.sources ? splitSourceFieldValue(fm.sources) : []
    return {
      name: getBasename(subject),
      raw_filename: subject,
      raw_hash: typeof fm.sha256 === 'string' ? fm.sha256 : undefined,
      size: fm.size_bytes != null ? String(fm.size_bytes) : undefined,
      source_format: mapSourceFormat(getExtension(subject)),
      normalized_at: typeof fm.normalized_at === 'string' ? fm.normalized_at : undefined,
      normalized_by: typeof fm.normalized_by === 'string' ? fm.normalized_by : undefined,
      normalized_content: sidecar.path,
      version: `V${rank + 1}`,
      superseded_by: members[rank + 1],
      derived_from: Array.from(new Set(derivedFrom)),
    }
  })

  // Disambiguate duplicate source names by folder.
  const nameCounts: Record<string, number> = {}
  for (const s of sources) nameCounts[s.name] = (nameCounts[s.name] || 0) + 1
  for (const s of sources) {
    if (nameCounts[s.name] > 1) {
      const parentDir = getDirname(s.raw_filename)
      if (parentDir) s.name = `${parentDir} ${s.name}`
    }
  }

  // 2. Knowledge: every `isModelCandidate` document.
  const knowledge: LineageKnowledge[] = []
  for (const kf of live) {
    const parsedName = parseName(getBasename(kf.path))
    if (parsedName.kind !== 'nn' || parsedName.sidecarOf !== undefined) continue
    const parsed = parsedKnowledgeOf(options.parses, kf.path, kf.content)
    if (!isModelCandidate({ path: kf.path, frontmatter: (parsed.frontmatter ?? {}) as Record<string, unknown> })) {
      continue
    }

    const name = parsed.frontmatter?.title || displayStem(getBasename(kf.path))
    const modelTemplate = parsed.frontmatter?.parent_spec?.name
    const knowledgeVersion =
      parsed.frontmatter?.knowledge_version ||
      (typeof parsed.frontmatter?.model === 'string' ? parsed.frontmatter.model : undefined)

    const citations: CitationSite[] = []
    // Transitional (S5b.4 rebuilds the corpora): a model's legacy `sources::`
    // field is still reported as a citation so the audits and gc keep protecting
    // the files it names. S5a.3 reports the field itself as banned.
    for (const [, elements] of parsed.elements.entries()) {
      for (const el of elements) {
        for (const [fieldName, val] of Object.entries(el.fields)) {
          const lower = fieldName.toLowerCase()
          if (lower !== 'sources' && lower !== 'source') continue
          for (const raw of splitSourceFieldValue(val)) {
            citations.push({ value: raw, referringPath: kf.path, element: el.name, field: fieldName })
          }
        }
      }
    }
    const fm = parsed.frontmatter as Record<string, unknown> | undefined
    if (fm?.sources) {
      for (const raw of splitSourceFieldValue(fm.sources)) {
        citations.push({ value: raw, referringPath: kf.path, field: 'sources' })
      }
    }

    knowledge.push({
      name,
      model_ref: kf.path,
      knowledge_version: knowledgeVersion,
      model_template: modelTemplate,
      citations,
    })
  }

  // 2b. Changesets: L3 `changes` documents, a lineage node by role.
  const changesets: LineageChangeset[] = []
  for (const cf of live) {
    const parsedName = parseName(getBasename(cf.path))
    if (parsedName.kind !== 'nn' || parsedName.sidecarOf !== undefined) continue
    const parsed = parsedKnowledgeOf(options.parses, cf.path, cf.content)
    const fm = (parsed.frontmatter ?? {}) as Record<string, unknown>
    if (roleOf({ path: cf.path, parentSpecName: parentSpecNameOf(fm) }) !== 'changeset') continue
    changesets.push({
      name: parsed.frontmatter?.title || displayStem(getBasename(cf.path)),
      changeset_ref: cf.path,
      status: typeof fm.status === 'string' ? fm.status : undefined,
      changes: [...parsed.elements.entries()].flatMap(([, els]) => els.map((el) => el.name)),
    })
  }

  // 3. Artifacts: plain files that are not Sources and are family members or declare upstream.
  const sourcePaths = new Set(subjects.map((s) => s.subject))
  const familySizes = new Map<string, number>()
  for (const f of live) {
    const key = familyKey(f.path)
    if (key !== null) familySizes.set(key, (familySizes.get(key) ?? 0) + 1)
  }

  const artifacts: LineageArtifact[] = []
  for (const af of live) {
    const parsedName = parseName(getBasename(af.path))
    if (parsedName.kind !== 'file' || sourcePaths.has(af.path)) continue
    const ext = getExtension(af.path)
    if (!ARTIFACT_EXTENSIONS.has(ext)) continue

    const citations = extractDeclaredCitations(af)
    const isFamilyMember = parsedName.stamp !== undefined || (familySizes.get(familyKey(af.path)!) ?? 0) > 1
    if (!isFamilyMember && citations.length === 0) continue

    let format: LineageArtifact['artifact_format'] = 'document'
    if (ext === 'md') {
      const fm = frontmatterOf(af.content)
      const declared = typeof fm.format === 'string' ? fm.format : typeof fm.type === 'string' ? fm.type : undefined
      if (declared === 'report' || declared === 'board' || declared === 'dataset' || declared === 'document') {
        format = declared
      }
    } else if (ext === 'html' || ext === 'htm') {
      format = 'board'
    } else if (ext === 'csv' || ext === 'json') {
      format = 'dataset'
    }

    artifacts.push({
      name: getBasename(af.path).replace(/\.[^.]+$/, ''),
      artifact_ref: af.path,
      artifact_format: format,
      citations,
    })
  }

  return { sources, knowledge, artifacts, changesets, diagnostics, edges: buildEdges() }

  /** Log-derived edges: live evidence by default, every applied change all-time. */
  function buildEdges(): LineageEdge[] {
    const modelRefByModel = new Map<string, string>()
    for (const entry of knowledge) {
      const stem = displayStem(getBasename(entry.model_ref))
      modelRefByModel.set(canonicalUnitModelId(stem), entry.model_ref)
    }
    const artifactRefs = new Set(artifacts.map((artifact) => artifact.artifact_ref))

    /** The model or artifact a unit belongs to; the unit address when unknown. */
    const ownerOf = (unit: string): string => {
      if (artifactRefs.has(unit)) return unit
      const at = unit.indexOf('@')
      if (at === -1) return modelRefByModel.get(canonicalUnitModelId(unit)) ?? unit
      return modelRefByModel.get(canonicalUnitModelId(unit.slice(0, at))) ?? unit
    }

    const edges: LineageEdge[] = []
    const seen = new Set<string>()
    const push = (edge: LineageEdge): void => {
      const key = `${edge.kind}\u0000${edge.from}\u0000${edge.to}\u0000${edge.change}`
      if (seen.has(key)) return
      seen.add(key)
      edges.push(edge)
    }

    for (const [citation, sites] of log.evidence(options.scope ?? 'live')) {
      for (const site of sites) {
        const owner = ownerOf(site.unit)
        push({ from: citation, to: owner, kind: 'evidence', change: site.changeId })
        if (site.unit.includes('@')) push({ from: site.unit, to: owner, kind: 'target', change: site.changeId })
      }
    }

    // Production records: one edge per applied `produce_artifact` change. In live
    // scope only the change that still owns the artifact counts.
    for (const change of log.all) {
      if (!change.applied || change.op !== 'produce_artifact') continue
      const ref = change.resolvedTarget ?? change.target
      if ((options.scope ?? 'live') === 'live' && log.origin(ref)?.id !== change.id) continue
      push({ from: ref, to: change.changeset, kind: 'produced', change: change.id })
    }

    // A non-regenerable artifact without a production record is a warning; a
    // regenerable console view or audit report needs none.
    const recorded = new Set(
      log.all
        .filter((change) => change.applied && change.op === 'produce_artifact')
        .map((change) => change.resolvedTarget ?? change.target),
    )
    for (const artifact of artifacts) {
      if (recorded.has(artifact.artifact_ref) || isRegenerableView(artifact.artifact_ref)) continue
      diagnostics.push({
        code: 'ARTIFACT_WITHOUT_RECORD',
        path: artifact.artifact_ref,
        message: `Artifact "${artifact.artifact_ref}" has no applied produce_artifact change; record how it was produced`,
      })
    }

    return edges.sort((a, b) => compareStrings(a.from, b.from) || compareStrings(a.to, b.to) || compareStrings(a.kind, b.kind) || compareStrings(a.change, b.change))
  }
}
