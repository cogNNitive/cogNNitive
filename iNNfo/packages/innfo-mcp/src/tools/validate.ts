import { readFile, readdir, stat } from 'node:fs/promises'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import {
  parseModel,
  validateDocument,
  validateTemplateAgainstMetaschema,
  resolveTemplateSchema,
  SpecResolutionError,
  parseFrontmatter,
  recursiveParse,
  buildWorkspaceIndex,
  validateWorkspaceReferences,
} from '@cognnitive/innfo-core'
import type {
  SpecDocument,
  ValidationError,
  ParsedModel,
  SubmodelResolver,
  SpecCache,
  TemplateSchemaResolver,
  DirectoryHandleLike,
  FileHandleLike,
  ReferenceDiagnostic,
} from '@cognnitive/innfo-core'
import { resolveTemplateWithCache, findModelFile, deriveNameFromUrl, getSpec } from './spec.js'
import { buildIncludeContentMap } from './resolver-node.js'
import { loadModel } from './model-io.js'

function syncFindSubmodel(rootDir: string, cleanPath: string, referringDir?: string): string | null {
  const directCandidates = [
    join(rootDir, cleanPath),
    referringDir ? join(referringDir, cleanPath) : null,
    join(rootDir, 'models', cleanPath),
  ].filter(Boolean) as string[]

  for (const p of directCandidates) {
    if (existsSync(p)) return p
    if (existsSync(`${p}.md`)) return `${p}.md`
    if (existsSync(`${p}_NN.md`)) return `${p}_NN.md`
  }

  const baseName = basename(cleanPath, '.md').replace(/_NN$/i, '')
  const candidateNames = new Set([
    `${baseName}_NN.md`.toLowerCase(),
    `${baseName}.md`.toLowerCase(),
    baseName.toLowerCase(),
    cleanPath.toLowerCase(),
    `${cleanPath}.md`.toLowerCase(),
    `${cleanPath}_NN.md`.toLowerCase(),
  ])

  function searchDirSync(dir: string, depth = 0): string | null {
    if (depth > 8) return null
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      const subdirs: string[] = []
      for (const entry of entries) {
        const lower = entry.name.toLowerCase()
        if (entry.isFile() && candidateNames.has(lower)) {
          return join(dir, entry.name)
        }
        if (entry.isDirectory()) {
          if (
            ![
              'node_modules',
              '.git',
              'dist',
              '.spec-cache',
              'specs',
              'backups',
              'archive',
            ].includes(lower)
          ) {
            subdirs.push(join(dir, entry.name))
          }
        }
      }
      for (const subdir of subdirs) {
        const found = searchDirSync(subdir, depth + 1)
        if (found) return found
      }
    } catch {
      return null
    }
    return null
  }

  return searchDirSync(rootDir)
}

/**
 * Builds a SYNCHRONOUS `TemplateSchemaResolver` (innfo-core's C1 callback
 * type, `recursiveParser/types.ts`) reading from an already-resolved
 * `SpecCache` (produced by `resolveTemplateWithCache`). Every template named
 * by a node's `parent_spec.name` — plus everything on its `includes` chain —
 * is already present in `cache.specs`, so no I/O happens at call time.
 *
 * Not wired into `validateModel` in this slice (C1/PR3): the workspace-mode
 * entry point that calls `recursiveParse` with this resolver is a later
 * slice (PR5a). `validateModel`'s single-file behavior is unchanged here.
 */
export function buildTemplateSchemaResolverFromCache(
  cache: SpecCache | null,
): TemplateSchemaResolver {
  return ({ frontmatter }) => {
    if (!cache) return null
    const name = (frontmatter as { parent_spec?: { name?: string } } | undefined)?.parent_spec
      ?.name
    if (!name) return null
    const doc =
      cache.specs.get(name) ??
      [...cache.specs.values()].find((d) => d.name.toLowerCase() === name.toLowerCase())
    if (!doc) return null
    const resolveInclude = (ref: { name: string; url: string }): string | null => {
      const direct = cache.specs.get(ref.name)
      if (direct) return direct.rawContent
      for (const d of cache.specs.values()) {
        if (d.name.toLowerCase() === ref.name.toLowerCase()) return d.rawContent
      }
      return null
    }
    try {
      return resolveTemplateSchema(doc.rawContent, resolveInclude).schema
    } catch {
      return null
    }
  }
}

/* ── Node-backed DirectoryHandleLike (workspace mode) ──────────── */

/**
 * Minimal `FileHandleLike` reading a single real file lazily (only when
 * `getFile().text()` is actually awaited), backed by `node:fs/promises`.
 */
function createNodeFileHandle(filePath: string, name: string): FileHandleLike {
  return {
    kind: 'file',
    name,
    async getFile() {
      const text = await readFile(filePath, 'utf-8')
      return { text: async () => text }
    },
  }
}

/**
 * Minimal `DirectoryHandleLike` backed by `node:fs/promises`, so
 * `recursiveParse` can walk `rootDir` directly (no `ModelDriver`
 * implementation needed — `recursiveParse` falls back to plain
 * `DirectoryHandleLike` traversal whenever no driver is supplied).
 */
function createNodeDirectoryHandle(dirPath: string): DirectoryHandleLike {
  return {
    kind: 'directory',
    name: basename(dirPath) || dirPath,
    async *entries() {
      let dirents
      try {
        dirents = await readdir(dirPath, { withFileTypes: true })
      } catch {
        return
      }
      for (const dirent of dirents) {
        if (dirent.isDirectory()) {
          yield [dirent.name, createNodeDirectoryHandle(join(dirPath, dirent.name))] as [
            string,
            DirectoryHandleLike,
          ]
        } else if (dirent.isFile()) {
          yield [dirent.name, createNodeFileHandle(join(dirPath, dirent.name), dirent.name)] as [
            string,
            FileHandleLike,
          ]
        }
      }
    },
    async getFileHandle(name: string) {
      const filePath = join(dirPath, name)
      try {
        const stats = await stat(filePath)
        if (!stats.isFile()) throw new Error('not a file')
      } catch {
        throw Object.assign(new Error(`file not found: ${name}`), { code: 'ENOENT' })
      }
      return createNodeFileHandle(filePath, name)
    },
    async getDirectoryHandle(name: string) {
      const subPath = join(dirPath, name)
      try {
        const stats = await stat(subPath)
        if (!stats.isDirectory()) throw new Error('not a directory')
      } catch {
        throw Object.assign(new Error(`directory not found: ${name}`), { code: 'ENOENT' })
      }
      return createNodeDirectoryHandle(subPath)
    },
  }
}

/**
 * Workspace-scope cross-model validation (PR5a wiring; `checkOne` is
 * stubbed to `[]` until PR5b, so this always resolves to `[]` today — the
 * plumbing exists so PR5b only has to fill in `checkOne`'s body).
 *
 * Runs a Node-backed `recursiveParse` over the whole `rootDir`, threading
 * the SAME synchronous template-schema resolver the per-file pass already
 * warms via `resolveTemplateWithCache` (AD-04: absent/throwing resolver
 * degrades a node to "no schema", never aborts the parse), builds the
 * `WorkspaceIndex`, runs `validateWorkspaceReferences`, and returns only the
 * diagnostics whose `path` names the requested model (by its
 * workspace-relative path, forward-slashed) — never in place of the
 * per-file `validateDocument`/`validateModel` pass above.
 */
async function runWorkspaceValidation(
  rootDir: string,
  resolvedModelPath: string,
  cache: SpecCache | null,
): Promise<ReferenceDiagnostic[]> {
  const resolveSchema: TemplateSchemaResolver = buildTemplateSchemaResolverFromCache(cache)
  const rootHandle = createNodeDirectoryHandle(rootDir)
  const result = await recursiveParse(rootHandle, undefined, { resolveTemplateSchema: resolveSchema })
  const index = buildWorkspaceIndex(result)
  const diagnostics = validateWorkspaceReferences(result, index)

  const relativeModelPath = relative(rootDir, resolvedModelPath).replace(/\\/g, '/')
  return diagnostics.filter(
    (diag) => diag.path.includes(relativeModelPath) || diag.path.includes(resolvedModelPath),
  )
}

/* ── validate_model ──────────────────────────────────────────── */

/**
 * Validate a model against its template.
 * Provide either `id` (reads from disk) or `content` (inline raw text).
 */
export async function validateModel(
  rootDir: string,
  id?: string,
  content?: string,
  templateUrl?: string,
  workspace?: boolean,
): Promise<{
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}> {
  let model: ParsedModel

  if (content) {
    model = parseModel(content)
  } else if (id) {
    const filePath = await findModelFile(rootDir, id)
    if (!filePath) {
      return {
        valid: false,
        errors: [{ path: '', message: `Model not found: ${id}`, severity: 'error' }],
        warnings: [],
      }
    }
    model = await loadModel(filePath)
  } else {
    return {
      valid: false,
      errors: [{ path: '', message: 'Provide either id or content', severity: 'error' }],
      warnings: [],
    }
  }

  // D1: Auto-detect Level 2 templates and delegate to validateTemplate
  if (model.frontmatter.level === 2) {
    return validateTemplate(rootDir, id, content, templateUrl)
  }

  // Resolve the template only from the model's parent_spec.url, or from an
  // explicit templateUrl supplied by the caller. Never from a constant. The
  // resolved cache also carries every template named by the template's
  // `includes`, exposed here as an `IncludeResolver` for additive composition.
  let template: SpecDocument | null = null
  let resolveInclude: (ref: { name: string; url: string }) => string | null = () => null
  let resolutionDetail: string | null = null
  let specCache: SpecCache | null = null
  const parentRef = model.frontmatter.parent_spec
  try {
    if (parentRef?.url && parentRef?.name) {
      const resolved = await resolveTemplateWithCache(rootDir, parentRef.url, parentRef.name)
      template = resolved.template
      resolveInclude = resolved.resolveInclude
      specCache = resolved.cache
    }
    if (!template && templateUrl) {
      const resolved = await resolveTemplateWithCache(
        rootDir,
        templateUrl,
        deriveNameFromUrl(templateUrl),
      )
      template = resolved.template
      resolveInclude = resolved.resolveInclude
    }
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'SpecResolutionError' || err instanceof SpecResolutionError)
    ) {
      resolutionDetail = err.message
    }
  }

  // One door: hygiene (validateFormatContent) + schema conformance
  // (validateModel, with `includes` composition) in a single pass.
  const resolvedModelPath = id ? await findModelFile(rootDir, id) : null
  const referringDir = resolvedModelPath ? dirname(resolvedModelPath) : rootDir
  const fileNameForCheck = id ? basename(resolvedModelPath ?? id) : 'inline_NN.md'

  const resolveSubmodel: SubmodelResolver = (refPath: string) => {
    try {
      const clean = refPath.replace(/^\[\[\s*/, '').replace(/\s*\]\]$/, '').trim()
      const foundPath = syncFindSubmodel(rootDir, clean, referringDir)
      if (!foundPath) {
        return { exists: false }
      }
      const raw = readFileSync(foundPath, 'utf-8')
      const fm = parseFrontmatter(raw)
      const templateName =
        fm?.parent_spec?.name ?? (typeof fm?.title === 'string' ? fm.title : undefined)
      const templateUrl = fm?.parent_spec?.url
      return { exists: true, templateName, templateUrl }
    } catch {
      return { exists: false }
    }
  }

  const doc = validateDocument(model.rawContent, {
    fileName: fileNameForCheck,
    template,
    resolveInclude,
    resolveSubmodel,
    referringPath: resolvedModelPath ?? undefined,
  })
  const result = { valid: doc.valid, errors: [...doc.errors], warnings: [...doc.warnings] }
  const warnings: ValidationError[] = [...result.warnings]
  if (!template) {
    const parentUrl = model.frontmatter?.parent_spec?.url
    if (parentUrl) {
      // The model declares a parent that could not be resolved — this is a
      // hard error, not a structural-only warning. coreValidate already emits
      // [PARENT_RESOLUTION_FAILED]; surface the offending URL explicitly,
      // the directories searched, and the per-link resolution attempts.
      const searchedSuffix = ` (searched: ${rootDir}/specs, network)`
      const detailSuffix = resolutionDetail ? ` Detail: ${resolutionDetail}` : ''
      result.errors.push({
        path: 'parent_spec',
        message: `[PARENT_RESOLUTION_FAILED] Parent template could not be resolved from parent_spec.url "${parentUrl}"${searchedSuffix}${detailSuffix}`,
        severity: 'error',
      })
    } else {
      warnings.push({
        path: 'parent_spec',
        message: 'No template resolved; structural validation only',
        severity: 'warning',
      })
    }
  }

  // D8: Decorate errors and warnings with originating file path
  const modelPath = id ? ((await findModelFile(rootDir, id)) ?? id) : 'inline'
  const templatePath = template?.name ? `${template.name}_NN.md` : 'parent_spec'

  const errors = result.errors.map((e) => ({
    ...e,
    filePath: e.path.startsWith('parent') ? templatePath : modelPath,
  }))

  const warningsWithFile = warnings.map((w) => ({
    ...w,
    filePath: w.path.startsWith('parent') ? templatePath : modelPath,
  }))

  // Workspace-scope cross-model validation (PR5a): purely additive, and a
  // no-op today since `checkOne` is stubbed to `[]` (PR5b implements it).
  // Default `false` ⇒ everything above this line is today's behavior,
  // byte-for-byte, `valid` included. Requires `id` mode (a real file on
  // disk) — inline `content` has no workspace position to scope
  // diagnostics to.
  let valid = result.valid
  if (workspace && id && modelPath !== 'inline') {
    const workspaceDiagnostics = await runWorkspaceValidation(rootDir, modelPath, specCache)
    for (const diag of workspaceDiagnostics) {
      const decorated = { path: diag.path, message: diag.message, severity: diag.severity, filePath: modelPath }
      if (diag.severity === 'error') {
        errors.push(decorated)
        valid = false
      } else {
        warningsWithFile.push(decorated)
      }
    }
  }

  return { valid, errors, warnings: warningsWithFile }
}

/* ── validate_model_url ─────────────────────────────────────── */

/**
 * Validate a model fetched from a URL without writing to disk.
 * Accepts a model URL and optional template_url. Fetches the model content,
 * then delegates to validateModel (content mode).
 */
export async function validateModelUrl(
  rootDir: string,
  modelUrl: string,
  templateUrl?: string,
): Promise<{
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}> {
  let content: string
  try {
    const response = await fetch(modelUrl)
    if (!response.ok) {
      return {
        valid: false,
        errors: [
          {
            path: '',
            message: `Failed to fetch model URL: ${response.status} ${response.statusText}`,
            severity: 'error',
          },
        ],
        warnings: [],
      }
    }
    content = await response.text()
  } catch (err) {
    return {
      valid: false,
      errors: [{ path: '', message: `Model URL unreachable: ${err}`, severity: 'error' }],
      warnings: [],
    }
  }

  return validateModel(rootDir, undefined, content, templateUrl)
}

/* ── validate_template ──────────────────────────────────────── */

/**
 * Validate a Level 2 template against its Level 1 parent spec.
 * Auto-detects frontmatter `level === 2` and resolves parent spec from parent_spec.url or explicit url.
 * Emits [PARENT_RESOLUTION_FAILED] diagnostic error if the parent spec cannot be resolved.
 *
 * @param rootDir Workspace root directory
 * @param id Template model id on disk
 * @param content Raw template content string
 * @param url Explicit parent spec URL override
 */
export async function validateTemplate(
  rootDir: string,
  id?: string,
  content?: string,
  url?: string,
): Promise<{
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}> {
  let templateContent: string
  if (content) {
    templateContent = content
  } else if (id) {
    const filePath = await findModelFile(rootDir, id)
    if (!filePath) {
      return {
        valid: false,
        errors: [{ path: '', message: `Template file not found: ${id}`, severity: 'error' }],
        warnings: [],
      }
    }
    templateContent = await readFile(filePath, 'utf-8').catch(() => '')
    if (!templateContent) {
      return {
        valid: false,
        errors: [{ path: '', message: `Failed to read template file: ${id}`, severity: 'error' }],
        warnings: [],
      }
    }
  } else {
    return {
      valid: false,
      errors: [{ path: '', message: 'Provide either id or content', severity: 'error' }],
      warnings: [],
    }
  }

  const parsed = parseModel(templateContent)
  const fm = parsed.frontmatter

  const parentUrl = url ?? fm?.parent_spec?.url
  if (!parentUrl) {
    return {
      valid: false,
      errors: [
        {
          path: 'parent_spec',
          message: '[PARENT_RESOLUTION_FAILED] Parent spec URL missing for level-2 template',
          severity: 'error',
        },
      ],
      warnings: [],
    }
  }

  let parentSpec = null
  let resolutionDetail: string | null = null
  try {
    const result = await getSpec(rootDir, { url: parentUrl })
    parentSpec = result.spec
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'SpecResolutionError' || err instanceof SpecResolutionError)
    ) {
      resolutionDetail = err.message
    }
  }
  if (!parentSpec) {
    const detailSuffix = resolutionDetail ? ` Detail: ${resolutionDetail}` : ''
    return {
      valid: false,
      errors: [
        {
          path: 'parent_spec',
          message: `[PARENT_RESOLUTION_FAILED] Parent spec '${parentUrl}' could not be resolved${detailSuffix}`,
          severity: 'error',
        },
      ],
      warnings: [],
    }
  }

  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  if (fm?.level !== undefined && fm.level !== 2) {
    errors.push({
      path: 'frontmatter.level',
      message: `Expected level 2 for template, got ${fm.level}`,
      severity: 'error',
    })
  }

  if (!fm?.title) {
    errors.push({
      path: 'frontmatter.title',
      message: 'Missing title in template frontmatter',
      severity: 'error',
    })
  }

  // Schema-driven: check the template's root-primitive elements
  // (Concept/Field/Marker/Matrix Definition) against the level-1 metaschema
  // resolved from the parent spec. Same code path as level-3-against-template.
  for (const diag of validateTemplateAgainstMetaschema(templateContent, parentSpec.rawContent)) {
    ;(diag.severity === 'error' ? errors : warnings).push(diag)
  }

  // `includes` composition: resolve every referenced template and surface any
  // name collision (a Definition declared by two sources) as an ERROR.
  const includeRefs = fm?.includes ?? []
  if (includeRefs.length > 0) {
    const includeMap = await buildIncludeContentMap(rootDir, includeRefs)
    const composed = resolveTemplateSchema(
      templateContent,
      (ref) => includeMap.get(ref.name) ?? includeMap.get(ref.name.toLowerCase()) ?? null,
    )
    for (const diag of composed.errors) {
      ;(diag.severity === 'error' ? errors : warnings).push(diag)
    }
  }

  const templatePath = id ? ((await findModelFile(rootDir, id)) ?? id) : 'inline'
  const decoratedErrors = errors.map((e) => ({ ...e, filePath: templatePath }))
  const decoratedWarnings = warnings.map((w) => ({ ...w, filePath: templatePath }))

  return {
    valid: errors.length === 0,
    errors: decoratedErrors,
    warnings: decoratedWarnings,
  }
}
