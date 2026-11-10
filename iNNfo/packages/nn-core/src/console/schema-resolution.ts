/**
 * Shared console schema resolution.
 *
 * Both console producers — the export CLI (`scripts/export-console.mjs`) and the
 * MCP console payload mirror — MUST obtain the `nn-schema` slot from
 * this single function so their schema slots are byte-identical by construction.
 *
 * Resolution owns both steps: (1) resolve the model's Level-2 blueprint through
 * the relocated package tier chain (`resolveBlueprintPackage`) plus the canonical
 * registry fallback, then (2) derive the effective schema via
 * `resolveBlueprintSchema`, pre-collecting every transitive `include` through the
 * same chain. A blueprint that resolves nowhere degrades to the derived slot —
 * it never aborts the export or the build.
 *
 * It also collects the blueprint's `procedures` catalog: the parent's frontmatter
 * `procedures` array, a synthesized `usage` entry when `procedures/usage_procedures_NN.md`
 * ships beside the resolved spec, and the same for every transitive include. The
 * `usage` entry is surfaced first by the console ("Getting started").
 */

import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { parseFrontmatter, parseKnowledge } from '../parser/index.js'
import { resolveBlueprintPackage, parseSpecName, normalizeVersion } from '../resolver.js'
import { findCanonicalBlueprint } from '../schema/canonical-registry.js'
import { resolveBlueprintSchema } from '../schema/compose.js'
import type { BlueprintSchema } from '../schema/extract.js'

export interface ResolveConsoleSchemaOptions {
  rootDir: string
  parentName: string
  parentUrl?: string
  /** Defaults to `INNFO_GLOBAL_DIR` ?? `~/.agents/bluepriNNts`. */
  globalDir?: string
  /** Defaults to `INNFO_SKILLS_DIR` ?? `~/.agents/skills`. */
  skillsDir?: string
}

/** One entry of a blueprint's console procedure catalog. */
export interface ConsoleProcedure {
  id: string
  name: string
  path: string
}

export interface ConsoleCatalog {
  models: Record<string, any>
  voices: Record<string, any>
}

export interface ConsoleSchemaResolution {
  /** The blueprint-derived schema, or `undefined` for the derived fallback. */
  schema: BlueprintSchema | undefined
  /** The resolved blueprint `procedures` catalog (parent + transitive includes). */
  procedures: ConsoleProcedure[]
  schemaSource: 'blueprint' | 'derived'
  warnings: string[]
  catalog?: ConsoleCatalog | null
}

/** A resolved blueprint: its raw content and, when known, its on-disk directory. */
interface ResolvedBlueprint {
  content: string
  dir: string | null
}

/**
 * Resolve one blueprint (or include) to raw content through the shared chain.
 *
 * `parent_spec.name` may carry a version suffix (e.g. `procedures_V_0-3-2`). The
 * exact reference is tried first; if it resolves nowhere we retry by blueprint
 * FAMILY, treating the version as an advisory hint so a document keeps rendering
 * after a blueprint bump. When the referenced version differs from the resolved
 * blueprint's own `blueprint_version`, a warning is pushed (never a silent
 * degrade to the derived schema).
 */
/**
 * Absolute path of the blueprint a `parent_spec.url` names, when that url is a
 * workspace-relative path to an existing file. Null for remote urls, for paths
 * that escape the domaiNN root, and for anything that is not on disk.
 *
 * A local url is the blueprint itself, so it must be read directly: the name
 * tier cannot find it, because a flat spec such as `resources_iNNfo_NN.md`
 * derives the family `resources_innfo`, which matches no blueprint name.
 */
async function resolveLocalSpecPath(rootDir: string, url: string | undefined): Promise<string | null> {
  if (!url || /^(?:https?|data|file):/i.test(url)) return null
  const absolute = isAbsolute(url) ? url : resolve(rootDir, url)
  const rel = relative(rootDir, absolute)
  if (rel.startsWith('..') || isAbsolute(rel)) return null
  return existsSync(absolute) ? absolute : null
}

async function resolveBlueprintContent(
  rootDir: string,
  name: string,
  url: string | undefined,
  globalDir: string | undefined,
  skillsDir: string | undefined,
  warnings: string[],
): Promise<ResolvedBlueprint | null> {
  const local = await resolveLocalSpecPath(rootDir, url)
  if (local !== null) {
    const content = await readFile(local, 'utf-8').catch(() => null)
    if (content !== null) return { content, dir: dirname(local) }
  }

  const version = url ? parseSpecName(basename(url)).version : undefined

  const resolveOnce = async (refName: string): Promise<ResolvedBlueprint | null> => {
    const pkg = await resolveBlueprintPackage(rootDir, refName, version, { globalDir, skillsDir })
    if (pkg) {
      const content = await readFile(pkg.specFilePath, 'utf-8').catch(() => null)
      if (content !== null) return { content, dir: dirname(pkg.specFilePath) }
    }
    const canonical = findCanonicalBlueprint(refName) || (url ? findCanonicalBlueprint(url) : null)
    return canonical ? { content: canonical.specContent, dir: null } : null
  }

  const parsed = parseSpecName(name)
  let resolved = await resolveOnce(name)
  if (resolved === null && parsed.base && parsed.base !== name) {
    resolved = await resolveOnce(parsed.base)
  }
  if (resolved === null) return null

  const rawCurrent = parseFrontmatter(resolved.content)?.blueprint_version
  const current = rawCurrent ? String(rawCurrent) : undefined
  if (parsed.version && current && normalizeVersion(parsed.version) !== normalizeVersion(current)) {
    warnings.push(
      `parent_spec '${name}' references a stale version; the '${parsed.base}' ` +
        `blueprint is now '${current}'. Resolved to the current blueprint — ` +
        `update parent_spec.name to track it.`,
    )
  }
  return resolved
}

/**
 * The blueprint's `procedures` catalog: the frontmatter array plus a synthesized
 * `usage` entry (its `usage_procedures_NN.md`), which always reads first.
 */
function proceduresOf(res: ResolvedBlueprint): ConsoleProcedure[] {
  const fm = parseFrontmatter(res.content)
  const list: ConsoleProcedure[] = Array.isArray(fm?.procedures)
    ? fm.procedures
        .filter((p: any) => p && p.id && p.path)
        .map((p: any) => ({ id: String(p.id), name: String(p.name ?? p.id), path: String(p.path) }))
    : []

  if (res.dir && existsSync(join(res.dir, 'procedures', 'usage_procedures_NN.md'))) {
    if (!list.some((p) => p.id === 'usage')) {
      list.unshift({ id: 'usage', name: 'Getting started', path: 'procedures/usage_procedures_NN.md' })
    }
  }
  return list
}

/**
 * Pre-collect the transitive `includes` closure. `byRef` maps each include name
 * (original and lowercase) to its resolved content/dir for `resolveBlueprintSchema`;
 * `all` is the deduplicated list, in discovery order, for procedure collection.
 */
async function collectIncludes(
  parent: ResolvedBlueprint,
  rootDir: string,
  globalDir: string | undefined,
  skillsDir: string | undefined,
  warnings: string[],
): Promise<{ byRef: Map<string, ResolvedBlueprint>; all: ResolvedBlueprint[] }> {
  const byRef = new Map<string, ResolvedBlueprint>()
  const all: ResolvedBlueprint[] = []
  const seen = new Set<string>()
  const parentFm = parseFrontmatter(parent.content)
  const queue: Array<{ name: string; url: string }> = (parentFm?.includes ?? []).map((ref) => ({
    name: ref.name,
    url: ref.url ?? '',
  }))

  while (queue.length > 0) {
    const ref = queue.shift()!
    const key = ref.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const resolved = await resolveBlueprintContent(rootDir, ref.name, ref.url, globalDir, skillsDir, warnings)
    if (resolved === null) {
      warnings.push(`Included template '${ref.name}' could not be resolved.`)
      continue
    }
    byRef.set(ref.name, resolved)
    byRef.set(key, resolved)
    all.push(resolved)

    const fm = parseFrontmatter(resolved.content)
    for (const nested of fm?.includes ?? []) {
      queue.push({ name: nested.name, url: nested.url ?? '' })
    }
  }

  return { byRef, all }
}

async function resolveCatalog(
  parent: ResolvedBlueprint,
  warnings: string[],
): Promise<ConsoleCatalog | null> {
  const fm = parseFrontmatter(parent.content)
  const catalogRel = fm?.catalog
  if (!catalogRel || typeof catalogRel !== 'string') return null
  if (!parent.dir) {
    warnings.push(`Blueprint declares catalog '${catalogRel}' but has no on-disk directory.`)
    return null
  }
  const catalogPath = isAbsolute(catalogRel) ? catalogRel : resolve(parent.dir, catalogRel)
  if (!existsSync(catalogPath)) {
    warnings.push(`Blueprint catalog '${catalogRel}' not found at '${catalogPath}'.`)
    return null
  }
  try {
    const text = await readFile(catalogPath, 'utf-8')
    const parsed = parseKnowledge(text)
    const collect = (concept: string): Record<string, any> => {
      const out: Record<string, any> = {}
      for (const element of parsed.elements.get(concept) || []) {
        const fields = element.fields || {}
        const slug = String(element.slug || fields.slug || element.name)
        out[slug] = {
          slug,
          name: element.name,
          ...fields,
        }
      }
      return out
    }
    return {
      models: collect('Model'),
      voices: collect('Voice'),
    }
  } catch (err) {
    warnings.push(
      `Blueprint catalog '${catalogRel}' failed to parse: ${err instanceof Error ? err.message : String(err)}`,
    )
    return null
  }
}

/**
 * Resolve a model's parent blueprint and derive the console `schema` slot plus
 * its `procedures` catalog. Never throws: any failure degrades to the derived slot.
 */
export async function resolveConsoleSchema(
  opts: ResolveConsoleSchemaOptions,
): Promise<ConsoleSchemaResolution> {
  const warnings: string[] = []
  try {
    const parent = await resolveBlueprintContent(
      opts.rootDir,
      opts.parentName,
      opts.parentUrl,
      opts.globalDir,
      opts.skillsDir,
      warnings,
    )
    if (parent === null) {
      warnings.push(
        `Schema resolution for parent_spec '${opts.parentName}' not found; derived schema used.`,
      )
      return { schema: undefined, procedures: [], schemaSource: 'derived', warnings, catalog: null }
    }

    const includes = await collectIncludes(
      parent,
      opts.rootDir,
      opts.globalDir,
      opts.skillsDir,
      warnings,
    )

    const { schema, errors } = resolveBlueprintSchema(parent.content, (ref) => {
      const hit = includes.byRef.get(ref.name) ?? includes.byRef.get(ref.name.toLowerCase())
      return hit ? hit.content : null
    })
    for (const e of errors) warnings.push(`[compose] ${e.message}`)

    const procedures: ConsoleProcedure[] = [
      ...proceduresOf(parent),
      ...includes.all.flatMap((inc) => proceduresOf(inc)),
    ]

    const catalog = await resolveCatalog(parent, warnings)

    return { schema, procedures, schemaSource: 'blueprint', warnings, catalog }
  } catch (err) {
    warnings.push(`Schema resolution warning: ${err instanceof Error ? err.message : String(err)}`)
    return { schema: undefined, procedures: [], schemaSource: 'derived', warnings, catalog: null }
  }
}
