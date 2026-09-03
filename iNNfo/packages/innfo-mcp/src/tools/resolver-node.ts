import { readdir, readFile, mkdir, writeFile, rename } from 'node:fs/promises'
import { join, basename, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { parseFrontmatter, SpecResolutionError } from '@cognnitive/innfo-core'
import type {
  SpecCache,
  SpecDocument,
  ResolverOptions,
  ResolvedTemplatePackage,
} from '@cognnitive/innfo-core'

export function isLocalPath(url: string): boolean {
  if (!url) return false
  if (url.startsWith('http://') || url.startsWith('https://')) return false
  if (url.startsWith('file://')) return true
  if (isAbsolute(url)) return true
  if (/^[a-zA-Z]:[/\\]/.test(url)) return true
  if (url.startsWith('.') || url.endsWith('.md') || url.includes('/') || url.includes('\\'))
    return true
  return false
}

export function toLocalFilePath(url: string, rootDir?: string): string {
  if (url.startsWith('file://')) {
    return fileURLToPath(url)
  }
  if (isAbsolute(url) || /^[a-zA-Z]:[/\\]/.test(url)) {
    return url
  }
  if (rootDir) {
    return join(rootDir, url)
  }
  return url
}

const MAX_DEPTH_DEFAULT = 10

export function normalizeVersion(versionStr: string): string {
  let v = versionStr.replace(/^[vV]_?/, '')
  v = v.replace(/[_-]/g, '.')
  return v.trim()
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
        files.push(...(await getMarkdownFiles(fullPath)))
      } else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
        files.push(fullPath)
      }
    }
  } catch {
    // Ignore directory reading issues
  }
  return files
}

async function download(url: string, timeout: number): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const resp = await fetch(url, { signal: controller.signal })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
    return await resp.text()
  } finally {
    clearTimeout(timer)
  }
}

/** Normalized version (dots) declared by a spec document's own frontmatter, if any. */
function versionFromFrontmatter(content: string): string | undefined {
  const fm = parseFrontmatter(content)
  const v = fm?.spec_version ?? fm?.specification_version
  return v ? normalizeVersion(String(v)) : undefined
}

/**
 * Canonical local filename for a resolved document.
 *
 * The filename must reflect the document's OWN version, not the caller's
 * request name. A request for `business` (from a `latest/` URL) must save as
 * `business_V_0-1-0_NN.md`, so the same spec is never duplicated under a
 * versionless name and a versioned one. Falls back to the request name when
 * the document declares no version.
 */
export function canonicalSpecFilename(requestName: string, content: string): string {
  const fmVersion = versionFromFrontmatter(content)
  if (!fmVersion) return requestName
  // Preserve the request name's original case (iNNfo, defiNNe, cogNNitive...).
  const base = requestName
    .replace(/\.(md|markdown)$/i, '')
    .replace(/_(NN|FORMAT|F)$/i, '')
    .split(/_V_/i)[0]
  return `${base}_V_${fmVersion.replace(/\./g, '-')}`
}

function compareVersions(a: string, b: string): number {
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
  } catch {
    return false
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
async function findLocalSpec(specsDir: string, reqName: string): Promise<string | null> {
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
async function findSpecInPackageDir(dir: string, base: string): Promise<string | null> {
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
  } catch {
    return null
  }
}

/**
 * 4-Tier Template Package Resolver:
 *   Tier 1: Workspace package directory: ./specs/templates/<name>/<version>/
 *   Tier 2: Workspace flat fallback: ./templates/<name>_V_<version>_NN.md or ./specs/
 *   Tier 3: Global user cache: ~/.agents/templates/<name>/<version>/
 *   Tier 4: Installed skills directory: ~/.agents/skills/<skill-name>/templates/<name>/<version>/
 */
export async function resolveTemplatePackage(
  rootDir: string,
  reqName: string,
  reqVersion?: string,
  options?: { globalDir?: string; skillsDir?: string },
): Promise<ResolvedTemplatePackage | null> {
  const globalDir =
    options?.globalDir ?? process.env.INNFO_GLOBAL_DIR ?? join(homedir(), '.agents', 'templates')
  const skillsDir =
    options?.skillsDir ?? process.env.INNFO_SKILLS_DIR ?? join(homedir(), '.agents', 'skills')

  const parsed = parseSpecName(reqName)
  const base = parsed.base
  const targetVersion = reqVersion ? normalizeVersion(reqVersion) : parsed.version

  // Tier 1: Workspace Package Directory (./specs/templates/<name>/<version>/)
  const wsPackageBaseDir = join(rootDir, 'specs', 'templates', base)
  try {
    const entries = await readdir(wsPackageBaseDir, { withFileTypes: true })
    const verDirs = entries.filter((e) => e.isDirectory())
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
  } catch {
    // Directory absent
  }

  // Tier 2: Workspace Flat Fallback (./templates/<name>_V_<version>_NN.md or ./specs/)
  const flatSearchDirs = [join(rootDir, 'specs'), join(rootDir, 'templates')]
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

  // Tier 3: Global User Cache (~/.agents/templates/<name>/<version>/)
  const globalBaseDir = join(globalDir, base)
  try {
    const entries = await readdir(globalBaseDir, { withFileTypes: true })
    const verDirs = entries.filter((e) => e.isDirectory())
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

  // Tier 4: Installed Skills Directory (~/.agents/skills/*/templates/<name>/<version>/)
  try {
    const skillEntries = await readdir(skillsDir, { withFileTypes: true })
    const skillDirs = skillEntries.filter((e) => e.isDirectory()).map((e) => e.name)

    for (const skillName of skillDirs) {
      const skillPkgBase = join(skillsDir, skillName, 'templates', base)
      try {
        const entries = await readdir(skillPkgBase, { withFileTypes: true })
        const verDirs = entries.filter((e) => e.isDirectory())
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
          (await findLocalSpec(join(skillsDir, skillName, 'templates'), reqName)) ||
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
  } catch {
    // Skills dir absent
  }

  return null
}

/**
 * Write-once atomic package hydration:
 * Creates staging directory `specs/templates/<base>/.staging-<pid>-<time>/`,
 * populates `spec_NN.md`, then atomically renames to `specs/templates/<base>/V_<version>/`.
 * If target package directory already exists, preserves existing contents without overwriting.
 */
export async function hydrateTemplatePackageAtomically(
  rootDir: string,
  base: string,
  version: string,
  content: string,
): Promise<string> {
  const verSegment = `V_${normalizeVersion(version).replace(/\./g, '-')}`
  const targetPkgDir = join(rootDir, 'specs', 'templates', base, verSegment)

  // Write-once immutability check
  try {
    const existing = await readdir(targetPkgDir)
    if (existing.length > 0) {
      return targetPkgDir
    }
  } catch {
    // Directory does not exist yet
  }

  const baseTemplatesDir = join(rootDir, 'specs', 'templates', base)
  await mkdir(baseTemplatesDir, { recursive: true })

  const stagingDir = join(baseTemplatesDir, `.staging-${process.pid}-${Date.now()}`)
  await mkdir(stagingDir, { recursive: true })

  const specFileName = 'spec_NN.md'
  await writeFile(join(stagingDir, specFileName), content, 'utf-8')
  const namedFileName = `${base}_${verSegment}_NN.md`
  await writeFile(join(stagingDir, namedFileName), content, 'utf-8')

  try {
    await rename(stagingDir, targetPkgDir)
  } catch {
    try {
      const { copyFile: copyF } = await import('node:fs/promises')
      await mkdir(targetPkgDir, { recursive: true })
      await copyF(join(stagingDir, specFileName), join(targetPkgDir, specFileName))
      await copyF(join(stagingDir, namedFileName), join(targetPkgDir, namedFileName))
      await rm(stagingDir, { recursive: true, force: true }).catch(() => {})
    } catch {
      // Ignore fallback issues
    }
  }

  return targetPkgDir
}

/**
 * Write `content` to `path` atomically: write to a sibling temp file, then
 * rename over the destination. Never leaves a partially-written file at
 * `path` for a concurrent reader to observe.
 */
async function atomicWriteFile(path: string, content: string): Promise<void> {
  const tmpPath = `${path}.tmp-${process.pid}-${Date.now()}`
  await writeFile(tmpPath, content, 'utf-8')
  await rename(tmpPath, path)
}

/**
 * Save a resolved spec into `specs/`, once. `specs/` content is immutable by
 * convention in this project — a version bump always produces a new
 * filename, never an in-place edit — so an existing file is simply never
 * overwritten. That write-once rule is the entire integrity guarantee: there
 * is nothing to hash-verify because nothing is ever silently replaced.
 */
export async function saveSpecOnce(
  specsDir: string,
  filename: string,
  content: string,
): Promise<void> {
  await mkdir(specsDir, { recursive: true })
  const path = join(specsDir, filename)
  try {
    await readFile(path, 'utf-8')
    return // already present — leave the existing file as authoritative
  } catch {
    // doesn't exist yet, fall through to write it
  }
  await atomicWriteFile(path, content)
}

export async function resolveParentChainNode(
  rootDir: string,
  parentUrl: string,
  parentName: string,
  options: ResolverOptions & { globalDir?: string; skillsDir?: string } = {},
): Promise<SpecCache> {
  const maxDepth = options.maxDepth ?? MAX_DEPTH_DEFAULT
  const timeout = options.timeout ?? 10000
  const specsDir = join(rootDir, 'specs')
  const specs = new Map<string, SpecDocument>()
  const chain: string[] = []

  let currentUrl: string | undefined = parentUrl
  let currentName: string | undefined = parentName
  let depth = 0

  await mkdir(specsDir, { recursive: true })

  while (currentUrl && currentName && depth < maxDepth) {
    let content: string | null = null
    const attempted: string[] = []

    // 0. If currentUrl is a local file path or file:// URI, read directly via readFile
    if (isLocalPath(currentUrl)) {
      const localPath = toLocalFilePath(currentUrl, rootDir)
      attempted.push(`local path "${localPath}"`)
      try {
        content = await readFile(localPath, 'utf-8')
        const specName = canonicalSpecFilename(currentName, content)
        await saveSpecOnce(specsDir, `${specName}_NN.md`, content).catch(() => {})
      } catch {
        content = null
      }
    }

    // 1. 4-tier template package resolution (workspace package -> workspace flat -> global -> skill)
    if (content === null) {
      attempted.push(`4-tier package resolver for "${currentName}" in "${specsDir}"`)
      const pkg = await resolveTemplatePackage(rootDir, currentName, undefined, options)
      if (pkg) {
        content = await readFile(pkg.specFilePath, 'utf-8')
      }
    }

    // 2. Download from network and hydrate into specs/templates/<name>/<version>/
    if (content === null) {
      attempted.push(`network url "${currentUrl}"`)
      try {
        content = await download(currentUrl, timeout)
        const fmVer = versionFromFrontmatter(content) || '0.1.0'
        const baseName = parseSpecName(currentName).base
        await hydrateTemplatePackageAtomically(rootDir, baseName, fmVer, content)
        const specName = canonicalSpecFilename(currentName, content)
        await saveSpecOnce(specsDir, `${specName}_NN.md`, content)
      } catch {
        content = null
      }
    }

    if (content === null) {
      throw new SpecResolutionError(
        `Failed to resolve parent "${currentName}" from "${currentUrl}". Attempted: ${attempted.join('; ')}`,
        currentUrl,
      )
    }

    // Every resolved source is held to the same standard: unparseable
    // content is always a hard error, never silently treated as a valid
    // empty-parent leaf.
    const fm = parseFrontmatter(content)
    if (fm === null) {
      throw new SpecResolutionError(
        `Unparseable frontmatter in resolved spec "${currentName}" (${attempted[attempted.length - 1]})`,
        currentUrl,
      )
    }
    const doc: SpecDocument = {
      name: currentName,
      level: fm.level ?? 0,
      parentName: fm.parent_spec?.name,
      parentUrl: fm.parent_spec?.url,
      frontmatter: fm,
      rawContent: content,
    }
    specs.set(currentName, doc)
    chain.push(currentName)

    currentName = doc.parentName
    currentUrl = doc.parentUrl
    depth++
  }

  if (depth >= maxDepth && currentUrl) {
    throw new Error(`Circular parent chain detected at depth ${maxDepth}`)
  }

  // Additive composition: pull in every template named by a resolved level-2
  // template's `includes` list (recursively), so `resolveTemplateSchema` in
  // innfo-core can compose their schemas offline. Best-effort — an
  // unresolvable include is left out and surfaces later as a validation error.
  await resolveIncludesInto(specs, specsDir, timeout)

  return { specs, chain }
}

/** Resolve one spec's raw content: local specs dir first, 4-tier package resolver second, then network. */
export async function fetchSpecContent(
  name: string,
  url: string | undefined,
  specsDir: string,
  timeout: number,
): Promise<string | null> {
  if (url && isLocalPath(url)) {
    const localPath = toLocalFilePath(url, specsDir.replace(/[/\\]specs[/\\]?$/, ''))
    const direct = await readFile(localPath, 'utf-8').catch(() => null)
    if (direct !== null) return direct
  }
  const local = await findLocalSpec(specsDir, name)
  if (local) return readFile(local, 'utf-8').catch(() => null)
  const rootDir = specsDir.replace(/[/\\]specs[/\\]?$/, '')
  const pkg = await resolveTemplatePackage(rootDir, name).catch(() => null)
  if (pkg) return readFile(pkg.specFilePath, 'utf-8').catch(() => null)
  if (url && /^https?:\/\//i.test(url)) {
    try {
      const content = await download(url, timeout)
      await saveSpecOnce(specsDir, `${canonicalSpecFilename(name, content)}_NN.md`, content).catch(
        () => {},
      )
      return content
    } catch {
      return null
    }
  }
  return null
}

/**
 * Resolve a set of `includes` refs (recursively following nested `includes`)
 * into a `name → raw content` map, for building an innfo-core `IncludeResolver`.
 * `specsBaseDir` is the repo root; templates are looked up under its `specs/`.
 * Keys are stored in both original name and lowercase name for case-insensitive lookup (Fix W-01).
 */
export async function buildIncludeContentMap(
  specsBaseDir: string,
  refs: Array<{ name: string; url: string }>,
  timeout = 10000,
): Promise<Map<string, string>> {
  const specsDir = join(specsBaseDir, 'specs')
  const out = new Map<string, string>()
  const seen = new Set<string>()
  const queue = [...refs]
  while (queue.length > 0) {
    const ref = queue.shift()!
    const key = ref.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const content = await fetchSpecContent(ref.name, ref.url || undefined, specsDir, timeout)
    if (content === null) continue
    out.set(ref.name, content)
    out.set(key, content)
    const fm = parseFrontmatter(content)
    for (const nested of fm?.includes ?? []) queue.push(nested)
  }
  return out
}

/**
 * Walk every resolved level-2 template's `includes` and add the referenced
 * templates to `specs` (keyed by include name), recursively. Mutates `specs`.
 */
export async function resolveIncludesInto(
  specs: Map<string, SpecDocument>,
  specsDir: string,
  timeout: number,
  seen: Set<string> = new Set(),
): Promise<void> {
  const queue: SpecDocument[] = [...specs.values()]
  while (queue.length > 0) {
    const doc = queue.shift()!
    const includes = doc.frontmatter?.includes ?? []
    for (const ref of includes) {
      const key = ref.name.toLowerCase()
      if (seen.has(key) || specs.has(ref.name)) continue
      seen.add(key)
      const content = await fetchSpecContent(ref.name, ref.url || undefined, specsDir, timeout)
      if (content === null) continue
      const fm = parseFrontmatter(content)
      if (fm === null) continue
      const included: SpecDocument = {
        name: ref.name,
        level: fm.level ?? 2,
        parentName: fm.parent_spec?.name,
        parentUrl: fm.parent_spec?.url,
        frontmatter: fm,
        rawContent: content,
      }
      specs.set(ref.name, included)
      queue.push(included)
    }
  }
}
