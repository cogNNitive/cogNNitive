/**
 * Lineage Projection.
 * Pure, deterministic, browser-safe projection over workspace FileSnapshot[].
 */
import { parseFrontmatter } from '../parser/yaml.js'
import { parseKnowledge } from '../parser/core.js'
import { SOURCE_FIELD_NAMES, splitSourceFieldValue } from '../sourceRef.js'
import type { CitationSite } from '../validator/workspaceSources.js'
import type { FileSnapshot } from '../queryUnits.js'
import { displayStem, parseName, roleOf } from '../naming/contract.js'

export interface LineageSource {
  name: string
  raw_filename: string
  media_filename?: string
  raw_hash?: string
  size?: string
  source_format: string
  normalized_at?: string
  normalized_by?: string
  normalized_content: string
  curated_csv?: string
  status?: 'archived'
  version: string
  archive_path?: string
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

export interface LineageProjection {
  sources: LineageSource[]
  knowledge: LineageKnowledge[]
  artifacts: LineageArtifact[]
}

const SOURCE_FORMAT_OPTIONS = new Set(['txt', 'md', 'csv', 'json', 'docx', 'pdf', 'xlsx'])

function mapSourceFormat(ext: string): string {
  const clean = ext.toLowerCase().replace(/^\./, '')
  return SOURCE_FORMAT_OPTIONS.has(clean) ? clean : 'md'
}

function posixPath(p: string): string {
  return p.split('\\').join('/')
}

function getBasename(p: string, ext?: string): string {
  const norm = posixPath(p)
  const last = norm.split('/').pop() || norm
  if (ext && last.endsWith(ext)) {
    return last.slice(0, -ext.length)
  }
  return last
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

/**
 * Extract all citation sites across files in `export/**` and `sources/export/**`.
 */
export function extractFileCitations(files: FileSnapshot[]): CitationSite[] {
  const sites: CitationSite[] = []

  for (const file of files) {
    const p = posixPath(file.path)
    if (p.startsWith('export/')) {
      const ext = getExtension(p)
      if (ext === 'md') {
        const fm = (parseFrontmatter(file.content) || {}) as Record<string, unknown>
        if (fm.sources) {
          for (const raw of splitSourceFieldValue(fm.sources)) {
            sites.push({
              value: raw,
              referringPath: p,
              field: 'sources',
            })
          }
        }
      } else if (ext === 'html' || ext === 'htm') {
        const modelMatch = file.content.match(
          /<script[^>]+id=["']innfo-model["'][^>]*>([\s\S]*?)<\/script>/i,
        )
        if (modelMatch) {
          try {
            const parsed = JSON.parse(modelMatch[1].trim())
            if (Array.isArray(parsed?.meta?.sources)) {
              for (const raw of parsed.meta.sources) {
                if (typeof raw === 'string' && raw.trim()) {
                  sites.push({
                    value: raw.trim(),
                    referringPath: p,
                    field: 'meta.sources',
                  })
                }
              }
            }
          } catch {
            // Ignore parse errors on corrupted HTML payloads
          }
        }
      } else if (ext === 'csv') {
        const lines = file.content.split(/\r?\n/)
        if (lines.length > 0) {
          const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''))
          const sourcesIdx = header.indexOf('sources')
          if (sourcesIdx !== -1) {
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim()
              if (!line) continue
              const cols = line.split(',')
              const cell = cols[sourcesIdx]?.trim().replace(/^["']|["']$/g, '')
              if (cell) {
                sites.push({
                  value: cell,
                  referringPath: p,
                  field: 'sources',
                })
              }
            }
          }
        }
      } else if (ext === 'json') {
        try {
          const parsed = JSON.parse(file.content)
          const items = Array.isArray(parsed) ? parsed : [parsed]
          for (const item of items) {
            if (item && typeof item === 'object' && 'sources' in item) {
              for (const raw of splitSourceFieldValue((item as Record<string, unknown>).sources)) {
                sites.push({
                  value: raw,
                  referringPath: p,
                  field: 'sources',
                })
              }
            }
          }
        } catch {
          // Ignore JSON parse error
        }
      }
    } else if (p.startsWith('sources/export/') || p.startsWith('sources/nn/export/')) {
      if (p.endsWith('.md')) {
        const fm = (parseFrontmatter(file.content) || {}) as Record<string, unknown>
        if (fm.sources) {
          for (const raw of splitSourceFieldValue(fm.sources)) {
            sites.push({
              value: raw,
              referringPath: p,
              field: 'sources',
            })
          }
        }
      }
    }
  }

  return sites
}

/**
 * Pure projection from FileSnapshot[] to LineageProjection.
 */
export function projectLineage(files: FileSnapshot[]): LineageProjection {
  const normalizedFiles = files.map((f) => ({
    path: posixPath(f.path),
    content: f.content,
  }))

  // 1. Process Sources
  const activeSourceFiles = normalizedFiles
    .filter(
      (f) =>
        f.path.startsWith('sources/nn/') &&
        f.path.endsWith('.md') &&
        !f.path.startsWith('sources/nn/staging/') &&
        !f.path.startsWith('sources/nn/archive/') &&
        f.path !== 'sources/nn/index.md',
    )
    .sort((a, b) => a.path.localeCompare(b.path))

  const activeSources: (LineageSource & { mdRelPath: string })[] = []

  for (const f of activeSourceFiles) {
    const fm = (parseFrontmatter(f.content) || {}) as Record<string, unknown>
    const sourceFile = (typeof fm.source_file === 'string' ? fm.source_file : typeof fm.file === 'string' ? fm.file : f.path).trim()
    const rawBase = getBasename(sourceFile)
    const ext = getExtension(rawBase)
    const mediaFile = typeof fm.media_file === 'string' ? fm.media_file : typeof fm.media_filename === 'string' ? fm.media_filename : undefined
    const sha = typeof fm.sha256 === 'string' ? fm.sha256 : typeof fm.hash === 'string' ? fm.hash : undefined
    const size = fm.size_bytes != null ? String(fm.size_bytes) : fm.size != null ? String(fm.size) : undefined
    const normalizedAt = typeof fm.normalized_at === 'string' ? fm.normalized_at : undefined
    const normalizedBy = typeof fm.normalized_by === 'string' ? fm.normalized_by : undefined

    let derivedFrom: string[] = []
    if (sourceFile.startsWith('sources/export/')) {
      const promotedFile = normalizedFiles.find((p) => p.path === sourceFile)
      if (promotedFile) {
        const promotedFm = (parseFrontmatter(promotedFile.content) || {}) as Record<string, unknown>
        if (promotedFm.sources) {
          derivedFrom = splitSourceFieldValue(promotedFm.sources)
        }
      }
    }

    // Versioning from archive
    const baseStem = getBasename(f.path, '.md')
    const archivePattern = `sources/archive/${baseStem}/`
    const vNums: number[] = []
    for (const af of normalizedFiles) {
      if (af.path.startsWith(archivePattern) && af.path.endsWith('.md')) {
        const m = af.path.match(/\/V(\d+)\//)
        if (m) {
          vNums.push(parseInt(m[1], 10))
        }
      }
    }

    let version = 'V1'
    let archivePath: string | undefined
    if (vNums.length > 0) {
      const maxN = Math.max(...vNums)
      version = `V${maxN + 1}`
      archivePath = `sources/archive/${baseStem}/V${maxN}/${baseStem}.md`
    }

    activeSources.push({
      name: rawBase,
      raw_filename: sourceFile,
      media_filename: mediaFile,
      raw_hash: sha,
      size,
      source_format: mapSourceFormat(ext),
      normalized_at: normalizedAt,
      normalized_by: normalizedBy,
      normalized_content: f.path,
      version,
      archive_path: archivePath,
      derived_from: derivedFrom,
      mdRelPath: f.path.slice('sources/nn/'.length),
    })
  }

  // Curated CSVs in sources/nn/
  const csvFiles = normalizedFiles
    .filter(
      (f) =>
        f.path.startsWith('sources/nn/') &&
        f.path.endsWith('.csv') &&
        !f.path.startsWith('sources/nn/staging/') &&
        !f.path.startsWith('sources/nn/archive/'),
    )
    .sort((a, b) => a.path.localeCompare(b.path))

  for (const csv of csvFiles) {
    const stemMd = csv.path.replace(/\.csv$/i, '.md')
    const owner = activeSources.find((s) => s.normalized_content === stemMd)
    if (owner) {
      owner.curated_csv = csv.path
      continue
    }

    const relCsv = csv.path.slice('sources/nn/'.length)
    const rawCandidate = `sources/import/${relCsv}`
    const rawFilename = normalizedFiles.some((f) => f.path === rawCandidate) ? rawCandidate : csv.path

    activeSources.push({
      name: getBasename(csv.path),
      raw_filename: rawFilename,
      source_format: 'csv',
      normalized_content: csv.path,
      curated_csv: csv.path,
      version: 'V1',
      derived_from: [],
      mdRelPath: relCsv,
    })
  }

  // Disambiguate duplicate source names
  const nameCounts: Record<string, number> = {}
  for (const s of activeSources) {
    nameCounts[s.name] = (nameCounts[s.name] || 0) + 1
  }
  for (const s of activeSources) {
    if (nameCounts[s.name] > 1) {
      const parentDir = getDirname(s.mdRelPath)
      if (parentDir && parentDir !== '.') {
        s.name = `${parentDir} ${s.name}`
      }
    }
  }

  // Archived sources in sources/archive/
  const archiveFiles = normalizedFiles
    .filter((f) => f.path.startsWith('sources/archive/') && f.path.endsWith('.md'))
    .sort((a, b) => a.path.localeCompare(b.path))

  const archivedGroups = new Map<string, { vNum: number; vName: string; file: FileSnapshot; fm: Record<string, unknown> }[]>()
  for (const af of archiveFiles) {
    const match = af.path.match(/^sources\/archive\/([^/]+)\/(V\d+)\/([^/]+)\.md$/)
    if (match) {
      const base = match[1]
      const vName = match[2]
      const vNum = parseInt(vName.replace(/^V/, ''), 10)
      const fm = (parseFrontmatter(af.content) || {}) as Record<string, unknown>
      const list = archivedGroups.get(base) || []
      list.push({ vNum, vName, file: af, fm })
      archivedGroups.set(base, list)
    }
  }

  const archivedSources: LineageSource[] = []
  const sortedBases = Array.from(archivedGroups.keys()).sort()

  for (const base of sortedBases) {
    const vInfos = archivedGroups.get(base)!
    vInfos.sort((a, b) => a.vNum - b.vNum)
    const maxArchived = vInfos.length > 0 ? Math.max(...vInfos.map((v) => v.vNum)) : 0
    const hasActive = activeSources.some((s) => getBasename(s.normalized_content, '.md') === base)

    for (const vi of vInfos) {
      const sourceFile = (typeof vi.fm.source_file === 'string' ? vi.fm.source_file : typeof vi.fm.file === 'string' ? vi.fm.file : vi.file.path).trim()
      const rawBase = getBasename(sourceFile)
      const ext = getExtension(rawBase)
      let supersededBy: string | undefined
      if (hasActive) {
        supersededBy = `${rawBase} V${vi.vNum + 1}`
      } else if (vi.vNum < maxArchived) {
        supersededBy = `${rawBase} V${vi.vNum + 1}`
      }

      archivedSources.push({
        name: `${rawBase} ${vi.vName}`,
        raw_filename: sourceFile,
        raw_hash: typeof vi.fm.sha256 === 'string' ? vi.fm.sha256 : typeof vi.fm.hash === 'string' ? vi.fm.hash : undefined,
        size: vi.fm.size_bytes != null ? String(vi.fm.size_bytes) : vi.fm.size != null ? String(vi.fm.size) : undefined,
        source_format: mapSourceFormat(ext),
        normalized_at: typeof vi.fm.normalized_at === 'string' ? vi.fm.normalized_at : undefined,
        normalized_by: typeof vi.fm.normalized_by === 'string' ? vi.fm.normalized_by : undefined,
        normalized_content: vi.file.path,
        status: 'archived',
        version: vi.vName,
        superseded_by: supersededBy,
        derived_from: [],
      })
    }
  }

  const allSources: LineageSource[] = [
    ...activeSources.map(({ mdRelPath, ...rest }) => rest),
    ...archivedSources,
  ]

  // 2. Process Knowledge Models (kNNowledge/**/*_NN.md of role `knowledge`: no records, catalogs, or sidecars)
  const knowledgeFiles = normalizedFiles
    .filter((f) => f.path.startsWith('kNNowledge/') && parseName(getBasename(f.path)).kind === 'nn')
    .sort((a, b) => a.path.localeCompare(b.path))

  const knowledge: LineageKnowledge[] = []
  for (const kf of knowledgeFiles) {
    const parsed = parseKnowledge(kf.content)
    if (roleOf({ path: kf.path, parentSpecName: parsed.frontmatter?.parent_spec?.name }) !== 'knowledge') {
      continue
    }

    const baseName = displayStem(getBasename(kf.path))
    const name = parsed.frontmatter?.title || baseName
    const modelTemplate = parsed.frontmatter?.parent_spec?.name
    const knowledgeVersion = parsed.frontmatter?.knowledge_version || (typeof parsed.frontmatter?.model === 'string' ? parsed.frontmatter.model : undefined)

    const citations: CitationSite[] = []

    // Collect from parsed elements
    for (const [conceptName, elements] of parsed.elements.entries()) {
      for (const el of elements) {
        for (const [fieldName, val] of Object.entries(el.fields)) {
          if (SOURCE_FIELD_NAMES.has(fieldName.toLowerCase())) {
            for (const raw of splitSourceFieldValue(val)) {
              citations.push({
                value: raw,
                referringPath: kf.path,
                element: el.name,
                field: fieldName,
              })
            }
          }
        }
      }
    }

    // Also collect frontmatter sources if any
    const fm = parsed.frontmatter as Record<string, unknown> | undefined
    if (fm?.sources) {
      for (const raw of splitSourceFieldValue(fm.sources)) {
        citations.push({
          value: raw,
          referringPath: kf.path,
          field: 'sources',
        })
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

  // 3. Process Artifacts (export/**/*.{md,html,csv,json})
  const artifactFiles = normalizedFiles
    .filter((f) => f.path.startsWith('export/'))
    .sort((a, b) => a.path.localeCompare(b.path))

  const artifacts: LineageArtifact[] = []
  for (const af of artifactFiles) {
    const ext = getExtension(af.path)
    if (!['md', 'html', 'htm', 'csv', 'json'].includes(ext)) continue

    const baseName = getBasename(af.path).replace(/\.[^.]+$/, '')
    let format: 'document' | 'report' | 'board' | 'dataset' = 'document'
    const citations: CitationSite[] = []

    if (ext === 'md') {
      const fm = (parseFrontmatter(af.content) || {}) as Record<string, unknown>
      const declaredFormat = typeof fm.format === 'string' ? fm.format : typeof fm.type === 'string' ? fm.type : undefined
      if (declaredFormat === 'report' || declaredFormat === 'board' || declaredFormat === 'dataset' || declaredFormat === 'document') {
        format = declaredFormat
      } else {
        format = 'document'
      }
      if (fm.sources) {
        for (const raw of splitSourceFieldValue(fm.sources)) {
          citations.push({
            value: raw,
            referringPath: af.path,
            field: 'sources',
          })
        }
      }
    } else if (ext === 'html' || ext === 'htm') {
      format = 'board'
      const modelMatch = af.content.match(
        /<script[^>]+id=["']innfo-model["'][^>]*>([\s\S]*?)<\/script>/i,
      )
      if (modelMatch) {
        try {
          const parsed = JSON.parse(modelMatch[1].trim())
          if (Array.isArray(parsed?.meta?.sources)) {
            for (const raw of parsed.meta.sources) {
              if (typeof raw === 'string' && raw.trim()) {
                citations.push({
                  value: raw.trim(),
                  referringPath: af.path,
                  field: 'meta.sources',
                })
              }
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
    } else if (ext === 'csv') {
      format = 'dataset'
      const lines = af.content.split(/\r?\n/)
      if (lines.length > 0) {
        const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ''))
        const sourcesIdx = header.indexOf('sources')
        if (sourcesIdx !== -1) {
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue
            const cols = line.split(',')
            const cell = cols[sourcesIdx]?.trim().replace(/^["']|["']$/g, '')
            if (cell) {
              citations.push({
                value: cell,
                referringPath: af.path,
                field: 'sources',
              })
            }
          }
        }
      }
    } else if (ext === 'json') {
      format = 'dataset'
      try {
        const parsed = JSON.parse(af.content)
        const items = Array.isArray(parsed) ? parsed : [parsed]
        for (const item of items) {
          if (item && typeof item === 'object' && 'sources' in item) {
            for (const raw of splitSourceFieldValue((item as Record<string, unknown>).sources)) {
              citations.push({
                value: raw,
                referringPath: af.path,
                field: 'sources',
              })
            }
          }
        }
      } catch {
        // Ignore json parse errors
      }
    }

    artifacts.push({
      name: baseName,
      artifact_ref: af.path,
      artifact_format: format,
      citations,
    })
  }

  return {
    sources: allSources,
    knowledge,
    artifacts,
  }
}
