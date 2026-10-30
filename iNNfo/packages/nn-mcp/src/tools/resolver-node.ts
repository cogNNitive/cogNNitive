import { createHash } from 'node:crypto'
import { readdir, readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { isInsideRoot, isDriveQualified, isDriveContained } from './path-guard.js'
import { fileURLToPath } from 'node:url'
import { homedir, tmpdir } from 'node:os'
import {
  parseFrontmatter,
  SpecResolutionError,
  findCanonicalBlueprint,
  SPEC_FILENAME,
  resolveBlueprintPackage,
  normalizeVersion,
  parseSpecName,
  findLocalSpec,
  versionFromFrontmatter,
} from '@cognnitive/nn-core'
import type { SpecCache, SpecDocument, ResolverOptions } from '@cognnitive/nn-core'

// Relocated to nn-core (shared with the console export CLI). Re-exported so
// existing MCP imports from './resolver-node.js' keep working unchanged.
export {
  resolveBlueprintPackage,
  normalizeVersion,
  parseSpecName,
  findSpecInPackageDir,
} from '@cognnitive/nn-core'

export type FreshnessVerdict = 'fresh' | 'stale' | 'unknown'

export interface FreshnessResult {
  name: string
  url: string
  verdict: FreshnessVerdict
}

export type ResolverOptionsWithFreshness = ResolverOptions & {
  globalDir?: string
  skillsDir?: string
  checkFreshness?: boolean
  /**
   * Explicit cache directory for fetched specs/bluepriNNts. Defaults to
   * {@link defaultCacheDir} (OS temp dir). Reads check it after the
   * workspace tree; fetch-and-save paths write to it unless `inPlace`.
   */
  cacheDir?: string
  /**
   * When true, fetched content is written inside `<rootDir>/specs` (legacy
   * behavior). Default false — the workspace tree stays clean.
   */
  inPlace?: boolean
}

/**
 * Default on-disk location for fetched specs/bluepriNNts:
 * `join(os.tmpdir(), 'innfo-specs')`. Resolver *writes* (never reads alone)
 * go here by default so a default run creates no cache artifacts inside the
 * workspace or repository tree. Restored in-tree only via `inPlace: true`.
 * `INNFO_CACHE_DIR` overrides the location (test seam, mirroring
 * `INNFO_GLOBAL_DIR` / `INNFO_SKILLS_DIR`).
 */
export function defaultCacheDir(): string {
  return process.env.INNFO_CACHE_DIR ?? join(tmpdir(), 'innfo-specs')
}

export type ResolvedCache = SpecCache & { freshness?: Map<string, FreshnessResult> }

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

/**
 * Resolve a local `parent_spec.url` / `template_url` to a real file path,
 * confined to `rootDir`.
 *
 * The url comes from model frontmatter — document content, not a vetted caller
 * argument — so an absolute, drive-qualified, UNC or `..`-escaping value must
 * never be honoured verbatim. A UNC path is refused outright: on Windows even
 * a failed read of `\\host\share` leaks the local account's NTLM hash.
 *
 * Returns `null` when the url cannot be proven to stay inside `rootDir`;
 * callers treat that as "this resolution tier missed" and fall through.
 */
export function toLocalFilePath(url: string, rootDir?: string): string | null {
  if (/^[/\\]{2}/.test(url)) return null

  let candidate: string
  if (url.startsWith('file://')) {
    try {
      candidate = fileURLToPath(url)
    } catch {
      return null
    }
  } else {
    candidate = url
  }

  // A drive-qualified path is absolute on every host, so `isInsideRoot` (which
  // resolves against the host) cannot judge it: off Windows it reads `C:\x` as
  // a harmless relative name and hands back a path never proven contained.
  // Decide containment on the string form instead.
  if (isDriveQualified(candidate)) {
    return isDriveContained(rootDir, candidate) ? candidate : null
  }

  // Without a root there is nothing to contain against — refuse anything that
  // is not already a plain relative path.
  if (!rootDir) {
    return isAbsolute(candidate) ? null : candidate
  }

  const resolved = isAbsolute(candidate) ? candidate : join(rootDir, candidate)
  return isInsideRoot(rootDir, resolved) ? resolved : null
}

const MAX_DEPTH_DEFAULT = 10

/**
 * Raised when a catalog blueprint requires authentication and no usable token
 * is available, or when an authenticated remote fetch is rejected (HTTP 401/403).
 * The message never contains the raw token.
 */
export class BlueprintAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BlueprintAuthError'
  }
}

/**
 * Resolve a distribution bearer token without ever asking the caller for it:
 * `COGNNITIVE_TOKEN` first, then `~/.agents/credentials.json` (`{ "token": "…" }`).
 * Keeping the token out of tool arguments keeps it out of prompt history and logs.
 */
export function resolveAuthToken(): string | null {
  const env = process.env.COGNNITIVE_TOKEN
  if (env && env.trim()) return env.trim()
  try {
    const credPath =
      process.env.COGNNITIVE_CREDENTIALS ?? join(homedir(), '.agents', 'credentials.json')
    const raw = readFileSync(credPath, 'utf-8')
    const parsed = JSON.parse(raw) as { token?: unknown }
    if (parsed && typeof parsed.token === 'string' && parsed.token.trim()) return parsed.token.trim()
  } catch {
    // No credentials file or unreadable JSON — treated as "no token".
  }
  return null
}

/** Replace every occurrence of a bearer token in a diagnostic with `***`. */
export function redactToken(text: string, token?: string | null): string {
  if (!token) return text
  return text.split(token).join('***')
}

async function download(
  url: string,
  timeout: number,
  headers?: Record<string, string>,
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const resp = await fetch(url, { signal: controller.signal, headers })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
    return await resp.text()
  } finally {
    clearTimeout(timer)
  }
}

function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex')
}

/**
 * Compare the content hash of a locally cached spec against its canonical
 * remote. Read-only: never writes back to `specs/`. Any failure (network,
 * timeout, HTTP error) degrades to `unknown` — freshness must never fail
 * resolution. Exported so the workspace integrity check can compute
 * per-template freshness for `check_workspace` (AD-5 step 6).
 */
export async function freshnessVerdict(
  url: string,
  localContent: string,
  timeout: number,
): Promise<FreshnessVerdict> {
  try {
    const remote = await download(url, timeout)
    return sha256(localContent) === sha256(remote) ? 'fresh' : 'stale'
  } catch (err) {
    /* v8 ignore start */
    // swallow deliberately: freshness is advisory — an unreachable remote
    // records `unknown` and never fails resolution (documented contract).
    console.warn(`[resolver-node] Freshness check failed for ${url}: ${err}`)
    return 'unknown'
    /* v8 ignore stop */
  }
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

/**
 * A complete template package: the primary Level 2 specification plus the
 * accompanying SOP procedures, sample models, and static layout assets, each as
 * a `relativeFilePath -> fileContent` dictionary.
 */
export interface TemplatePackagePayload {
  spec: string
  procedures?: Record<string, string>
  samples?: Record<string, string>
  assets?: Record<string, string>
  /** Embedded skills; keys are relative to `skills/` (e.g. `nn-video-script/SKILL.md`). */
  skills?: Record<string, string>
}

async function writeStagedTree(
  stagingDir: string,
  subdir: string,
  files: Record<string, string> | undefined,
): Promise<void> {
  if (!files) return
  for (const [rel, content] of Object.entries(files)) {
    const dest = join(stagingDir, subdir, rel)
    await mkdir(join(dest, '..'), { recursive: true })
    await writeFile(dest, content, 'utf-8')
  }
}

/**
 * Process-unique suffix for staging/temp paths. `Date.now()` alone collides
 * when two workspaces resolve the same URL in the same millisecond — the
 * second writer must get its own staging dir / temp file, never the first
 * writer's path (concurrent-isolation scenario).
 */
let stagingCounter = 0
function uniqueSuffix(): string {
  return `${process.pid}-${Date.now()}-${stagingCounter++}`
}

/**
 * Write-once atomic package hydration.
 *
 * Creates a staging directory `specs/bluepriNNts/<base>/.staging-<pid>-<time>/`,
 * writes the canonical `spec_NN.md`, a backward-compatible alias
 * `<base>_V_<version>_NN.md`, and any `procedures/`, `samples/` and `assets/`
 * carried by a full package payload, then atomically renames the staging
 * directory to `specs/bluepriNNts/<base>/V_<version>/`. If the target package
 * directory already exists and is non-empty it is treated as immutable and left
 * untouched.
 *
 * `payload` accepts either a bare spec string (spec-only hydration) or a full
 * {@link TemplatePackagePayload}.
 */
export async function hydrateBlueprintPackageAtomically(
  rootDir: string,
  base: string,
  version: string,
  payload: string | TemplatePackagePayload,
  opts?: { baseDir?: string },
): Promise<string> {
  const pkg: TemplatePackagePayload = typeof payload === 'string' ? { spec: payload } : payload
  const verSegment = `V_${normalizeVersion(version).replace(/\./g, '-')}`
  const templatesBase = opts?.baseDir ?? join(rootDir, 'specs', 'bluepriNNts')
  const targetPkgDir = join(templatesBase, base, verSegment)

  // Write-once immutability check
  try {
    const existing = await readdir(targetPkgDir)
    if (existing.length > 0) {
      return targetPkgDir
    }
  } catch (err) {
    /* v8 ignore start */
    // swallow deliberately: the target dir does not exist yet (write-once).
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn(`[resolver-node] Failed to inspect package dir ${targetPkgDir}: ${err}`)
    }
    /* v8 ignore stop */
  }

  const baseBlueprintsDir = join(templatesBase, base)
  await mkdir(baseBlueprintsDir, { recursive: true })

  const stagingDir = join(baseBlueprintsDir, `.staging-${uniqueSuffix()}`)
  await mkdir(stagingDir, { recursive: true })

  const specFileName = SPEC_FILENAME
  const namedFileName = `${base}_${verSegment}_NN.md`
  await writeFile(join(stagingDir, specFileName), pkg.spec, 'utf-8')
  await writeFile(join(stagingDir, namedFileName), pkg.spec, 'utf-8')
  await writeStagedTree(stagingDir, 'procedures', pkg.procedures)
  await writeStagedTree(stagingDir, 'samples', pkg.samples)
  await writeStagedTree(stagingDir, 'assets', pkg.assets)
  await writeStagedTree(stagingDir, 'skills', pkg.skills)

  try {
    await rename(stagingDir, targetPkgDir)
  } catch (err) {
    /* v8 ignore start */
    // log + continue: cross-device rename fallback — copy + remove instead.
    console.warn(`[resolver-node] Staging rename failed (${err}); falling back to copy`)
    try {
      const { cp } = await import('node:fs/promises')
      await mkdir(targetPkgDir, { recursive: true })
      await cp(stagingDir, targetPkgDir, { recursive: true })
      await rm(stagingDir, { recursive: true, force: true }).catch(() => {})
    } catch (err) {
      // log + continue: copy fallback failed — return the staging dir as-is.
      console.warn(`[resolver-node] Copy fallback failed for ${targetPkgDir}: ${err}`)
    }
    /* v8 ignore stop */
  }

  return targetPkgDir
}

/**
 * Thrown when a package's `skills/` tree could not be fetched completely.
 *
 * Hydration is write-once: a version dir that exists is never rewritten. Hydrating a partial
 * `skills/` tree would therefore freeze a broken package forever. Failing the fetch (and
 * skipping hydration) keeps the version dir absent, so the next resolution retries cleanly.
 */
export class IncompleteSkillsTreeError extends Error {
  constructor(detail: string) {
    super(`skills/ tree is incomplete: ${detail}`)
    this.name = 'IncompleteSkillsTreeError'
  }
}

/**
 * Fetch a complete template package from a tag-pinned GitHub release.
 *
 * `spec_NN.md` is fetched from the raw host at `<ref>`; `procedures/`,
 * `samples/`, `assets/` and (recursively) `skills/` are enumerated via the GitHub contents API at the
 * same `ref` and each entry raw-fetched. Any missing subdirectory is simply
 * absent from the returned payload; a failure to fetch the primary spec throws.
 *
 * `ref` is required and must match `^blueprints-v\d+\.\d+\.\d+$`.
 */
export async function fetchBlueprintPackageFromRemote(
  base: string,
  version: string,
  options: {
    repo?: string
    ref?: string
    timeout?: number
    token?: string
    access?: 'public' | 'authenticated'
  } = {},
): Promise<TemplatePackagePayload> {
  if (!options.ref) {
    throw new Error('ref is required for fetchBlueprintPackageFromRemote')
  }
  if (!/^blueprints-v\d+\.\d+\.\d+$/.test(options.ref)) {
    throw new Error(
      `Invalid blueprint ref "${options.ref}": must match ^blueprints-v\\d+\\.\\d+\\.\\d+$`,
    )
  }
  const ref = options.ref
  const repo = options.repo ?? 'cogNNitive/cogNNitive-web'
  const timeout = options.timeout ?? 10000
  const dirInRepo = `iNNfo/specs/bluepriNNts/${base}`
  const specName = SPEC_FILENAME
  const rawBase = `https://raw.githubusercontent.com/${repo}/${ref}/${dirInRepo}`

  // Resolve the bearer token from options first (an explicit, programmatic
  // caller), then the environment / credentials file. A blueprint that
  // declares `access: authenticated` must have a token or the fetch fails
  // fast with setup instructions rather than a confusing 401.
  const token = options.token ?? resolveAuthToken() ?? undefined
  if (options.access === 'authenticated' && !token) {
    throw new BlueprintAuthError(
      `Blueprint "${base}" requires authentication but no token was found. ` +
        'Set COGNNITIVE_TOKEN or add { "token": "…" } to ~/.agents/credentials.json.',
    )
  }
  const authHeaders: Record<string, string> | undefined = token
    ? { Authorization: `Bearer ${token}` }
    : undefined

  try {
    const spec = await download(`${rawBase}/${specName}`, timeout, authHeaders)

    // `recursive` is opt-in (only `skills/`): samples/assets keep their flat payload.
    // `strict` (used for `skills/` only) turns every failure into IncompleteSkillsTreeError instead
    // of a warn-and-skip: a top-level 404 still means "no skills/ dir" (absent), but any other
    // listing failure, a vanished nested dir, or an undownloadable file means the tree is partial.
    const fetchSubdir = async (
      name: string,
      opts: { recursive?: boolean; strict?: boolean; nested?: boolean } = {},
    ): Promise<Record<string, string> | undefined> => {
      let entries: Array<{ name: string; type: string; path: string }>
      try {
        const apiUrl = `https://api.github.com/repos/${repo}/contents/${dirInRepo}/${name}?ref=${encodeURIComponent(ref)}`
        const listing = JSON.parse(await download(apiUrl, timeout, authHeaders))
        entries = Array.isArray(listing) ? listing : []
      } catch (err) {
        if (opts.strict && (opts.nested || !/HTTP 404/.test(String(err)))) {
          throw new IncompleteSkillsTreeError(`listing ${dirInRepo}/${name} failed: ${redactToken(String(err), token)}`)
        }
        /* v8 ignore start */
        // log + continue: fetchSubdir is best effort — a missing subdirectory is
        // simply absent from the payload.
        console.warn(`[resolver-node] Failed to list subdir ${dirInRepo}/${name}: ${redactToken(String(err), token)}`)
        return undefined
        /* v8 ignore stop */
      }
      const out: Record<string, string> = {}
      for (const entry of entries) {
        if (entry.type === 'dir' && opts.recursive) {
          const nested = await fetchSubdir(`${name}/${entry.name}`, { ...opts, nested: true })
          for (const [rel, body] of Object.entries(nested ?? {})) {
            out[`${entry.name}/${rel}`] = body
          }
          continue
        }
        if (entry.type !== 'file') continue
        try {
          out[entry.name] = await download(`${rawBase}/${name}/${entry.name}`, timeout, authHeaders)
        } catch (err) {
          if (opts.strict) {
            throw new IncompleteSkillsTreeError(`fetching ${name}/${entry.name} failed: ${redactToken(String(err), token)}`)
          }
          /* v8 ignore start */
          // log + continue: an unfetchable asset is skipped — the package
          // hydrates without it.
          console.warn(`[resolver-node] Failed to fetch asset ${name}/${entry.name}: ${redactToken(String(err), token)}`)
          /* v8 ignore stop */
        }
      }
      return Object.keys(out).length > 0 ? out : undefined
    }

    return {
      spec,
      procedures: await fetchSubdir('procedures'),
      samples: await fetchSubdir('samples'),
      assets: await fetchSubdir('assets'),
      skills: await fetchSubdir('skills', { recursive: true, strict: true }),
    }
  } catch (err) {
    // Every diagnostic path rejects with a token-redacted message. A rejected
    // authenticated fetch is surfaced as BlueprintAuthError with setup steps.
    const message = redactToken(err instanceof Error ? err.message : String(err), token)
    if (authHeaders && /HTTP 40[13]/.test(message)) {
      throw new BlueprintAuthError(
        `${message} — blueprint authentication failed. Verify COGNNITIVE_TOKEN or ~/.agents/credentials.json.`,
      )
    }
    if (err instanceof Error) {
      err.message = message
      throw err
    }
    throw new Error(message)
  }
}

/**
 * Write `content` to `path` atomically: write to a sibling temp file, then
 * rename over the destination. Never leaves a partially-written file at
 * `path` for a concurrent reader to observe.
 */
async function atomicWriteFile(path: string, content: string): Promise<void> {
  const tmpPath = `${path}.tmp-${uniqueSuffix()}`
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
  } catch (err) {
    /* v8 ignore start */
    // swallow deliberately: file doesn't exist yet — fall through to write it.
    if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      console.warn(`[resolver-node] Failed to probe write-once spec ${path}: ${err}`)
    }
    /* v8 ignore stop */
  }
  await atomicWriteFile(path, content)
}

export async function resolveParentChainNode(
  rootDir: string,
  parentUrl: string,
  parentName: string,
  options: ResolverOptionsWithFreshness = {},
): Promise<ResolvedCache> {
  const maxDepth = options.maxDepth ?? MAX_DEPTH_DEFAULT
  const timeout = options.timeout ?? 10000
  const specsDir = join(rootDir, 'specs')
  // Effective cache dir: `inPlace` restores pure legacy behavior (the temp
  // cache is neither read nor written — every `cacheDir !== specsDir` guard
  // below goes quiet); otherwise the OS temp cache (or an explicit
  // `cacheDir`) takes all fetch-and-save writes while reads still prefer the
  // workspace tree (vendored specs win over cached fetches).
  const cacheDir = options.inPlace === true ? specsDir : (options.cacheDir ?? defaultCacheDir())
  const writeDir = cacheDir
  const blueprintsBaseDir = join(cacheDir, 'bluepriNNts')
  const specs = new Map<string, SpecDocument>()
  const chain: string[] = []
  const freshness = new Map<string, FreshnessResult>()

  let currentUrl: string | undefined = parentUrl
  let currentName: string | undefined = parentName
  let depth = 0

  await mkdir(writeDir, { recursive: true })

  while (currentUrl && currentName && depth < maxDepth) {
    let content: string | null = null
    let resolvedFromLocalTier = false
    const attempted: string[] = []

    // 0. If currentUrl is a local file path or file:// URI, read directly via readFile
    const localPath = isLocalPath(currentUrl) ? toLocalFilePath(currentUrl, rootDir) : null
    if (localPath) {
      attempted.push(`local path "${localPath}"`)
      try {
        content = await readFile(localPath, 'utf-8')
        const specName = canonicalSpecFilename(currentName, content)
        await saveSpecOnce(writeDir, `${specName}_NN.md`, content).catch(() => {})
      } catch (err) {
        /* v8 ignore start */
        // log + continue: this tier missed — fall through to the next tier.
        console.warn(`[resolver-node] Local tier missed for ${currentName}: ${err}`)
        content = null
        /* v8 ignore stop */
      }
    }

    // 1. 4-tier blueprint package resolution (workspace package -> workspace flat -> global -> skill)
    if (content === null && !isLocalPath(currentUrl)) {
      attempted.push(`4-tier package resolver for "${currentName}" in "${specsDir}"`)
      const pkg = await resolveBlueprintPackage(rootDir, currentName, undefined, options)
      if (pkg) {
        content = await readFile(pkg.specFilePath, 'utf-8')
        resolvedFromLocalTier = true
      }
    }

    // 1b. OS temp cache reuse: a previous default run already fetched this spec.
    if (content === null && cacheDir !== specsDir && !isLocalPath(currentUrl)) {
      attempted.push(`temp cache dir "${cacheDir}"`)
      const hit = await findLocalSpec(cacheDir, currentName)
      if (hit) {
        content = await readFile(hit, 'utf-8').catch(() => null)
      }
    }

    // 2. Download from network and hydrate into specs/bluepriNNts/<name>/<version>/
    if (content === null && /^https?:\/\//i.test(currentUrl)) {
      attempted.push(`network url "${currentUrl}"`)
      try {
        content = await download(currentUrl, timeout)
        const fmVer = versionFromFrontmatter(content) || '0.1.0'
        const baseName = parseSpecName(currentName).base
        // Best-effort: pull the full package (procedures/samples/assets) from the
        // tag-pinned release so agents have execution context offline. Falls
        // back to spec-only hydration if the tag/API is unreachable.
        let payload: string | TemplatePackagePayload = content
        const tagMatch = currentUrl.match(/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/([^/]+)\//)
        if (tagMatch && /^blueprints-v\d+\.\d+\.\d+$/.test(tagMatch[2])) {
          payload = await fetchBlueprintPackageFromRemote(baseName, fmVer, {
            repo: tagMatch[1],
            ref: tagMatch[2],
            timeout,
          }).catch((err) => {
            // An incomplete skills/ tree must not degrade to spec-only hydration: that would
            // freeze a skill-less version dir (write-once). Propagate so nothing is hydrated
            // and the next resolution retries.
            if (err instanceof IncompleteSkillsTreeError) throw err
            return content as string
          })
        }
        await hydrateBlueprintPackageAtomically(rootDir, baseName, fmVer, payload, {
          baseDir: blueprintsBaseDir,
        })
        const specName = canonicalSpecFilename(currentName, content)
        await saveSpecOnce(writeDir, `${specName}_NN.md`, content)
      } catch (err) {
        /* v8 ignore start */
        // log + continue: network/hydration tier missed — report unresolved.
        console.warn(`[resolver-node] Network tier missed for ${currentName}: ${err}`)
        content = null
        /* v8 ignore stop */
      }
    }

    // 3. Built-in Canonical Fallback Registry (Tier 4 / Offline fallback)
    if (content === null && !isLocalPath(currentUrl)) {
      const isRemote = /^https?:\/\//i.test(currentUrl)
      // Host-agnostic: the canonical raw host moved from the private monorepo
      // (cogNNitive/cogNNitive) to the public distribution repo
      // (cogNNitive/cogNNitive-web); either is a valid canonical source for the
      // offline fallback registry. Matching any cogNNitive raw repo keeps this
      // working across future host moves.
      const isCanonicalRemote =
        isRemote &&
        /raw\.githubusercontent\.com\/cogNNitive\/[^/]+\/(main|v[\d.]+)\//i.test(currentUrl)
      if (!isRemote || isCanonicalRemote) {
        attempted.push(`canonical fallback registry for "${currentName}"`)
        const canonical =
          findCanonicalBlueprint(currentName) ||
          (currentUrl ? findCanonicalBlueprint(currentUrl) : null)
        if (canonical) {
          content = canonical.specContent
          resolvedFromLocalTier = true
        }
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

    // Opt-in freshness: compare the requested template (depth 0) that came
    // from a LOCAL tier against its canonical remote. Chain parents are never
    // checked; network-resolved and local-path docs are not compared.
    if (
      options.checkFreshness === true &&
      depth === 0 &&
      resolvedFromLocalTier &&
      /^https?:\/\//i.test(currentUrl)
    ) {
      freshness.set(currentName, {
        name: currentName,
        url: currentUrl,
        verdict: await freshnessVerdict(currentUrl, content, timeout),
      })
    }

    currentName = doc.parentName
    currentUrl = doc.parentUrl
    depth++
  }

  if (depth >= maxDepth && currentUrl) {
    throw new Error(`Circular parent chain detected at depth ${maxDepth}`)
  }

  // Additive composition: pull in every template named by a resolved level-2
  // template's `includes` list (recursively), so `resolveBlueprintSchema` in
  // nn-core can compose their schemas offline. Best-effort — an
  // unresolvable include is left out and surfaces later as a validation error.
  await resolveIncludesInto(specs, specsDir, timeout, undefined, cacheDir)

  const result: ResolvedCache = { specs, chain }
  if (options.checkFreshness === true) result.freshness = freshness
  return result
}

/** Resolve one spec's raw content: local specs dir first, temp cache second, 4-tier package resolver third, then network. */
export async function fetchSpecContent(
  name: string,
  url: string | undefined,
  specsDir: string,
  timeout: number,
  cacheDir?: string,
): Promise<string | null> {
  const localPath =
    url && isLocalPath(url) ? toLocalFilePath(url, specsDir.replace(/[/\\]specs[/\\]?$/, '')) : null
  if (localPath) {
    const direct = await readFile(localPath, 'utf-8').catch(() => null)
    if (direct !== null) return direct
  }
  const local = await findLocalSpec(specsDir, name)
  if (local) return readFile(local, 'utf-8').catch(() => null)
  if (cacheDir && cacheDir !== specsDir) {
    const hit = await findLocalSpec(cacheDir, name)
    if (hit) return readFile(hit, 'utf-8').catch(() => null)
  }
  const rootDir = specsDir.replace(/[/\\]specs[/\\]?$/, '')
  const pkg = await resolveBlueprintPackage(rootDir, name).catch(() => null)
  if (pkg) return readFile(pkg.specFilePath, 'utf-8').catch(() => null)
  if (url && /^https?:\/\//i.test(url)) {
    try {
      const content = await download(url, timeout)
      await saveSpecOnce(
        cacheDir ?? specsDir,
        `${canonicalSpecFilename(name, content)}_NN.md`,
        content,
      ).catch(() => {})
      return content
    } catch (err) {
      /* v8 ignore start */
      // log + continue: network resolution failed — report unresolved.
      console.warn(`[resolver-node] Network fetch failed for ${name}: ${err}`)
      /* v8 ignore stop */
    }
  }
  const isRemote = url && /^https?:\/\//i.test(url)
  const isCanonicalRemote =
    isRemote && /raw\.githubusercontent\.com\/cogNNitive\/[^/]+\/(main|v[\d.]+)\//i.test(url)
  if (!isRemote || isCanonicalRemote) {
    const canonical = findCanonicalBlueprint(name) || (url ? findCanonicalBlueprint(url) : null)
    if (canonical) return canonical.specContent
  }
  return null
}

/**
 * Resolve a set of `includes` refs (recursively following nested `includes`)
 * into a `name → raw content` map, for building an nn-core `IncludeResolver`.
 * `specsBaseDir` is the repo root; templates are looked up under its `specs/`.
 * Keys are stored in both original name and lowercase name for case-insensitive lookup (Fix W-01).
 */
export async function buildIncludeContentMap(
  specsBaseDir: string,
  refs: Array<{ name: string; url: string }>,
  timeout = 10000,
  cacheDir?: string,
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
    const content = await fetchSpecContent(
      ref.name,
      ref.url || undefined,
      specsDir,
      timeout,
      cacheDir,
    )
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
  cacheDir?: string,
): Promise<void> {
  const queue: SpecDocument[] = [...specs.values()]
  while (queue.length > 0) {
    const doc = queue.shift()!
    const includes = doc.frontmatter?.includes ?? []
    for (const ref of includes) {
      const key = ref.name.toLowerCase()
      if (seen.has(key) || specs.has(ref.name)) continue
      seen.add(key)
      const content = await fetchSpecContent(
        ref.name,
        ref.url || undefined,
        specsDir,
        timeout,
        cacheDir,
      )
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
