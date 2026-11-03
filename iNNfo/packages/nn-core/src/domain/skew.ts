/**
 * Version uniformity (design A14, A-16): one bluepriNNt version per bluepriNNt across the
 * domaiNN. Pure and browser-safe; the nn-preflight mirror exports it as well.
 */

import { blueprintNameOf } from '../naming/contract.js'
import { parsePinnedUrl, parseUnversionedBlueprintName } from '../workspace/integrity/versionStatus.js'
import { byText, parentSpecOf } from './classify.js'
import { layoutDiagnostic } from './placement.js'
import type { LayoutDiagnostic } from './types.js'

export interface SkewModel {
  path: string
  frontmatter: Record<string, unknown>
  /** Concepts the model holds that the finding should name (the instance root and distributed concepts). */
  concepts?: readonly string[]
}

type Incomparable = 'unpinned' | 'unclassifiable-url'

const VERSION_TOKEN_RE = /_(V_\d+-\d+-\d+)$/i

/** The `V_x-y-z` token a `parent_spec` name pins, or null for a bare name. */
export const versionTokenOf = (name: string): string | null => VERSION_TOKEN_RE.exec(name.trim())?.[1] ?? null

const MESSAGE_PATHS = 3
const META_PATHS = 10

function pinOf(m: SkewModel): { blueprint: string; version: string; incomparable?: Incomparable } | null {
  const { name, url } = parentSpecOf(m.frontmatter)
  if (!name?.trim()) return null
  const blueprint = blueprintNameOf(name).toLowerCase()
  const token = versionTokenOf(name)
  if (!token) return { blueprint, version: 'unpinned', incomparable: 'unpinned' }
  const classifiable = !url?.trim() || parsePinnedUrl(url) !== null || parseUnversionedBlueprintName(url) !== null
  if (!classifiable) return { blueprint, version: 'unclassifiable-url', incomparable: 'unclassifiable-url' }
  return { blueprint, version: token.toUpperCase() }
}

/**
 * One `BLUEPRINT_VERSION_SKEW` error per bluepriNNt whose models carry two or more distinct
 * pins. A bare name (`unpinned`) and a pin whose `parent_spec.url` cannot be classified are
 * distinct values, never counted as uniform, and are listed under `meta.incomparable`.
 */
export function versionSkew(models: readonly SkewModel[]): LayoutDiagnostic[] {
  const groups = new Map<string, { path: string; version: string; incomparable?: Incomparable; concepts: readonly string[] }[]>()
  for (const m of models) {
    const pin = pinOf(m)
    if (!pin) continue
    const members = groups.get(pin.blueprint) ?? []
    members.push({ path: m.path, version: pin.version, incomparable: pin.incomparable, concepts: m.concepts ?? [] })
    groups.set(pin.blueprint, members)
  }

  const findings: LayoutDiagnostic[] = []
  for (const [blueprint, members] of [...groups].sort(([a], [b]) => byText(a, b))) {
    const byVersion = new Map<string, string[]>()
    for (const { version, path } of members) byVersion.set(version, [...(byVersion.get(version) ?? []), path])
    if (byVersion.size < 2) continue

    const versions = [...byVersion]
      .map(([version, paths]) => ({ version, count: paths.length, paths: [...paths].sort(byText) }))
      .sort((a, b) => b.count - a.count || byText(a.version, b.version))
    const concepts = [...new Set(members.flatMap((m) => m.concepts))].sort(byText)
    const incomparable = members
      .filter((m) => m.incomparable)
      .map((m) => ({ path: m.path, reason: m.incomparable as Incomparable }))
      .sort((a, b) => byText(a.path, b.path))
    const listed = versions
      .map((v) => {
        const preview = v.paths.slice(0, MESSAGE_PATHS).join(', ')
        return `${v.version} (${v.count}: ${preview}${v.paths.length > MESSAGE_PATHS ? '...' : ''})`
      })
      .join(', ')
    const named = concepts.length > 0 ? ` (concepts: ${concepts.join(', ')})` : ''
    findings.push(
      layoutDiagnostic(
        'BLUEPRINT_VERSION_SKEW',
        `bluepriNNt "${blueprint}"${named} - pinned at ${versions.length} versions across ${members.length} models: ${listed}; a domaiNN uses one version per bluepriNNt, run nn-upgrade`,
        members.map((m) => m.path).sort(byText),
        {
          meta: {
            blueprint,
            concepts,
            versions: versions.map((v) => ({ ...v, paths: v.paths.slice(0, META_PATHS) })),
            incomparable,
          },
        },
      ),
    )
  }
  return findings
}
