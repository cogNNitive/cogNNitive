import { readdir, readFile } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'
import { parseFrontmatter } from './parser/index.js'
import {
  SpecCache,
  SpecDocument,
  ResolverOptions,
  ResolvedBlueprintPackage,
} from './types/index.js'

export interface SpecResolver {
  resolveParentChain(
    parentUrl: string,
    parentName: string,
    options?: ResolverOptions,
  ): Promise<SpecCache>
}

export class SpecResolutionError extends Error {
  constructor(
    message: string,
    public readonly url?: string,
  ) {
    super(message)
    this.name = 'SpecResolutionError'
  }
}

export interface MultiStoreResolverOptions {
  workspaceDir?: string
  domainDir?: string
  globalBlueprintsDir?: string
  skillsDir?: string
  timeout?: number
}

export interface SpecBlueprintLocation {
  name: string
  filePath: string
  source: 'workspace' | 'global' | 'skill'
  skillName?: string
}

export class UnresolvedBlueprintError extends Error {
  public readonly checkedPaths: string[]
  constructor(templateName: string, checkedPaths: string[]) {
    const formatted = checkedPaths.map((p) => `  - ${p}`).join('\n')
    super(`Unresolved template "${templateName}". (searched:\n${formatted})`)
    this.name = 'UnresolvedBlueprintError'
    this.checkedPaths = checkedPaths
  }
}

export function getSpecForLevel(cache: SpecCache, level: number): SpecDocument | undefined {
  for (const doc of cache.specs.values()) {
    if (doc.level === level) return doc
  }
  return undefined
}

export function getBlueprint(cache: SpecCache): SpecDocument | undefined {
  return getSpecForLevel(cache, 3) ?? getSpecForLevel(cache, 2)
}

export function getFormatSpec(cache: SpecCache): SpecDocument | undefined {
  return getSpecForLevel(cache, 1)
}

export function getDefiNNe(cache: SpecCache): SpecDocument | undefined {
  return getSpecForLevel(cache, 0)
}

interface TemplateCandidate {
  filePath: string
  source: 'workspace' | 'global' | 'skill'
  skillName?: string
}

/**
 * Builds the ordered list of paths that blueprint resolution will check, in
 * precedence order: domain (specs/bluepriNNts/), then global user blueprints (~/.agents/bluepriNNts/),
 * then the blueprints bundled with each installed skill (~/.agents/skills/*\/bluepriNNts/).
 *
 * Resolution and the "searched:" diagnostics in `UnresolvedBlueprintError` both
 * read from this one list, so the precedence order cannot drift between where
 * a blueprint is actually found and where we claim to have looked.
 */
async function buildBlueprintCandidates(
  templateName: string,
  options?: MultiStoreResolverOptions,
): Promise<TemplateCandidate[]> {
  const fs = await import('node:fs/promises')
  const path = await import('node:path')
  const os = await import('node:os')

  const workspaceDir = options?.domainDir ?? options?.workspaceDir ?? process.cwd()
  const globalBlueprintsDir =
    options?.globalBlueprintsDir ?? path.join(os.homedir(), '.agents', 'bluepriNNts')
  const skillsDir = options?.skillsDir ?? path.join(os.homedir(), '.agents', 'skills')

  const candidateNames = templateName.endsWith('.md')
    ? [templateName]
    : [`${templateName}.md`, templateName]

  const candidates: TemplateCandidate[] = []

  // Tier 1: Domain/Workspace-local directories (specs/bluepriNNts/, specs/, root)
  for (const candidate of candidateNames) {
    candidates.push({
      filePath: path.join(workspaceDir, 'specs', 'bluepriNNts', candidate),
      source: 'workspace',
    })
    candidates.push({ filePath: path.join(workspaceDir, 'specs', candidate), source: 'workspace' })
    candidates.push({ filePath: path.join(workspaceDir, candidate), source: 'workspace' })
  }

  // Tier 2: Global user agents blueprints directory (~/.agents/bluepriNNts/)
  for (const candidate of candidateNames) {
    candidates.push({ filePath: path.join(globalBlueprintsDir, candidate), source: 'global' })
  }

  // Tier 3: Installed skill blueprints directories (~/.agents/skills/*/bluepriNNts/)
  let skillNames: string[] = []
  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true })
    skillNames = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch (err) {
    /* v8 ignore start */
    // swallow deliberately: the skills directory may legitimately not exist.
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn(`[resolver] Failed to scan skills bluepriNNts dir ${skillsDir}: ${err}`)
    }
    /* v8 ignore stop */
  }
  for (const skillName of skillNames) {
    for (const candidate of candidateNames) {
      candidates.push({
        filePath: path.join(skillsDir, skillName, 'bluepriNNts', candidate),
        source: 'skill',
        skillName,
      })
      candidates.push({
        filePath: path.join(skillsDir, skillName, candidate),
        source: 'skill',
        skillName,
      })
    }
  }

  return candidates
}

/**
 * Returns every path template resolution would check, in precedence order.
 * Intended for diagnostics after `resolveBlueprintPath` returns null.
 */
export async function getBlueprintSearchPaths(
  templateName: string,
  options?: MultiStoreResolverOptions,
): Promise<string[]> {
  const candidates = await buildBlueprintCandidates(templateName, options)
  return candidates.map((candidate) => candidate.filePath)
}

export async function resolveBlueprintPath(
  templateName: string,
  options?: MultiStoreResolverOptions,
): Promise<SpecBlueprintLocation | null> {
  const fs = await import('node:fs/promises')
  const candidates = await buildBlueprintCandidates(templateName, options)

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate.filePath)
      if (stat.isFile()) {
        return {
          name: templateName,
          filePath: candidate.filePath,
          source: candidate.source,
          ...(candidate.skillName ? { skillName: candidate.skillName } : {}),
        }
      }
    } catch (err) {
      /* v8 ignore start */
      // swallow deliberately: a precedence candidate may legitimately not exist.
      if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        console.warn(`[resolver] Failed to stat template candidate ${candidate.filePath}: ${err}`)
      }
      /* v8 ignore stop */
    }
  }

  return null
}

/* ── Blueprint package resolution (relocated from innfo-mcp) ─────
 *
 * The package resolver and its pure/fs leaf helpers live here so BOTH the MCP
 * tooling and the console export CLI share exactly one tier chain — including
 * the unversioned workspace-package Tier 1 that canonical Level-2 packages use.
 * Network fetch/hydration stays in innfo-mcp; only resolution moved.
 */

/**
 * Canonical blueprint package directories that are NOT version directories.
 * Canonical Level-2 packages are unversioned (`<name>/spec_NN.md` + optional
 * `procedures/`, `samples/`, `assets/`), so when the package resolver scans
 * `<name>/*` for a version sub-directory it must skip these siblings — otherwise
 * `procedures` is mistaken for the version and the resolver points at a
 * procedure file instead of `spec_NN.md`. Mirrors the skip list `listBlueprints`
 * already applies when walking the same tree.
 */
const PACKAGE_NON_VERSION_DIRS = new Set([
  'procedures',
  'samples',
  'assets',
  'web',
  'node_modules',
  '.git',
  'dist',
  '.spec-cache',
  'backups',
  'archive',
])

export function normalizeVersion(versionStr: string): string {
  let v = versionStr.replace(/^[vV]_?/, '')
  v = v.replace(/[_-]/g, '.')
  return v.trim()
}

function isVersionDirName(name: string): boolean {
  if (PACKAGE_NON_VERSION_DIRS.has(name.toLowerCase())) return false
  // A version directory is `<something>_V_x-y-z`, `V_x-y-z`, or a bare
  // `<x.y.z>` / `<x_y_z>` / `<x-y-z>`.
  return (
    /_V_\d+[-_.]\d+[-_.]\d+/i.test(name) ||
    /^V[_.-]?\d+[-_.]\d+[-_.]\d+$/i.test(name) ||
    /^\d+[-_.]\d+[-_.]\d+$/.test(name)
  )
}

export function parseSpecName(name: string) {
  // Strip file extensions and NN/FORMAT suffixes
  const clean = name.replace(/\.(md|markdown)$/i, '').replace(/_(NN|FORMAT|F)$/i, '')
  // Split at _V_ to extract base and version
  const parts = clean.split(/_V_/i)
  const base = parts[0].toLowerCase()
  const rawVersion = parts[1]
  const version = rawVersion ? normalizeVersion(rawVersion) : undefined
  return { base, version }
}

async function getMarkdownFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        // Vendored dependency trees (embedded skills ship node_modules) and
        // dot dirs (.git, .cache, .staging-*) never hold resolvable specs.
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
        files.push(...(await getMarkdownFiles(fullPath)))
      } else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
        files.push(fullPath)
      }
    }
  } catch (err) {
    /* v8 ignore start */
    // swallow deliberately: a scan dir may legitimately not exist or be unreadable.
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn(`[resolver] Failed to scan dir ${dir}: ${err}`)
    }
    /* v8 ignore stop */
  }
  return files
}

/** Normalized version (dots) declared by a spec document's own frontmatter, if any. */
export function versionFromFrontmatter(content: string): string | undefined {
  const fm = parseFrontmatter(content)
  const v = fm?.spec_version ?? fm?.specification_version
  return v ? normalizeVersion(String(v)) : undefined
}

/** Normalized `blueprint_version` declared by a bluepriNNt spec's frontmatter, if any. */
export function blueprintVersionFromFrontmatter(content: string): string | undefined {
  const v = parseFrontmatter(content)?.blueprint_version
  return v ? normalizeVersion(String(v)) : undefined
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x - y
  }
  return 0
}

async function matchSpecPath(
  reqParsed: { base: string; version?: string },
  filePath: string,
): Promise<boolean> {
  const fileParsed = parseSpecName(basename(filePath))
  if (fileParsed.base !== reqParsed.base) return false
  if (!reqParsed.version) return true
  if (fileParsed.version) return fileParsed.version === reqParsed.version
  // Unversioned filename: match via the document's own frontmatter version.
  try {
    const content = await readFile(filePath, 'utf-8')
    const fmVersion = versionFromFrontmatter(content)
    return fmVersion !== undefined && fmVersion === reqParsed.version
  } catch (err) {
    /* v8 ignore start */
    // swallow deliberately: an unreadable candidate does not match by version.
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn(`[resolver] Failed to read ${filePath} for version match: ${err}`)
    }
    return false
    /* v8 ignore stop */
  }
}

/** For unversioned requests, prefer the highest version among the matches. */
async function preferHighestVersion(matches: string[]): Promise<string | null> {
  if (matches.length === 0) return null
  let best = matches[0]
  let bestVersion: string | undefined
  for (const m of matches) {
    const nameVersion = parseSpecName(basename(m)).version
    const v = nameVersion ?? versionFromFrontmatter(await readFile(m, 'utf-8').catch(() => ''))
    if (!bestVersion && v) {
      best = m
      bestVersion = v
      continue
    }
    if (bestVersion && v && compareVersions(v, bestVersion) > 0) {
      best = m
      bestVersion = v
    }
  }
  return best
}

/**
 * Find a spec matching `reqName` (base + optional version) under `specsDir`,
 * searched recursively. This is the SINGLE local lookup: it covers both
 * hand-placed/vendored templates and anything a previous run already fetched
 * and saved here — there is no separate cache directory to check.
 */
export async function findLocalSpec(specsDir: string, reqName: string): Promise<string | null> {
  const reqParsed = parseSpecName(reqName)
  const matches: string[] = []
  for (const filePath of await getMarkdownFiles(specsDir)) {
    if (await matchSpecPath(reqParsed, filePath)) matches.push(filePath)
  }
  if (reqParsed.version) return matches[0] ?? null
  return preferHighestVersion(matches)
}

/**
 * Helper to find a canonical spec markdown file inside a package directory.
 */
export async function findSpecInPackageDir(dir: string, base: string): Promise<string | null> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const files = entries
      .filter((e) => e.isFile() && /\.(md|markdown)$/i.test(e.name))
      .map((e) => e.name)
    if (files.length === 0) return null

    const specNN = files.find((f) => f.toLowerCase() === 'spec_nn.md')
    if (specNN) return join(dir, specNN)

    const baseV = files.find((f) => f.toLowerCase().startsWith(`${base.toLowerCase()}_v_`))
    if (baseV) return join(dir, baseV)

    const baseNN = files.find((f) => f.toLowerCase() === `${base.toLowerCase()}_nn.md`)
    if (baseNN) return join(dir, baseNN)

    const specMd = files.find((f) => f.toLowerCase() === 'spec.md')
    if (specMd) return join(dir, specMd)

    const baseMd = files.find((f) => f.toLowerCase() === `${base.toLowerCase()}.md`)
    if (baseMd) return join(dir, baseMd)

    return join(dir, files[0])
  } catch (err) {
    /* v8 ignore start */
    // swallow deliberately: a package dir may legitimately not exist.
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn(`[resolver] Failed to scan package dir ${dir}: ${err}`)
    }
    return null
    /* v8 ignore stop */
  }
}

/**
 * A `findSpecInPackageDir` hit only counts as an unversioned package Tier-1
 * match when the direct-entry filename is a canonical spec name. A stray
 * `README.md` (or any other markdown) does not promote a directory to a package.
 */
function isDirectSpecEntryName(filePath: string, base: string): boolean {
  const entry = basename(filePath).toLowerCase()
  return (
    entry === 'spec_nn.md' ||
    entry === `${base.toLowerCase()}_nn.md` ||
    entry.startsWith(`${base.toLowerCase()}_v_`)
  )
}

/**
 * 5-Tier Template Package Resolver:
 *   Tier 1: Workspace unversioned package: ./specs/bluepriNNts/<name>/spec_NN.md
 *   Tier 1b: Workspace package directory: ./specs/bluepriNNts/<name>/<version>/
 *   Tier 2: Workspace flat fallback: ./specs/
 *   Tier 3: Global user cache: ~/.agents/bluepriNNts/<name>/<version>/
 *   Tier 4: Installed skills directory: ~/.agents/skills/<skill-name>/bluepriNNts/<name>/<version>/
 *
 * The unversioned tier fires only when a direct spec file exists in the package
 * directory (never on directory existence alone) and returns `isPackageDir: true`
 * with `packagePath = <rootDir>/specs/bluepriNNts/<name>` so `procedures/` and
 * `samples/` discovery keeps working.
 */
export async function resolveBlueprintPackage(
  rootDir: string,
  reqName: string,
  reqVersion?: string,
  options?: { globalDir?: string; skillsDir?: string },
): Promise<ResolvedBlueprintPackage | null> {
  const globalDir =
    options?.globalDir ?? process.env.INNFO_GLOBAL_DIR ?? join(homedir(), '.agents', 'bluepriNNts')
  const skillsDir =
    options?.skillsDir ?? process.env.INNFO_SKILLS_DIR ?? join(homedir(), '.agents', 'skills')

  const parsed = parseSpecName(reqName)
  const base = parsed.base
  const targetVersion = reqVersion ? normalizeVersion(reqVersion) : parsed.version

  // Tier 1: Workspace Unversioned Package Directory (./specs/bluepriNNts/<name>/)
  const wsPackageBaseDir = join(rootDir, 'specs', 'bluepriNNts', base)
  const unversionedSpecFile = await findSpecInPackageDir(wsPackageBaseDir, base)
  if (unversionedSpecFile && isDirectSpecEntryName(unversionedSpecFile, base)) {
    const content = await readFile(unversionedSpecFile, 'utf-8').catch(() => '')
    const fmVersion = versionFromFrontmatter(content)
    const bpVersion = blueprintVersionFromFrontmatter(content)
    return {
      name: base,
      version: targetVersion || bpVersion || fmVersion || 'V_0-1-0',
      packagePath: wsPackageBaseDir,
      specFilePath: unversionedSpecFile,
      isPackageDir: true,
      tier: 'workspace-package',
    }
  }

  // Tier 1b: Workspace Package Directory (./specs/bluepriNNts/<name>/<version>/)
  try {
    const entries = await readdir(wsPackageBaseDir, { withFileTypes: true })
    const verDirs = entries.filter((e) => e.isDirectory() && isVersionDirName(e.name))
    let matchDir: string | null = null
    let matchVer: string | undefined

    if (targetVersion) {
      for (const d of verDirs) {
        if (normalizeVersion(d.name) === targetVersion) {
          matchDir = join(wsPackageBaseDir, d.name)
          matchVer = targetVersion
          break
        }
      }
    } else if (verDirs.length > 0) {
      let bestVer = ''
      for (const d of verDirs) {
        const v = normalizeVersion(d.name)
        if (!bestVer || compareVersions(v, bestVer) > 0) {
          bestVer = v
          matchDir = join(wsPackageBaseDir, d.name)
          matchVer = v
        }
      }
    }

    if (matchDir) {
      const specFile = await findSpecInPackageDir(matchDir, base)
      if (specFile) {
        return {
          name: base,
          version: matchVer || 'V_0-1-0',
          packagePath: matchDir,
          specFilePath: specFile,
          isPackageDir: true,
          tier: 'workspace-package',
        }
      }
    }
  } catch (err) {
    /* v8 ignore start */
    // swallow deliberately: a tier directory may legitimately not exist.
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn(`[resolver] Failed to scan package tier dir: ${err}`)
    }
    /* v8 ignore stop */
  }

  // Tier 2: Workspace Flat Fallback (./specs/)
  const flatSearchDirs = [join(rootDir, 'specs')]
  for (const dir of flatSearchDirs) {
    const matchFile = await findLocalSpec(dir, reqName)
    if (matchFile) {
      const content = await readFile(matchFile, 'utf-8').catch(() => '')
      const v = targetVersion || versionFromFrontmatter(content) || '0.1.0'
      return {
        name: base,
        version: v,
        packagePath: matchFile,
        specFilePath: matchFile,
        isPackageDir: false,
        tier: 'workspace-flat',
      }
    }
  }

  // Tier 3: Global User Cache (~/.agents/bluepriNNts/<name>/<version>/)
  const globalBaseDir = join(globalDir, base)

  try {
    const entries = await readdir(globalBaseDir, { withFileTypes: true })
    const verDirs = entries.filter((e) => e.isDirectory() && isVersionDirName(e.name))
    let matchDir: string | null = null
    let matchVer: string | undefined

    if (targetVersion) {
      for (const d of verDirs) {
        if (normalizeVersion(d.name) === targetVersion) {
          matchDir = join(globalBaseDir, d.name)
          matchVer = targetVersion
          break
        }
      }
    } else if (verDirs.length > 0) {
      let bestVer = ''
      for (const d of verDirs) {
        const v = normalizeVersion(d.name)
        if (!bestVer || compareVersions(v, bestVer) > 0) {
          bestVer = v
          matchDir = join(globalBaseDir, d.name)
          matchVer = v
        }
      }
    }

    if (matchDir) {
      const specFile = await findSpecInPackageDir(matchDir, base)
      if (specFile) {
        return {
          name: base,
          version: matchVer || 'V_0-1-0',
          packagePath: matchDir,
          specFilePath: specFile,
          isPackageDir: true,
          tier: 'global-cache',
        }
      }
    } else if (verDirs.length === 0) {
      // Flat install: the installer writes <globalDir>/<name>/spec_NN.md with
      // no V_x/ subdirs. Honor a requested version via the document's own
      // frontmatter.
      const specFile = await findSpecInPackageDir(globalBaseDir, base)
      if (specFile) {
        const specContent = await readFile(specFile, 'utf-8').catch(() => '')
        const fmVersion = versionFromFrontmatter(specContent)
        // A bluepriNNt carries two version axes: `spec_version` (the spec format) and
        // `blueprint_version` (the package, and what version dirs and requests like
        // `video_V_0-8-0` name). A request matches either.
        const bpVersion = blueprintVersionFromFrontmatter(specContent)
        if (!targetVersion || fmVersion === targetVersion || bpVersion === targetVersion) {
          return {
            name: base,
            version: targetVersion || fmVersion || '0.1.0',
            packagePath: globalBaseDir,
            specFilePath: specFile,
            isPackageDir: true,
            tier: 'global-cache',
          }
        }
      }
    }
  } catch {
    // Check flat global file
    const matchFile = await findLocalSpec(globalDir, reqName)
    if (matchFile) {
      const content = await readFile(matchFile, 'utf-8').catch(() => '')
      const v = targetVersion || versionFromFrontmatter(content) || '0.1.0'
      return {
        name: base,
        version: v,
        packagePath: matchFile,
        specFilePath: matchFile,
        isPackageDir: false,
        tier: 'global-cache',
      }
    }
  }

  // Tier 4: Installed Skills Directory (~/.agents/skills/*/bluepriNNts/<name>/<version>/)
  try {
    const skillEntries = await readdir(skillsDir, { withFileTypes: true })
    const skillDirs = skillEntries.filter((e) => e.isDirectory()).map((e) => e.name)

    for (const skillName of skillDirs) {
      const skillPkgBase = join(skillsDir, skillName, 'bluepriNNts', base)

      try {
        const entries = await readdir(skillPkgBase, { withFileTypes: true })
        const verDirs = entries.filter((e) => e.isDirectory() && isVersionDirName(e.name))
        let matchDir: string | null = null
        let matchVer: string | undefined

        if (targetVersion) {
          for (const d of verDirs) {
            if (normalizeVersion(d.name) === targetVersion) {
              matchDir = join(skillPkgBase, d.name)
              matchVer = targetVersion
              break
            }
          }
        } else if (verDirs.length > 0) {
          let bestVer = ''
          for (const d of verDirs) {
            const v = normalizeVersion(d.name)
            if (!bestVer || compareVersions(v, bestVer) > 0) {
              bestVer = v
              matchDir = join(skillPkgBase, d.name)
              matchVer = v
            }
          }
        }

        if (matchDir) {
          const specFile = await findSpecInPackageDir(matchDir, base)
          if (specFile) {
            return {
              name: base,
              version: matchVer || 'V_0-1-0',
              packagePath: matchDir,
              specFilePath: specFile,
              isPackageDir: true,
              tier: 'installed-skill',
            }
          }
        }
      } catch {
        const matchFile =
          (await findLocalSpec(join(skillsDir, skillName, 'bluepriNNts'), reqName)) ||
          (await findLocalSpec(join(skillsDir, skillName), reqName))
        if (matchFile) {
          const content = await readFile(matchFile, 'utf-8').catch(() => '')
          const v = targetVersion || versionFromFrontmatter(content) || '0.1.0'
          return {
            name: base,
            version: v,
            packagePath: matchFile,
            specFilePath: matchFile,
            isPackageDir: false,
            tier: 'installed-skill',
          }
        }
      }
    }
  } catch (err) {
    /* v8 ignore start */
    // swallow deliberately: the skills dir may legitimately not exist.
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn(`[resolver] Failed to scan skills dir: ${err}`)
    }
    /* v8 ignore stop */
  }

  return null
}
