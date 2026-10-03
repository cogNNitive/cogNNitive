/**
 * Sidecar document shape: pure and browser-safe (types, build, parse). The
 * only writer of sidecars is `cognitivize` in `cognitivize.ts`.
 */
import { parse as yamlParse, stringify as yamlStringify } from 'yaml'
import { SIDECAR_BLUEPRINT, SPEC_FILENAME } from '../naming/contract.js'

/** Formats whose file is its own text: their sidecar carries no body. */
export const TEXT_NATIVE_FORMATS: ReadonlySet<string> = new Set(['md', 'csv', 'json'])

/** Converts a binary subject into normalized markdown. Injected: core imports no converter. */
export type Normalizer = (i: { path: string; ext: string; bytes: Uint8Array }) => Promise<{
  body: string
  normalizedBy: string
  metadata?: Record<string, string | number>
}>

export const SIDECAR_SPEC_URL = `https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/${SIDECAR_BLUEPRINT}/${SPEC_FILENAME}`

/** Keys `cognitivize` owns; a normalizer or an older sidecar can never override them. */
const OWNED_KEYS = new Set([
  'level',
  'parent_spec',
  'source_file',
  'sha256',
  'size_bytes',
  'source_format',
  'normalized_at',
  'normalized_by',
  'sources',
  // A sidecar's upstream edge is `sources`; the projection derives `derived_from` itself.
  'derived_from',
])

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

/** Raw frontmatter of a sidecar (no key normalization, so unknown keys survive); `null` when absent or invalid. */
export function parseSidecarFrontmatter(text: string): Record<string, unknown> | null {
  const match = FRONTMATTER_RE.exec(text)
  if (!match) return null
  try {
    const value: unknown = yamlParse(match[1])
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export interface SidecarInput {
  sourceFile: string
  sha256: string
  sizeBytes: number
  sourceFormat: string
  /** ISO 8601 UTC instant, seconds precision. */
  normalizedAt: string
  normalizedBy?: string
  /** Frontmatter of the sidecar being refreshed: `sources` and unknown keys are carried over. */
  previous?: Record<string, unknown> | null
  /** Normalizer metadata; never overrides a key `cognitivize` owns. */
  metadata?: Record<string, string | number>
  /** Normalized markdown body; only binary subjects have one. */
  body?: string
}

export function buildSidecar(i: SidecarInput): string {
  const fm: Record<string, unknown> = {
    level: 3,
    parent_spec: { name: SIDECAR_BLUEPRINT, url: SIDECAR_SPEC_URL },
    source_file: i.sourceFile,
    sha256: i.sha256,
    size_bytes: i.sizeBytes,
    source_format: i.sourceFormat,
    normalized_at: i.normalizedAt,
  }
  if (i.normalizedBy) fm['normalized_by'] = i.normalizedBy
  const sources = i.previous?.['sources']
  if (sources !== undefined) fm['sources'] = sources
  for (const extras of [i.previous ?? {}, i.metadata ?? {}]) {
    for (const [key, value] of Object.entries(extras)) {
      if (!OWNED_KEYS.has(key)) fm[key] = value
    }
  }
  const head = `---\n${yamlStringify(fm, { lineWidth: 0 })}---\n`
  const body = i.body?.trim()
  return body ? `${head}\n${body}\n` : head
}
