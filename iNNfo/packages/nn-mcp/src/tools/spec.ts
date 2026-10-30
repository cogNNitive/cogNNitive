/**
 * get_spec and get_template tools.
 *
 * The MCP is publisher-agnostic: it never stores spec/template URLs or
 * template names as constants. A spec/template is resolved ONLY from:
 *   1. an explicit `url` supplied by the caller, or
 *   2. the `parent_spec.url` declared by a loaded model (`model_id`).
 *
 * Resolution runs through `resolveParentChain` (nn-core), which walks
 * the self-describing parent chain up to level 0, caching locally.
 */

import { join, basename, dirname, resolve, relative } from 'node:path'
import { readFile, stat } from 'node:fs/promises'
import {
  getBlueprint as coreGetBlueprint,
  getFormatSpec,
  parseFrontmatter,
  SpecResolutionError,
  resolveBlueprintPath,
  getBlueprintSearchPaths,
  UnresolvedBlueprintError,
  isProcedureDocument,
  procedureIdOf,
  resolveProcedures,
  buildModelIndex,
  resolveModelId,
  isDomainRoot,
} from '@cognnitive/nn-core'
import { listScopedProcedures } from './scoped-procedures.js'
import type { ScopedProceduresResult } from './scoped-procedures.js'
import type { PackageOptions } from './floor-doc.js'
import { mkdir, copyFile, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import type {
  SpecDocument,
  SpecCache,
  TemplateProcedure,
  ProcedureDef,
  TemplateSkill,
  SpecFrontmatter,
} from '@cognnitive/nn-core'
import {
  resolveParentChainNode,
  resolveBlueprintPackage,
  hydrateBlueprintPackageAtomically,
  fetchSpecContent,
  isLocalPath,
  toLocalFilePath,
  parseSpecName,
  findSpecInPackageDir,
} from './resolver-node.js'
import type { FreshnessResult, ResolvedCache } from './resolver-node.js'

/**
 * Derive a chain-start name from a spec/template URL.
 * `.../iNNfo_V_0-1-0_NN.md` → `iNNfo_V_0-1-0`.
 * A `spec_NN.md` package is named by its folder (above any `V_x` dir):
 * `.../business/V_0-4-1/spec_NN.md` → `business`.
 */
export function deriveNameFromUrl(url: string): string {
  const stem = basename(url)
    .replace(/\.(md|markdown)$/i, '')
    .replace(/_(NN|FORMAT|F)$/i, '')
  if (basename(url).toLowerCase() !== 'spec_nn.md') return stem
  // Drop the scheme+host, then any empty/'.'/'..' segment: only real folders can name a blueprint.
  const parts = url
    .replace(/^[a-z][a-z0-9+.-]*:[/][/][^/]*/i, '')
    .split(/[/\x5c]/)
    .slice(0, -1)
    .filter((seg) => seg && seg !== '.' && seg !== '..')
  const leaf = parts.pop()
  if (leaf && !/^V_/i.test(leaf)) return leaf
  return (leaf && parts.pop()) || stem
}

import { normalizeId } from './list-read.js'
import { isSafeRelativeId } from './path-guard.js'

export { normalizeId }

/**
 * Locate a kNNowledge document on disk by id.
 *
 * Searches the root directory, `kNNowledge/` and the conventional `kNNowledge/` subdirectory.
 * Supports nested relative paths (e.g. `subsystems/auth/tokens_NN.md`).
 */
export class AmbiguousModelIdError extends Error {
  readonly code = 'AMBIGUOUS_MODEL_ID'
  readonly id: string
  readonly candidates: string[]
  constructor(id: string, candidates: string[]) {
    super(`Model id "${id}" is ambiguous. Candidates: ${candidates.join(', ')}`)
    this.name = 'AmbiguousModelIdError'
    this.id = id
    this.candidates = candidates
  }
}

async function collectDomainFiles(
  dir: string,
  rootDir: string,
  relPaths: string[],
  opts?: { includeSpecs?: boolean },
  depth = 0,
): Promise<void> {
  if (depth > 8) return
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const nameLower = entry.name.toLowerCase()
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.')) continue
      const skip = opts?.includeSpecs
        ? ['node_modules', '.git', 'dist', '.spec-cache', 'backups', 'archive']
        : ['node_modules', '.git', 'dist', '.spec-cache', 'specs', 'backups', 'archive']
      if (skip.includes(nameLower)) continue
      const child = join(dir, entry.name)
      if (isDomainRoot(child)) continue

      await collectDomainFiles(child, rootDir, relPaths, opts, depth + 1)
      continue
    }
    if (!entry.isFile()) continue
    if (entry.name.startsWith('.')) continue
    const rel = relative(rootDir, join(dir, entry.name)).replace(/\\/g, '/')
    relPaths.push(rel)
  }
}

/**
 * Locate a kNNowledge document on disk by id.
 *
 * Implements Option A of contextual-resolution L2.4:
 * Resolves bare stems when unique across the domaiNN; accepts domain-relative paths;
 * throws AmbiguousModelIdError when a bare stem collides across documents.
 */
export async function findKnowledgeFile(
  rootDir: string,
  id: string,
  opts?: { includeSpecs?: boolean },
): Promise<string | null> {
  if (!isSafeRelativeId(id)) return null
  const relPaths: string[] = []
  await collectDomainFiles(rootDir, rootDir, relPaths, opts)
  const index = buildModelIndex(relPaths)
  const resolution = resolveModelId(index, id)
  if (resolution.ok) {
    return join(rootDir, resolution.path)
  }
  if (resolution.code === 'AMBIGUOUS_MODEL_ID') {
    throw new AmbiguousModelIdError(id, [...resolution.candidates])
  }
  return null
}

/**
 * Read a model's `parent_spec` reference ({ url, name }) from disk.
 * Returns null when the model is missing or declares no resolvable parent.
 */
export async function readParentSpecUrl(
  rootDir: string,
  modelId: string,
): Promise<{ url: string; name: string } | null> {
  let filePath: string | null = null
  try {
    filePath = await findKnowledgeFile(rootDir, modelId)
  } catch {
    return null
  }
  if (!filePath) return null
  const content = await readFile(filePath, 'utf-8').catch(() => null)
  if (!content) return null
  const fm = parseFrontmatter(content)
  const url = fm?.parent_spec?.url
  const name = fm?.parent_spec?.name
  return url && name ? { url, name } : null
}

/**
 * Cache options for template/spec resolution: fetched content lands in the OS
 * temp cache by default; `inPlace: true` restores in-tree `specs/` writes.
 */
export interface ResolveCacheOptions {
  checkFreshness?: boolean
  cacheDir?: string
  inPlace?: boolean
}

/**
 * Get the iNNfo specification (level-1) for a spec/template URL or a model.
 *
 * @param opts.url     Explicit spec/template URL to resolve from.
 * @param opts.modelId Model id whose `parent_spec.url` seeds resolution.
 *
 * Returns `{ spec: null, specCache: null }` when neither input is provided.
 */
export async function getSpec(
  rootDir: string,
  opts: { url?: string; modelId?: string },
  cacheOpts?: ResolveCacheOptions,
): Promise<{ spec: SpecDocument | null; specCache: SpecCache | null }> {
  let url = opts.url
  let name: string | undefined

  if (!url && opts.modelId) {
    const parent = await readParentSpecUrl(rootDir, opts.modelId)
    if (parent) {
      url = parent.url
      name = parent.name
    }
  }

  if (!url) return { spec: null, specCache: null }
  if (!name) name = deriveNameFromUrl(url)

  try {
    const cache = await resolveParentChainNode(rootDir, url, name, cacheOpts)
    // get_spec always returns the level-1 iNNfo spec from the resolved chain,
    // falling back to the requested document when no level-1 is present.
    const spec = getFormatSpec(cache) ?? cache.specs.get(name) ?? null
    return { spec, specCache: cache }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'SpecResolutionError' || err instanceof SpecResolutionError)
    ) {
      throw err
    }
    return { spec: null, specCache: null }
  }
}

/**
 * Resolve a template document directly from a URL — the model's own
 * `parent_spec.url` is the source of truth. No hardcoded names or base URLs.
 */
export async function getBlueprintFromUrl(
  rootDir: string,
  url: string,
  name: string,
  cacheOpts?: ResolveCacheOptions,
): Promise<SpecDocument | null> {
  try {
    const cache = await resolveParentChainNode(rootDir, url, name, cacheOpts)
    // Prefer a level-2/3 template from the walked chain; fall back to
    // whatever was resolved for the requested name itself (e.g. a level-1
    // spec requested directly) — it's already in `cache.specs`, no need to
    // re-read anything from disk.
    return coreGetBlueprint(cache) ?? cache.specs.get(name) ?? null
  } catch (err) {
    // Surface the actionable resolution detail (searched locations) to the
    // caller so validate_model output can include it; other failures keep the
    // null fallback behavior.
    if (
      err instanceof Error &&
      (err.name === 'SpecResolutionError' || err instanceof SpecResolutionError)
    ) {
      throw err
    }
    return null
  }
}

/**
 * Like `getBlueprintFromUrl`, but also returns the full resolved `SpecCache`
 * (parent chain + every `includes` target) and an `IncludeResolver` bound to
 * it — so a caller can pass template composition through to nn-core's
 * `validateKnowledge` / `resolveBlueprintSchema` without re-reading anything.
 */
export async function resolveBlueprintWithCache(
  rootDir: string,
  url: string,
  name: string,
  options?: ResolveCacheOptions,
): Promise<{
  template: SpecDocument | null
  cache: SpecCache | null
  resolveInclude: (ref: { name: string; url: string }) => string | null
  freshness: FreshnessResult | null
}> {
  let cache: ResolvedCache | null = null
  try {
    cache = await resolveParentChainNode(rootDir, url, name, options)
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'SpecResolutionError' || err instanceof SpecResolutionError)
    ) {
      throw err
    }
    cache = null
  }
  const template = cache ? (coreGetBlueprint(cache) ?? cache.specs.get(name) ?? null) : null
  const resolveInclude = (ref: { name: string; url: string }): string | null => {
    if (!cache) return null
    const direct = cache.specs.get(ref.name)
    if (direct) return direct.rawContent
    for (const doc of cache.specs.values()) {
      if (doc.name.toLowerCase() === ref.name.toLowerCase()) return doc.rawContent
    }
    return null
  }
  const freshness = cache?.freshness?.get(name) ?? null
  return { template, cache, resolveInclude, freshness }
}

/**
 * Resolve a template from a loaded model, deriving the URL from its
 * `parent_spec.url`. Returns null when the model declares no parent.
 */
export async function getBlueprintFromModel(
  rootDir: string,
  modelId: string,
  cacheOpts?: ResolveCacheOptions,
): Promise<SpecDocument | null> {
  const parent = await readParentSpecUrl(rootDir, modelId)
  if (!parent) return null
  return getBlueprintFromUrl(rootDir, parent.url, parent.name, cacheOpts)
}

export interface BlueprintCatalogVersion {
  blueprint_version: string
  spec_version: string | null
  title: string | null
  url: string
}

/** One entry of `iNNfo/specs/bluepriNNts/catalog.json` (Level 2 catalog). */
export interface BlueprintCatalogEntry {
  name: string
  adopted: string
  tier: 'core' | 'free' | 'paid'
  access: 'public' | 'authenticated'
  when_to_use: string | null
  release_tag: string
  embedded_skills?: string[]
  versions?: BlueprintCatalogVersion[]
}

export interface BlueprintCatalog {
  generator?: string
  blueprints: Record<string, BlueprintCatalogEntry>
  frozen?: Record<string, BlueprintCatalogEntry>
  warnings?: string[]
}

/**
 * Load the Level-2 blueprint catalog. Precedence: an explicit parsed catalog,
 * then an explicit path, then the conventional repository paths. Returns null
 * when no catalog is reachable — discovery then degrades to local-only.
 */
async function loadCatalog(
  rootDir: string,
  opts?: { catalog?: BlueprintCatalog; catalogPath?: string },
): Promise<BlueprintCatalog | null> {
  if (opts?.catalog) return opts.catalog
  const envPath = process.env.INNFO_BLUEPRINT_CATALOG
  const candidates = opts?.catalogPath
    ? [opts.catalogPath]
    : [
        ...(envPath ? [envPath] : []),
        join(rootDir, 'iNNfo', 'specs', 'bluepriNNts', 'catalog.json'),
        join(rootDir, 'specs', 'bluepriNNts', 'catalog.json'),
      ]
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(await readFile(candidate, 'utf-8')) as BlueprintCatalog
      if (parsed && parsed.blueprints) return parsed
    } catch {
      // unreadable / absent catalog — try the next candidate
    }
  }
  return null
}

/** Case-insensitive lookup of a catalog entry by blueprint name. */
function catalogEntryFor(
  catalog: BlueprintCatalog | null,
  name: string,
): BlueprintCatalogEntry | undefined {
  if (!catalog) return undefined
  const wanted = name.toLowerCase()
  for (const [key, entry] of Object.entries(catalog.blueprints ?? {})) {
    if (key.toLowerCase() === wanted || entry.name.toLowerCase() === wanted) return entry
  }
  for (const [key, entry] of Object.entries(catalog.frozen ?? {})) {
    if (key.toLowerCase() === wanted || entry.name.toLowerCase() === wanted) return entry
  }
  return undefined
}

export interface DiscoveredBlueprint {
  name: string
  version: string
  source: 'workspace' | 'global' | 'catalog' | string
  /** True when the blueprint is present on disk (or embedded as a Core blueprint). */
  installed: boolean
  tier: 'core' | 'free' | 'paid'
  access: 'public' | 'authenticated'
  when_to_use?: string | null
  embedded_skills?: string[]
  filePath?: string
  skillName?: string
}

export async function listBlueprints(
  rootDir: string,
  opts?: {
    globalDir?: string
    skillsDir?: string
    catalog?: BlueprintCatalog
    catalogPath?: string
  },
): Promise<DiscoveredBlueprint[]> {
  const globalDir = opts?.globalDir ?? join(homedir(), '.agents', 'bluepriNNts')
  const skillsDir = opts?.skillsDir ?? join(homedir(), '.agents', 'skills')

  const discovered: DiscoveredBlueprint[] = []
  const seenNames = new Set<string>()

  const scanDir = async (
    dir: string,
    source: 'workspace' | 'global' | 'skill',
    skillName?: string,
  ) => {
    try {
      const files = await readdir(dir, { withFileTypes: true })
      for (const file of files) {
        if (file.isFile() && file.name.endsWith('.md')) {
          const filePath = join(dir, file.name)
          const stem = file.name.replace(/\.md$/i, '')
          if (seenNames.has(stem)) continue
          seenNames.add(stem)

          let version = 'V_0-1-0'
          try {
            const content = await readFile(filePath, 'utf-8')
            const fm = parseFrontmatter(content)
            if (fm?.blueprint_version) version = String(fm.blueprint_version)
            else if (fm?.version) version = String(fm.version)
            else if (fm?.spec_version) version = String(fm.spec_version)
          } catch (err) {
            // swallow deliberately: an unreadable template falls back to the
            // default version — version is advisory metadata.
            console.warn(`[spec] Failed to read frontmatter of ${filePath}: ${err}`)
          }

          discovered.push({
            name: stem,
            version,
            source: source === 'skill' ? `skill:${skillName}` : source,
            installed: true,
            tier: 'free',
            access: 'public',
            filePath,
            ...(skillName ? { skillName } : {}),
          })
        } else if (file.isDirectory()) {
          const skip = [
            'node_modules',
            '.git',
            'dist',
            '.spec-cache',
            'backups',
            'archive',
            'samples',
            'procedures',
            'assets',
            'web',
          ]
          if (!skip.includes(file.name.toLowerCase())) {
            const pkgDir = join(dir, file.name)
            const specFile = await findSpecInPackageDir(pkgDir, file.name)
            if (specFile && !seenNames.has(file.name)) {
              seenNames.add(file.name)
              let version = 'V_0-1-0'
              try {
                const content = await readFile(specFile, 'utf-8')
                const fm = parseFrontmatter(content)
                if (fm?.blueprint_version) version = String(fm.blueprint_version)
                else if (fm?.version) version = String(fm.version)
                else if (fm?.spec_version) version = String(fm.spec_version)
              } catch (_) {
                /* unreadable/invalid frontmatter — fall back to the default version */
              }
              discovered.push({
                name: file.name,
                version,
                source: source === 'skill' ? `skill:${skillName}` : source,
                installed: true,
                tier: 'free',
                access: 'public',
                filePath: specFile,
                ...(skillName ? { skillName } : {}),
              })
            }
          }
        }
      }
    } catch (err) {
      // swallow deliberately: a tier directory may legitimately not exist.
      if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        console.warn(`[spec] Failed to scan template tier dir: ${err}`)
      }
    }
  }

  await scanDir(join(rootDir, 'specs', 'bluepriNNts'), 'workspace')
  await scanDir(join(rootDir, 'specs'), 'workspace')
  await scanDir(globalDir, 'global')

  try {
    const skillEntries = await readdir(skillsDir, { withFileTypes: true })
    for (const entry of skillEntries) {
      if (entry.isDirectory()) {
        await scanDir(join(skillsDir, entry.name, 'bluepriNNts'), 'skill', entry.name)
        await scanDir(join(skillsDir, entry.name), 'skill', entry.name)
      }
    }
  } catch (err) {
    // swallow deliberately: no skills directory installed — skip the skill tier.
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn(`[spec] Failed to scan skills dir ${skillsDir}: ${err}`)
    }
  }

  // Merge catalog state: enrich every discovered local blueprint with its
  // catalog metadata, then add every catalog blueprint that is not on disk as
  // an installable (installed:false) entry. Core blueprints are embedded in the
  // registry, so they report installed:true even when absent from disk.
  const catalog = await loadCatalog(rootDir, opts)
  if (catalog) {
    const byName = new Map(discovered.map((d) => [d.name.toLowerCase(), d]))
    for (const entry of Object.values(catalog.blueprints ?? {})) {
      const existing = byName.get(entry.name.toLowerCase())
      if (existing) {
        existing.tier = entry.tier
        existing.access = entry.access
        existing.when_to_use = entry.when_to_use ?? null
        if (entry.embedded_skills) existing.embedded_skills = entry.embedded_skills
      } else {
        discovered.push({
          name: entry.name,
          version: entry.adopted,
          source: 'catalog',
          installed: entry.tier === 'core',
          tier: entry.tier,
          access: entry.access,
          when_to_use: entry.when_to_use ?? null,
          ...(entry.embedded_skills ? { embedded_skills: entry.embedded_skills } : {}),
        })
        seenNames.add(entry.name)
      }
    }
  }

  return discovered
}
export interface HydrateBlueprintResult {
  success: boolean
  templateName: string
  targetPath: string
  source: string
  message?: string
  /** Exact command to install an uninstalled catalog blueprint (single writer). */
  installCommand?: string
}

export async function hydrateBlueprint(
  rootDir: string,
  templateName: string,
  opts?: {
    targetDir?: string
    globalDir?: string
    skillsDir?: string
    catalog?: BlueprintCatalog
    catalogPath?: string
    token?: string
    repo?: string
    ref?: string
  },
): Promise<HydrateBlueprintResult> {
  const parsed = parseSpecName(templateName)
  if (parsed.base === 'domainn' && !parsed.version) {
    throw new UnresolvedBlueprintError(templateName, [
      'Versionless hydration for domaiNN is not allowed; specify a versioned blueprint name or ref',
    ])
  }

  const globalBlueprintsDir = opts?.globalDir ?? join(homedir(), '.agents', 'bluepriNNts')
  const skillsDir = opts?.skillsDir ?? join(homedir(), '.agents', 'skills')

  const pkg = await resolveBlueprintPackage(rootDir, templateName, undefined, {
    globalDir: globalBlueprintsDir,
    skillsDir,
  })

  if (pkg) {
    let content = ''
    try {
      content = await readFile(pkg.specFilePath, 'utf-8')
    } catch (err) {
      // swallow deliberately: an unreadable spec file yields empty content and
      // the caller reports it as unresolved.
      console.warn(`[spec] Failed to read spec ${pkg.specFilePath}: ${err}`)
    }

    const sourceName =
      pkg.tier === 'global-cache'
        ? 'global'
        : pkg.tier === 'installed-skill'
          ? 'skill'
          : pkg.tier === 'workspace-package' || pkg.tier === 'workspace-flat'
            ? 'workspace'
            : pkg.tier

    if (content) {
      if (opts?.targetDir || !pkg.isPackageDir) {
        const targetDir = opts?.targetDir ?? join(rootDir, 'specs', 'bluepriNNts')
        await mkdir(targetDir, { recursive: true })
        const fileName = templateName.endsWith('.md') ? templateName : `${templateName}.md`
        const targetPath = join(targetDir, fileName)
        try {
          await stat(targetPath)
          return {
            success: true,
            templateName,
            targetPath,
            source: sourceName,
            message: `Blueprint ${templateName} already present at ${targetPath} (write-once cache immutability)`,
          }
        } catch (err) {
          /* v8 ignore start */
          if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
            console.warn(`[spec] Failed to stat target path ${targetPath}: ${err}`)
          }
          /* v8 ignore stop */
          await copyFile(pkg.specFilePath, targetPath)
          return {
            success: true,
            templateName,
            targetPath,
            source: sourceName,
            message: `Hydrated blueprint ${templateName} from ${sourceName} to ${targetPath}`,
          }
        }
      }

      // Default: hydrate into workspace package directory specs/bluepriNNts/<name>/<version>/
      const targetPkgDir = await hydrateBlueprintPackageAtomically(
        rootDir,
        pkg.name,
        pkg.version,
        content,
      )
      return {
        success: true,
        templateName,
        targetPath: targetPkgDir,
        source: sourceName,
        message: `Hydrated blueprint package ${templateName} (${pkg.version}) from ${sourceName} to ${targetPkgDir}`,
      }
    }
  }

  const location = await resolveBlueprintPath(templateName, {
    workspaceDir: rootDir,
    globalBlueprintsDir,
    skillsDir,
  })

  if (!location) {
    // On-demand hydration is owned by the skills-manager CLI: it is the single
    // writer of bluepriNNt packages and their embedded skills. This tool fetches
    // nothing, projects nothing and writes no state — it returns the exact command
    // for the user to run. Once installed, the global-cache tier resolves it.
    const catalog = await loadCatalog(rootDir, opts)
    const entry = catalogEntryFor(catalog, parsed.base)
    if (entry) {
      const installCommand = `node ~/.agents/skills/nn-skills-lifecycle/scripts/skills-manager.js install --blueprint ${entry.name}`
      return {
        success: false,
        templateName,
        targetPath: '',
        source: 'catalog',
        installCommand,
        message:
          `Blueprint "${entry.name}" is not installed. Install it with:\n  ${installCommand}`,
      }
    }

    const checkedPaths = await getBlueprintSearchPaths(templateName, {
      workspaceDir: rootDir,
      globalBlueprintsDir,
      skillsDir,
    })
    throw new UnresolvedBlueprintError(templateName, checkedPaths)
  }

  const targetDir = opts?.targetDir ?? join(rootDir, 'specs', 'bluepriNNts')
  await mkdir(targetDir, { recursive: true })

  const fileName = templateName.endsWith('.md') ? templateName : `${templateName}.md`
  const targetPath = join(targetDir, fileName)

  try {
    await stat(targetPath)
    return {
      success: true,
      templateName,
      targetPath,
      source: location.source,
      message: `Blueprint ${templateName} already present at ${targetPath} (write-once cache immutability)`,
    }
  } catch (err) {
    /* v8 ignore start */
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn(`[spec] Failed to stat target path ${targetPath}: ${err}`)
    }
    /* v8 ignore stop */
    await copyFile(location.filePath, targetPath)
  }

  return {
    success: true,
    templateName,
    targetPath,
    source: location.source,
    message: `Hydrated blueprint ${templateName} from ${location.source} to ${targetPath}`,
  }
}

export interface ListBlueprintProceduresOptions {
  model_path?: string
  model_id?: string
  blueprint_name?: string
  version?: string
  url?: string
}

export interface ListBlueprintSkillsOptions {
  model_path?: string
  model_id?: string
  blueprint_name?: string
  version?: string
  url?: string
}

/** A skill shipped inside a bluepriNNt package under `skills/<name>/`. */
export interface EmbeddedBlueprintSkill {
  /** Folder name under skills/ (also the install destination name) */
  name: string
  /** Owning bluepriNNt name */
  source_blueprint: string
  embedded: true
  /** Absolute resolved skill directory */
  path: string
  /** SKILL.md frontmatter `version` */
  version?: string
  /** SKILL.md frontmatter `description` */
  description?: string
}

/**
 * A procedure found in a bluepriNNt package chain. A procedure that loses a name clash with
 * a nearer package is not dropped: it is reported as `shadowed`, naming the winner's package.
 */
export interface ListedTemplateProcedure extends TemplateProcedure {
  status: 'selected' | 'shadowed'
  /** `shadowed` entries: the package (`source_template`) of the entry that wins. */
  shadowed_by?: string
}

interface DiscoveredAssets {
  procedures: ListedTemplateProcedure[]
  skills: Array<TemplateSkill | EmbeddedBlueprintSkill>
}

/** Package name for a spec file: the package folder (above any V_x dir) for spec_NN.md, else the doc name. */
function blueprintOwnerName(templateDir: string, docName: string): string {
  if (docName.toLowerCase() !== 'spec_nn') return docName
  const leaf = basename(templateDir)
  return /^V_/i.test(leaf) ? basename(dirname(templateDir)) : leaf
}

export async function discoverTransitiveAssets(
  rootDir: string,
  opts?: ListBlueprintProceduresOptions,
): Promise<DiscoveredAssets> {
  const specsDir = join(rootDir, 'specs')
  const queue: Array<{
    docName: string
    fm: SpecFrontmatter
    depth: number
    filePath?: string
  }> = []

  let modelId = opts?.model_id
  if (!modelId && opts?.model_path) {
    modelId = opts.model_path
  }

  if (modelId) {
    let filePath: string | null = null
    try {
      filePath =
        (await findKnowledgeFile(rootDir, modelId)) ??
        (isLocalPath(modelId) ? toLocalFilePath(modelId, rootDir) : null)
    } catch {
      filePath = isLocalPath(modelId) ? toLocalFilePath(modelId, rootDir) : null
    }
    if (filePath) {
      const content = await readFile(filePath, 'utf-8').catch(() => null)
      if (content) {
        const fm = parseFrontmatter(content)
        if (fm) {
          queue.push({ docName: basename(filePath, '.md'), fm, depth: 0, filePath })
        }
      }
    }
  }

  if (opts?.blueprint_name) {
    const pkg = await resolveBlueprintPackage(rootDir, opts.blueprint_name, opts.version)
    if (pkg) {
      const content = await readFile(pkg.specFilePath, 'utf-8').catch(() => null)
      if (content) {
        const fm = parseFrontmatter(content)
        if (fm) {
          queue.push({
            docName: basename(pkg.specFilePath, '.md') || opts.blueprint_name || pkg.name,
            fm,
            depth: 0,
            filePath: pkg.specFilePath,
          })
        }
      }
    }
  }

  if (opts?.url) {
    const name = opts.blueprint_name || deriveNameFromUrl(opts.url)
    const content = await fetchSpecContent(name, opts.url, specsDir, 10000)
    if (content) {
      const fm = parseFrontmatter(content)
      if (fm) {
        queue.push({ docName: name, fm, depth: 0 })
      }
    }
  }

  if (queue.length === 0) {
    const templates = await listBlueprints(rootDir)
    for (const tmpl of templates) {
      if (!tmpl.filePath) continue // catalog-only entries have no on-disk spec
      const content = await readFile(tmpl.filePath, 'utf-8').catch(() => null)
      if (content) {
        const fm = parseFrontmatter(content)
        if (fm) {
          queue.push({ docName: tmpl.name, fm, depth: 0, filePath: tmpl.filePath })
        }
      }
    }
  }

  // Every procedure found, in discovery order (nearest package first). A definition repeated
  // inside one package (frontmatter entry plus its on-disk document, the same file) is one declaration;
  // a clash between packages is resolved by nn-core `resolveProcedures` after the walk.
  const found: Array<{ proc: TemplateProcedure; def: ProcedureDef }> = []
  const skills: Array<TemplateSkill | EmbeddedBlueprintSkill> = []
  const seenSkillNames = new Set<string>()
  const seenBlueprints = new Set<string>()

  while (queue.length > 0) {
    const item = queue.shift()!
    const key = item.docName.toLowerCase()
    if (seenBlueprints.has(key) || item.depth > 10) continue
    seenBlueprints.add(key)

    const fm = item.fm
    // A spec_NN.md package is named by its folder, not by the file stem.
    const ownerName = item.filePath
      ? blueprintOwnerName(dirname(item.filePath), item.docName)
      : item.docName

    // A declaration is its id plus its document: only the same file seen twice (frontmatter entry
    // and on-disk document) is one declaration. The same id at another path is a second definition.
    const packageDocs = new Set<string>()
    const docKey = (id: string, path: string): string => `${id}\0${path.replaceAll('\\', '/').replace(/^\.\//, '')}`
    const addProcedure = (proc: TemplateProcedure): void => {
      packageDocs.add(docKey(proc.id, proc.path))
      found.push({
        proc,
        def: { id: proc.id, scope: proc.source_template ?? ownerName, doc: proc.path, version: null, slots: [] },
      })
    }

    if (Array.isArray(fm.procedures)) {
      for (const p of fm.procedures) {
        if (p && typeof p === 'object' && p.id && !packageDocs.has(docKey(String(p.id), String(p.path ?? '')))) {
          addProcedure({
            id: String(p.id),
            name: String(p.name ?? p.id),
            path: String(p.path ?? ''),
            source_template: p.source_template ? String(p.source_template) : ownerName,
          })
        }
      }
    }

    // Discover procedures from on-disk procedures/ folder if present
    let templateDir: string | null = null
    if (item.filePath) {
      templateDir = dirname(item.filePath)
    } else {
      const pkg = await resolveBlueprintPackage(rootDir, item.docName)
      if (pkg) {
        templateDir = pkg.isPackageDir ? pkg.packagePath : dirname(pkg.specFilePath)
      }
    }

    if (templateDir) {
      const procsDir = join(templateDir, 'procedures')
      try {
        const procEntries = await readdir(procsDir, { withFileTypes: true })
        for (const pe of procEntries) {
          if (pe.isFile() && isProcedureDocument(pe.name)) {
            const procStem = pe.name.replace(/\.md$/i, '')
            const procId = procedureIdOf(pe.name)
            if (!packageDocs.has(docKey(procId, `procedures/${pe.name}`))) {
              let procName = procStem
                .replace(/_NN$/i, '')
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase())
              try {
                const procContent = await readFile(join(procsDir, pe.name), 'utf-8')
                const procFm = parseFrontmatter(procContent)
                if (procFm?.title) procName = String(procFm.title)
                else if (procFm?.name) procName = String(procFm.name)
              } catch (_) {
                /* unreadable/invalid frontmatter — fall back to the default name */
              }
              addProcedure({
                id: procId,
                name: procName,
                path: `procedures/${pe.name}`,
                source_template: blueprintOwnerName(templateDir, item.docName),
              })
            }
          }
        }
      } catch (_) {
        /* procedures directory unreadable — skip discovery for this template */
      }

      // Embedded skills: on-disk skills/<name>/SKILL.md is canonical (wins over frontmatter skills:)
      const skillsDir = join(templateDir, 'skills')
      try {
        const skillEntries = await readdir(skillsDir, { withFileTypes: true })
        for (const se of skillEntries) {
          if (!se.isDirectory() || se.name.startsWith('.') || se.name === 'node_modules') continue
          if (seenSkillNames.has(se.name)) continue
          const skillPath = resolve(skillsDir, se.name)
          let skillContent: string
          try {
            skillContent = await readFile(join(skillPath, 'SKILL.md'), 'utf-8')
          } catch (_) {
            continue // no readable SKILL.md — not a skill
          }
          const skillFm = parseFrontmatter(skillContent)
          seenSkillNames.add(se.name)
          skills.push({
            name: se.name,
            source_blueprint: blueprintOwnerName(templateDir, item.docName),
            embedded: true,
            path: skillPath,
            ...(skillFm?.version ? { version: String(skillFm.version) } : {}),
            ...(skillFm?.description ? { description: String(skillFm.description) } : {}),
          })
        }
      } catch (_) {
        /* skills directory unreadable — skip embedded skill discovery for this template */
      }
    }

    if (Array.isArray(fm.skills)) {
      for (const s of fm.skills) {
        if (s && typeof s === 'object' && s.name && !seenSkillNames.has(s.name)) {
          seenSkillNames.add(s.name)
          skills.push({
            name: String(s.name),
            repo: String(s.repo ?? ''),
            path: String(s.path ?? ''),
            source_template: s.source_template ? String(s.source_template) : item.docName,
            ...(s.commit ? { commit: String(s.commit) } : {}),
            ...(s.sha256 ? { sha256: String(s.sha256) } : {}),
            ...(s.license ? { license: String(s.license) } : {}),
          })
        }
      }
    }

    if (item.depth < 10) {
      if (Array.isArray(fm.includes)) {
        for (const inc of fm.includes) {
          if (!inc || !inc.name) continue
          const incKey = inc.name.toLowerCase()
          if (seenBlueprints.has(incKey)) continue

          let incVersion: string | undefined
          if (inc.url) {
            const vMatch =
              inc.url.match(/_V_(\d+[-.]\d+[-.]\d+)/i) ||
              inc.url.match(/\/V_?(\d+[-.]\d+[-.]\d+)\//i)
            if (vMatch) {
              incVersion = vMatch[1]
            } else {
              const parsedFromUrl = parseSpecName(basename(inc.url))
              if (parsedFromUrl.version) incVersion = parsedFromUrl.version
            }
          }

          let incContent: string | null = null
          const pkg = await resolveBlueprintPackage(rootDir, inc.name, incVersion)
          if (pkg) {
            incContent = await readFile(pkg.specFilePath, 'utf-8').catch(() => null)
          }
          if (!incContent) {
            incContent = await fetchSpecContent(inc.name, inc.url, specsDir, 5000)
          }

          if (incContent) {
            const incFm = parseFrontmatter(incContent)
            if (incFm) {
              queue.push({
                docName: inc.name,
                fm: incFm,
                depth: item.depth + 1,
                filePath: pkg?.specFilePath,
              })
            }
          }
        }
      }

      if (fm.parent_spec && typeof fm.parent_spec === 'object' && fm.parent_spec.name) {
        const pName = fm.parent_spec.name
        const pKey = pName.toLowerCase()
        if (!seenBlueprints.has(pKey)) {
          let pVersion: string | undefined
          if (fm.parent_spec.url) {
            const vMatch =
              fm.parent_spec.url.match(/_V_(\d+[-.]\d+[-.]\d+)/i) ||
              fm.parent_spec.url.match(/\/V_?(\d+[-.]\d+[-.]\d+)\//i)
            if (vMatch) {
              pVersion = vMatch[1]
            } else {
              const parsedFromUrl = parseSpecName(basename(fm.parent_spec.url))
              if (parsedFromUrl.version) pVersion = parsedFromUrl.version
            }
          }

          let parentContent: string | null = null
          const pkg = await resolveBlueprintPackage(rootDir, pName, pVersion)
          if (pkg) {
            parentContent = await readFile(pkg.specFilePath, 'utf-8').catch(() => null)
          }
          if (!parentContent) {
            parentContent = await fetchSpecContent(pName, fm.parent_spec.url, specsDir, 5000)
          }
          if (parentContent) {
            const pFm = parseFrontmatter(parentContent)
            if (pFm) {
              queue.push({
                docName: pName,
                fm: pFm,
                depth: item.depth + 1,
                filePath: pkg?.specFilePath,
              })
            }
          }
        }
      }
    }
  }

  return { procedures: classifyProcedures(found), skills }
}

/**
 * Selected or shadowed for every procedure found, by nn-core `resolveProcedures`: one node per
 * package, the nearest package last. Order and fields of the entries are those of discovery.
 */
function classifyProcedures(found: Array<{ proc: TemplateProcedure; def: ProcedureDef }>): ListedTemplateProcedure[] {
  const byPackage = new Map<string, ProcedureDef[]>()
  for (const { def } of found) byPackage.set(def.scope, [...(byPackage.get(def.scope) ?? []), def])
  const nodes = [...byPackage.entries()]
    .reverse()
    .map(([id, procedures]) => ({ id, kind: 'blueprint', doc: null, isolate: false, values: {}, procedures }))
  const winners = new Map(resolveProcedures({ floor: null, nodes }).procedures.map((e) => [e.def.id, e.def]))
  return found.map(({ proc, def }) =>
    winners.get(def.id) === def
      ? { ...proc, status: 'selected' }
      : { ...proc, status: 'shadowed', shadowed_by: winners.get(def.id)?.scope },
  )
}

export interface ListBlueprintProceduresScopedOptions extends ListBlueprintProceduresOptions {
  /** A document or scope directory: list the procedures visible from there, selected and shadowed. */
  path: string
}

export async function listBlueprintProcedures(
  rootDir: string,
  opts: ListBlueprintProceduresScopedOptions,
  pkg?: PackageOptions,
): Promise<ScopedProceduresResult>
export async function listBlueprintProcedures(
  rootDir: string,
  opts?: ListBlueprintProceduresOptions,
): Promise<{ procedures: ListedTemplateProcedure[] }>
export async function listBlueprintProcedures(
  rootDir: string,
  opts?: ListBlueprintProceduresOptions & { path?: string },
  pkg?: PackageOptions,
): Promise<ScopedProceduresResult | { procedures: ListedTemplateProcedure[] }> {
  if (opts?.path !== undefined) return listScopedProcedures(rootDir, opts.path, pkg)
  const assets = await discoverTransitiveAssets(rootDir, opts)
  return { procedures: assets.procedures }
}

export async function listBlueprintSkills(
  rootDir: string,
  opts?: ListBlueprintSkillsOptions,
): Promise<{ skills: Array<TemplateSkill | EmbeddedBlueprintSkill> }> {
  const assets = await discoverTransitiveAssets(rootDir, opts)
  return { skills: assets.skills }
}
