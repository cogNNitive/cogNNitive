/**
 * Shared console schema resolution.
 *
 * Both console producers — the export CLI (`scripts/export-console.mjs`) and the
 * MCP `build_console_payload` tool — MUST obtain the `innfo-schema` slot from
 * this single function so their schema slots are byte-identical by construction.
 *
 * Resolution owns both steps: (1) resolve the model's Level-2 blueprint through
 * the relocated package tier chain (`resolveBlueprintPackage`) plus the canonical
 * registry fallback, then (2) derive the effective schema via
 * `resolveBlueprintSchema`, pre-collecting every transitive `include` through the
 * same chain. A blueprint that resolves nowhere degrades to the derived slot —
 * it never aborts the export or the build.
 */

import { basename } from 'node:path'
import { readFile } from 'node:fs/promises'
import { parseFrontmatter } from '../parser/index.js'
import { resolveBlueprintPackage, parseSpecName } from '../resolver.js'
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

export interface ConsoleSchemaResolution {
  /** The blueprint-derived schema, or `undefined` for the derived fallback. */
  schema: BlueprintSchema | undefined
  schemaSource: 'blueprint' | 'derived'
  warnings: string[]
}

/** Resolve one blueprint (or include) to raw content through the shared chain. */
async function resolveBlueprintContent(
  rootDir: string,
  name: string,
  url: string | undefined,
  globalDir: string | undefined,
  skillsDir: string | undefined,
): Promise<string | null> {
  const version = url ? parseSpecName(basename(url)).version : undefined
  const pkg = await resolveBlueprintPackage(rootDir, name, version, { globalDir, skillsDir })
  if (pkg) {
    const content = await readFile(pkg.specFilePath, 'utf-8').catch(() => null)
    if (content !== null) return content
  }
  const canonical = findCanonicalBlueprint(name) || (url ? findCanonicalBlueprint(url) : null)
  return canonical ? canonical.specContent : null
}

/**
 * Pre-collect the transitive `includes` closure into a `name → raw content` map,
 * resolving every entry through the same tier chain as the parent. Keys are
 * stored in both original and lowercase form so `resolveBlueprintSchema`'s
 * case-insensitive include lookups hit.
 */
async function collectIncludes(
  parentContent: string,
  rootDir: string,
  globalDir: string | undefined,
  skillsDir: string | undefined,
  warnings: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const seen = new Set<string>()
  const parentFm = parseFrontmatter(parentContent)
  const queue: Array<{ name: string; url: string }> = (parentFm?.includes ?? []).map((ref) => ({
    name: ref.name,
    url: ref.url ?? '',
  }))

  while (queue.length > 0) {
    const ref = queue.shift()!
    const key = ref.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    const content = await resolveBlueprintContent(rootDir, ref.name, ref.url, globalDir, skillsDir)
    if (content === null) {
      warnings.push(`Included template '${ref.name}' could not be resolved.`)
      continue
    }
    out.set(ref.name, content)
    out.set(key, content)

    const fm = parseFrontmatter(content)
    for (const nested of fm?.includes ?? []) {
      queue.push({ name: nested.name, url: nested.url ?? '' })
    }
  }

  return out
}

/**
 * Resolve a model's parent blueprint and derive the console `schema` slot.
 * Never throws: any failure degrades to `{ schema: undefined, schemaSource: 'derived' }`.
 */
export async function resolveConsoleSchema(
  opts: ResolveConsoleSchemaOptions,
): Promise<ConsoleSchemaResolution> {
  const warnings: string[] = []
  try {
    const parentContent = await resolveBlueprintContent(
      opts.rootDir,
      opts.parentName,
      opts.parentUrl,
      opts.globalDir,
      opts.skillsDir,
    )
    if (parentContent === null) {
      warnings.push(
        `Schema resolution for parent_spec '${opts.parentName}' not found; derived schema used.`,
      )
      return { schema: undefined, schemaSource: 'derived', warnings }
    }

    const includes = await collectIncludes(
      parentContent,
      opts.rootDir,
      opts.globalDir,
      opts.skillsDir,
      warnings,
    )

    const { schema, errors } = resolveBlueprintSchema(parentContent, (ref) => {
      return includes.get(ref.name) ?? includes.get(ref.name.toLowerCase()) ?? null
    })
    for (const e of errors) warnings.push(`[compose] ${e.message}`)

    return { schema, schemaSource: 'blueprint', warnings }
  } catch (err) {
    warnings.push(`Schema resolution warning: ${err instanceof Error ? err.message : String(err)}`)
    return { schema: undefined, schemaSource: 'derived', warnings }
  }
}
