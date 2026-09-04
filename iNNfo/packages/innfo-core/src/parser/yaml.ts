import { SpecFrontmatter } from '../types'
import { parse as yamlParse } from 'yaml'
import { normalizeSource, YAML_BLOCK_RE } from './markdown'

export function parseYaml(yamlStr: string): Record<string, any> {
  try {
    return yamlParse(yamlStr) || {}
  } catch (_err) {
    return {}
  }
}

/**
 * The parsed frontmatter while it is still being normalized: a plain bag of
 * `unknown` values. Each normalizer narrows the field(s) it owns and rewrites
 * them into the canonical shape declared by `SpecFrontmatter`.
 */
type MutableFrontmatter = Record<string, unknown>

/* ── narrowing helpers ─────────────────────────────────────────── */

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined
}

/** `String(v ?? '')` — matches the historical coercion used by every list block. */
function str(v: unknown): string {
  return String(v ?? '')
}

/**
 * Map an array-valued field entry-by-entry and drop the entries that map to
 * `null`. Returns `undefined` (leave the field untouched) when `value` is not
 * an array. Collapses the four near-identical `Array.isArray(x) ? x.map(...).filter(...)`
 * blocks that `includes` / `procedures` / `skills` / `viewers` each repeated.
 */
function coerceList<T>(value: unknown, mapEntry: (entry: unknown) => T | null): T[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.map(mapEntry).filter((x): x is T => x !== null)
}

/**
 * Pull `{ concepts?, fields? }` out of a raw `alias:` object. Matches the
 * historical check: any non-null object value for `concepts` / `fields` is
 * carried through verbatim.
 */
function normalizeAliasMap(raw: unknown): Record<string, unknown> {
  const obj = asRecord(raw)
  const aliasMap: Record<string, unknown> = {}
  if (obj) {
    if (obj.concepts && typeof obj.concepts === 'object') aliasMap.concepts = obj.concepts
    if (obj.fields && typeof obj.fields === 'object') aliasMap.fields = obj.fields
  }
  return aliasMap
}

/* ── normalizers (each owns one field / legacy-name group) ─────── */

/** `parent:` (string URL or legacy object) → `parent_spec: { url, name }`. */
function normalizeParentSpec(fm: MutableFrontmatter): void {
  if (!fm.parent || fm.parent_spec) return
  if (typeof fm.parent === 'string') {
    const url = fm.parent
    const name =
      url
        .split(/[/\\]/)
        .pop()
        ?.replace(/\.(md|markdown)$/i, '')
        .replace(/_(NN|FORMAT|F)$/i, '') || ''
    fm.parent_spec = { url, name }
  } else {
    fm.parent_spec = fm.parent
  }
  delete fm.parent
}

/** Legacy FORMAT-era names: `specification_version|url` → `spec_version|url`. */
function normalizeLegacyFieldNames(fm: MutableFrontmatter): void {
  if (fm.specification_version && !fm.spec_version) fm.spec_version = fm.specification_version
  if (fm.specification_url && !fm.spec_url) fm.spec_url = fm.specification_url
}

/**
 * `includes:` — a bare string is shorthand for a name with no explicit URL
 * (resolved locally by name); objects pass through with an optional `alias`.
 */
function normalizeIncludes(fm: MutableFrontmatter): void {
  const out = coerceList(fm.includes, (entry) => {
    if (typeof entry === 'string') {
      const name = entry.replace(/\.(md|markdown)$/i, '').replace(/_(NN|FORMAT|F)$/i, '')
      return name ? { name, url: '' } : null
    }
    const obj = asRecord(entry)
    if (!obj) return null
    const name = str(obj.name)
    if (!name) return null
    const res: Record<string, unknown> = { name, url: str(obj.url) }
    if (obj.alias && typeof obj.alias === 'object') res.alias = normalizeAliasMap(obj.alias)
    return res
  })
  if (out !== undefined) fm.includes = out
}

/** `procedures:` — `{ id, name, path, source_template? }`, dropped when `id` is empty. */
function normalizeProcedures(fm: MutableFrontmatter): void {
  const out = coerceList(fm.procedures, (p) => {
    const obj = asRecord(p)
    if (!obj) return null
    const id = str(obj.id)
    if (!id) return null
    return {
      id,
      name: str(obj.name),
      path: str(obj.path),
      ...(obj.source_template ? { source_template: str(obj.source_template) } : {}),
    }
  })
  if (out !== undefined) fm.procedures = out
}

/** `skills:` — `{ name, repo, path, source_template? }`, dropped when `name` is empty. */
function normalizeSkills(fm: MutableFrontmatter): void {
  const out = coerceList(fm.skills, (s) => {
    const obj = asRecord(s)
    if (!obj) return null
    const name = str(obj.name)
    if (!name) return null
    return {
      name,
      repo: str(obj.repo),
      path: str(obj.path),
      ...(obj.source_template ? { source_template: str(obj.source_template) } : {}),
    }
  })
  if (out !== undefined) fm.skills = out
}

/** `viewers:` — `{ id, view_type, ... }`, dropped when `id` or `view_type` is empty. */
function normalizeViewers(fm: MutableFrontmatter): void {
  const out = coerceList(fm.viewers, (v) => {
    const obj = asRecord(v)
    if (!obj) return null
    const id = str(obj.id)
    const viewType = str(obj.view_type ?? obj.type)
    if (!id || !viewType) return null
    return {
      id,
      view_type: viewType,
      ...(obj.target_concept ? { target_concept: str(obj.target_concept) } : {}),
      ...(obj.label ? { label: str(obj.label) } : {}),
      ...(obj.icon ? { icon: str(obj.icon) } : {}),
      ...(obj.description ? { description: str(obj.description) } : {}),
      ...(obj.source_template ? { source_template: str(obj.source_template) } : {}),
    }
  })
  if (out !== undefined) fm.viewers = out
}

/** Top-level `alias:` → `{ concepts?, fields? }`. */
function normalizeTopLevelAlias(fm: MutableFrontmatter): void {
  if (fm.alias && typeof fm.alias === 'object') fm.alias = normalizeAliasMap(fm.alias)
}

/**
 * Legacy matrix reader tolerance (R-MM-08 / 4.5): `params: "a;b;c"` → `values`,
 * and `widget` → `widgetType`. Mutates the matrix entries in place.
 */
function normalizeMatrices(fm: MutableFrontmatter): void {
  if (!Array.isArray(fm.matrices)) return
  for (const raw of fm.matrices) {
    const m = asRecord(raw)
    if (!m) continue
    if (m.params && typeof m.params === 'string' && !m.values) {
      m.values = m.params.split(';').map((s) => s.trim())
    }
    if (m.widget && !m.widgetType) {
      m.widgetType = m.widget
      delete m.widget
    }
  }
}

const NORMALIZERS: Array<(fm: MutableFrontmatter) => void> = [
  normalizeParentSpec,
  normalizeLegacyFieldNames,
  normalizeIncludes,
  normalizeProcedures,
  normalizeSkills,
  normalizeViewers,
  normalizeTopLevelAlias,
  normalizeMatrices,
]

export function parseFrontmatter(content: string): SpecFrontmatter | null {
  const match = normalizeSource(content).match(YAML_BLOCK_RE)
  if (!match) return null
  const fm = parseYaml(match[1]) as MutableFrontmatter
  for (const normalize of NORMALIZERS) normalize(fm)
  return fm as SpecFrontmatter
}
