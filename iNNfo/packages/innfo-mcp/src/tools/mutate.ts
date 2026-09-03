/**
 * validate_model and apply_change tools.
 *
 * validate_model runs the innfo-core validator against the resolved template.
 * apply_change performs intent-level operations on a model and re-validates.
 * On validation failure, the file is NOT written (reject-without-writing).
 */

import { readFile, writeFile, rm, stat, rename, readdir, mkdir } from 'node:fs/promises'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { deflateRawSync, crc32 } from 'node:zlib'
import {
  parseModel,
  serializeModel,
  validateDocument,
  validateModel as coreValidate,
  applyMutation as coreApplyMutation,
  validateTemplateAgainstMetaschema,
  resolveTemplateSchema,
  SpecResolutionError,
  parseFrontmatter,
} from '@cognnitive/innfo-core'
import type {
  SpecDocument,
  ValidationError,
  ParsedModel,
  ReachabilityGraph,
  SubmodelResolver,
} from '@cognnitive/innfo-core'

import {
  resolveTemplateWithCache,
  findModelFile,
  deriveNameFromUrl,
  getSpec,
  normalizeId,
} from './spec.js'
import {
  isLocalPath,
  toLocalFilePath,
  saveSpecOnce,
  buildIncludeContentMap,
  parseSpecName,
  normalizeVersion,
} from './resolver-node.js'

/* ── Types ───────────────────────────────────────────────────── */

export interface ApplyChangeResult {
  success: boolean
  model?: ParsedModel
  newPath?: string
  errors?: Array<{ path: string; message: string }>
  warnings?: Array<{ path: string; message: string }>
}

/* ── Core logic ──────────────────────────────────────────────── */

/**
 * Resolve a model's template from its `parent_spec.url` (source of truth).
 * Returns null when the model declares no resolvable parent.
 */
async function resolveTemplateForModel(
  rootDir: string,
  model: ParsedModel,
): Promise<{
  template: SpecDocument | null
  resolveInclude: (ref: { name: string; url: string }) => string | null
}> {
  const parent = model.frontmatter.parent_spec
  if (parent?.url && parent?.name) {
    const r = await resolveTemplateWithCache(rootDir, parent.url, parent.name)
    return { template: r.template, resolveInclude: r.resolveInclude }
  }
  return { template: null, resolveInclude: () => null }
}

/**
 * Load a model: read + parse.
 */
async function loadModel(filePath: string): Promise<ParsedModel> {
  const content = await readFile(filePath, 'utf-8')
  return parseModel(content)
}

/**
 * Save a model: serialize + write.
 */
async function saveModel(filePath: string, model: ParsedModel): Promise<void> {
  const content = serializeModel(model)
  await writeFile(filePath, content, 'utf-8')
}
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
  const parentRef = model.frontmatter.parent_spec
  try {
    if (parentRef?.url && parentRef?.name) {
      const resolved = await resolveTemplateWithCache(rootDir, parentRef.url, parentRef.name)
      template = resolved.template
      resolveInclude = resolved.resolveInclude
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
    const parentUrl = (model.frontmatter as any)?.parent_spec?.url
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

  return { valid: result.valid, errors, warnings: warningsWithFile }
}

/* ── apply_change ────────────────────────────────────────────── */

/** Matches the `_V_<major>-<minor>-<patch>_` segment in iNNfo filenames. */
const VERSION_FILENAME_RE = /_V_\d+-\d+-\d+_/

interface VersionParts {
  major: number
  minor: number
  patch: number
}

/** Parse `V_0-4-0`, `V_0.4.0`, `0-4-0`, ... into numeric parts. */
function parseVersion(v: string): VersionParts | null {
  const m = v.trim().match(/^V?_?(\d+)[-.](\d+)[-.](\d+)$/i)
  if (!m) return null
  return { major: parseInt(m[1], 10), minor: parseInt(m[2], 10), patch: parseInt(m[3], 10) }
}

function formatVersion(p: VersionParts): string {
  return `V_${p.major}-${p.minor}-${p.patch}`
}

/**
 * Compute the new model version from bump_version args.
 * Either an explicit `version` ("V_0-5-0") or a `bump` of
 * "major" | "minor" | "patch" (default patch) applied to the current
 * `model_version` frontmatter. Returns null when the args are invalid.
 */
function computeNewVersion(
  current: string | undefined,
  args: Record<string, unknown>,
): { version: string } | null {
  if (typeof args.version === 'string' && args.version.trim() !== '') {
    const parsed = parseVersion(args.version)
    if (!parsed) return null
    return { version: formatVersion(parsed) }
  }

  const bump = typeof args.bump === 'string' && args.bump.trim() !== '' ? args.bump.trim() : 'patch'
  if (!['major', 'minor', 'patch'].includes(bump)) return null
  if (!current) return null
  const parts = parseVersion(current)
  if (!parts) return null
  if (bump === 'major') parts.major += 1
  else if (bump === 'minor') parts.minor += 1
  else parts.patch += 1
  return { version: formatVersion(parts) }
}

/**
 * Apply the `bump_version` operation: set `frontmatter.model_version`, rename
 * the file to the canonical `_V_<version>_` filename, validate BEFORE writing,
 * and reject-without-writing on any failure.
 */
async function bumpVersion(
  rootDir: string,
  filePath: string,
  model: ParsedModel,
  args: Record<string, unknown>,
): Promise<ApplyChangeResult> {
  const next = computeNewVersion(model.frontmatter.model_version, args)
  if (!next) {
    return {
      success: false,
      errors: [
        {
          path: 'frontmatter.model_version',
          message:
            'Invalid version args for bump_version: provide { version: "V_x-y-z" } or { bump: "major" | "minor" | "patch" } against a valid model_version frontmatter',
        },
      ],
    }
  }

  model.frontmatter.model_version = next.version

  // Verify git working tree cleanliness or backup consent before modifying specs
  if (args.backup === true || args.prompt_backup === true) {
    await createSpecsBackupZip(rootDir).catch(() => {})
  } else {
    try {
      const { execSync } = await import('node:child_process')
      const gitStatus = execSync('git status --porcelain specs', {
        cwd: rootDir,
        encoding: 'utf-8',
      })
      if (gitStatus.trim() !== '') {
        await createSpecsBackupZip(rootDir).catch(() => {})
      }
    } catch {
      // Git status non-fatal
    }
  }

  const dir = dirname(filePath)
  const base = basename(filePath)
  const versionSegment = next.version.replace(/^V_/i, '')
  const newBase = base.replace(VERSION_FILENAME_RE, `_V_${versionSegment}_`)
  const newPath = join(dir, newBase)

  // If parent_version is provided, rename/bump the parent spec (template) as well!
  let oldParentPath: string | null = null
  let newParentPath: string | null = null
  let parentContent: string | null = null
  let newParentName: string | null = null

  if (model.frontmatter.parent_spec && typeof args.parent_version === 'string') {
    const parentVer = args.parent_version.trim()
    const parentVerSegment = parentVer.replace(/^V_/i, '').replace(/\./g, '-')
    const parentVerString = `V_${parentVerSegment}`

    const currentParentUrl = model.frontmatter.parent_spec.url
    if (currentParentUrl && isLocalPath(currentParentUrl)) {
      const localParentPath = toLocalFilePath(currentParentUrl, rootDir)
      try {
        await stat(localParentPath)
        oldParentPath = localParentPath

        // Compute new parent file name and path
        const parentDir = dirname(localParentPath)
        const parentBase = basename(localParentPath)
        const newParentBase = parentBase.replace(VERSION_FILENAME_RE, `_V_${parentVerSegment}_`)
        newParentPath = join(parentDir, newParentBase)

        // Compute new parent spec name
        const currentParentName = model.frontmatter.parent_spec.name
        newParentName = currentParentName.replace(/_V_\d+-\d+-\d+$/, `_V_${parentVerSegment}`)

        // Read and update the template file's frontmatter
        const rawParentContent = await readFile(localParentPath, 'utf-8')
        const parentModel = parseModel(rawParentContent)
        if (parentModel.frontmatter.level === 2) {
          parentModel.frontmatter.spec_version = parentVerString
        }
        parentContent = serializeModel(parentModel)
      } catch (err) {
        // Parent spec not found locally, skip template renaming but still update references
      }
    }

    // Update parent_spec in model frontmatter
    if (model.frontmatter.parent_spec.name && newParentName) {
      model.frontmatter.parent_spec.name = newParentName
    }
    if (model.frontmatter.parent_spec.url) {
      model.frontmatter.parent_spec.url = model.frontmatter.parent_spec.url.replace(
        VERSION_FILENAME_RE,
        `_V_${parentVerSegment}_`,
      )
    }
  }

  // Validate BEFORE writing/deleting anything.
  let template: SpecDocument | null
  let resolveInclude: (ref: { name: string; url: string }) => string | null = () => null
  try {
    const r = await resolveTemplateForModel(rootDir, model)
    template = r.template
    resolveInclude = r.resolveInclude
  } catch (err) {
    return {
      success: false,
      errors: [{ path: 'parent_spec', message: err instanceof Error ? err.message : String(err) }],
    }
  }
  const validationResult = coreValidate(model, template, null, resolveInclude)
  if (!validationResult.valid) {
    return {
      success: false,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
    }
  }

  // Write the new versioned files (or rewrite in place), then remove the old.
  try {
    // 1. If parent template was bumped:
    if (oldParentPath && newParentPath && parentContent && newParentName) {
      if (newParentPath === oldParentPath) {
        await writeFile(oldParentPath, parentContent, 'utf-8')
      } else {
        await writeFile(newParentPath, parentContent, 'utf-8')
        await rm(oldParentPath, { force: true })
      }

      // Mirror into specs/ too (write-once, atomic — see resolver-node.ts),
      // so later resolutions find the bumped template without a re-fetch.
      const specsDir = join(rootDir, 'specs')
      await saveSpecOnce(specsDir, `${newParentName}_NN.md`, parentContent)
    }

    // 2. Write model file
    if (newPath === filePath) {
      await saveModel(filePath, model)
    } else {
      await saveModel(newPath, model)
      await rm(filePath, { force: true })
    }

    // 3. Update references in workspace index.md
    const indexPath = join(rootDir, 'index.md')
    try {
      let indexContent = await readFile(indexPath, 'utf-8')
      const oldRelPath = basename(filePath)
      const newRelPath = basename(newPath)

      const oldModelRel = join('models', oldRelPath).replace(/\\/g, '/')
      const newModelRel = join('models', newRelPath).replace(/\\/g, '/')

      let replaced = false
      if (indexContent.includes(oldRelPath)) {
        indexContent = indexContent.replaceAll(oldRelPath, newRelPath)
        replaced = true
      }
      if (indexContent.includes(oldModelRel)) {
        indexContent = indexContent.replaceAll(oldModelRel, newModelRel)
        replaced = true
      }

      if (replaced) {
        await writeFile(indexPath, indexContent, 'utf-8')
      }
    } catch {
      // index.md might not exist or be readable, ignore
    }
  } catch (err) {
    return { success: false, errors: [{ path: '', message: `Failed to write model: ${err}` }] }
  }

  return {
    success: true,
    model,
    newPath,
    warnings: validationResult.warnings,
  }
}

/**
 * Apply an intent-level change to a model.
 * Semantics: parse → mutate → serialize → validate.
 * On failure: reject-without-writing (file unchanged, errors returned).
 */
export async function applyChange(
  rootDir: string,
  id: string,
  op: string,
  args: Record<string, unknown>,
): Promise<ApplyChangeResult> {
  const filePath = await findModelFile(rootDir, id)
  if (!filePath) {
    return { success: false, errors: [{ path: '', message: `Model not found: ${id}` }] }
  }

  let model: ParsedModel
  try {
    model = await loadModel(filePath)
  } catch (err) {
    return { success: false, errors: [{ path: '', message: `Failed to load model: ${err}` }] }
  }

  if (op === 'bump_version') {
    return bumpVersion(rootDir, filePath, model, args)
  }

  if (op === 'generate_index') {
    try {
      const { template: idxTemplate, resolveInclude: idxInclude } = await resolveTemplateForModel(
        rootDir,
        model,
      )
      if (idxTemplate) {
        // Compose the taxonomy across `includes` too, not just the composite.
        const { schema } = resolveTemplateSchema(idxTemplate.rawContent, idxInclude)
        args.taxonomy = schema.taxonomy.length
          ? schema.taxonomy
          : parseModel(idxTemplate.rawContent).taxonomy
      }
    } catch {
      /* template not resolvable — generate_index falls back to model taxonomy */
    }
  }

  // Apply the mutation via the core enforcement engine (R-IE-01)
  const mutationResult = coreApplyMutation(model, op, args as unknown as Record<string, unknown>)
  if (!mutationResult.success) {
    return mutationResult
  }

  // Validate after mutation — template resolved only from parent_spec.url.
  // Schema + structural conformance only (mutations are structurally enforced
  // by the core engine above); document-hygiene is the job of `validate_model`
  // / `init_model` on the resulting file, not of every intermediate mutation.
  let template: SpecDocument | null
  let resolveInclude: (ref: { name: string; url: string }) => string | null = () => null
  try {
    const r = await resolveTemplateForModel(rootDir, model)
    template = r.template
    resolveInclude = r.resolveInclude
  } catch (err) {
    return {
      success: false,
      errors: [{ path: 'parent_spec', message: err instanceof Error ? err.message : String(err) }],
    }
  }
  const validationResult = coreValidate(model, template, null, resolveInclude)

  if (!validationResult.valid) {
    // Reject without writing
    return {
      success: false,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
    }
  }

  // Write updated model
  try {
    await saveModel(filePath, model)
    if (
      op === 'rename_element' &&
      typeof args.elementName === 'string' &&
      typeof args.newName === 'string'
    ) {
      try {
        const modelDir = dirname(filePath)
        const oldSlug = args.elementName.toLowerCase().replace(/[^a-z0-9-]/g, '_')
        const newSlug = args.newName.toLowerCase().replace(/[^a-z0-9-]/g, '_')
        const oldAssetDir = join(modelDir, 'assets', oldSlug)
        const newAssetDir = join(modelDir, 'assets', newSlug)
        const st = await stat(oldAssetDir).catch(() => null)
        if (st && st.isDirectory()) {
          await rename(oldAssetDir, newAssetDir)
        }
      } catch {
        // Asset directory rename is best effort
      }
    }
  } catch (err) {
    return { success: false, errors: [{ path: '', message: `Failed to write model: ${err}` }] }
  }

  return {
    success: true,
    model,
    warnings: validationResult.warnings,
  }
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

/* ── All mutation operations delegated to innfo-core engine ─── */

/**
 * Build a starter level-3 body from a resolved template schema: an index
 * block, one `# NN <Concept>` section per concept (a prose stub for `text`
 * concepts, one placeholder Element with its declared fields for the rest),
 * a seeded `# NN matrices:` block per declared Matrix (example row/column
 * from the source/target Concepts), and an `item-markers matrix` seeded with
 * the declared Marker columns when any Marker is declared.
 */
function scaffoldBodyFromSchema(schema: {
  concepts: Array<{
    name: string
    type: string
    fields?: Array<{ name: string; type: string; options?: string[] }>
  }>
  markers?: Array<{ name: string }>
  matrices: Array<{ name: string; source?: string; target?: string }>
}): string {
  const lines: string[] = []
  const exampleFor = (concept?: string): string => (concept ? `Example ${concept}` : 'Example')
  const listConcepts = schema.concepts.filter((c) => c.type !== 'text')

  lines.push(
    '> [!NOTE]',
    '> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://innfo.cognnitive.com/app/innfo-doc).',
    '',
  )
  if (schema.concepts.length > 0) {
    lines.push('# NN index')
    for (const c of schema.concepts) lines.push(`* [[${c.name}]]`)
    lines.push('')
  }
  for (const c of schema.concepts) {
    lines.push(`# NN ${c.name}`)
    if (c.type === 'text') {
      lines.push(`_Describe ${c.name} here._`, '')
      continue
    }
    lines.push(`## NN ${c.name}: ${exampleFor(c.name)}`)
    for (const f of c.fields ?? []) {
      const hint =
        f.type === 'select' && f.options && f.options.length > 0
          ? f.options[0]
          : f.type === 'reference'
            ? '[[Target Element]]'
            : `<${f.type}>`
      lines.push(`${f.name}:: ${hint}`)
    }
    lines.push('')
  }
  for (const m of schema.matrices) {
    const row = exampleFor(m.source)
    const col = exampleFor(m.target)
    lines.push(
      `# NN matrices: ${m.name}`,
      `| ${m.source ?? 'Row'} \\ ${m.target ?? 'Col'} | ${col} |`,
      '| :--- | :---: |',
      `| ${row} | - |`,
      '',
    )
  }
  const markerNames = (schema.markers ?? []).map((mk) => mk.name)
  if (markerNames.length > 0 && listConcepts.length > 0) {
    lines.push(
      '# NN matrices: item-markers matrix',
      `| Item \\ Marker | ${markerNames.join(' | ')} |`,
      `| :--- | ${markerNames.map(() => ':---:').join(' | ')} |`,
      `| ${exampleFor(listConcepts[0].name)} | ${markerNames.map(() => '-').join(' | ')} |`,
      '',
    )
  }
  return lines.join('\n').trimEnd() + '\n'
}

export async function initModel(
  rootDir: string,
  id: string,
  args: {
    template_url: string
    template_name: string
    title?: string
    model_version?: string
  },
): Promise<{
  success: boolean
  filePath: string
  content: string
  templateResolved: boolean
  scaffolded: boolean
  warnings: string[]
  validation: { valid: boolean; errors: ValidationError[]; warnings: ValidationError[] }
}> {
  const cleanId = normalizeId(id)
  const warnings: string[] = []
  let filePath = await findModelFile(rootDir, id)

  if (!filePath) {
    const modelsDir = join(rootDir, 'models')
    let useModelsDir = false
    try {
      const st = await stat(modelsDir)
      if (st.isDirectory()) {
        useModelsDir = true
      }
    } catch {
      /* no models/ dir — write beside the repo root */
    }
    filePath = useModelsDir
      ? join(modelsDir, `${cleanId}_NN.md`)
      : join(rootDir, `${cleanId}_NN.md`)
  }

  let body = ''
  try {
    const currentContent = await readFile(filePath, 'utf-8')
    body = currentContent.replace(/^---[\s\S]*?---\n?/, '').trim()
  } catch {
    /* new file — no existing body to preserve */
  }

  // Resolve the template so we can (a) confirm it exists and (b) scaffold a
  // starter body when the file has none.
  let templateResolved = false
  let scaffolded = false
  let template: SpecDocument | null = null
  let resolveInclude: (ref: { name: string; url: string }) => string | null = () => null
  try {
    const resolved = await resolveTemplateWithCache(rootDir, args.template_url, args.template_name)
    template = resolved.template
    resolveInclude = resolved.resolveInclude
    if (resolved.template) {
      templateResolved = true
      const hasConceptSections = /^#\s+NN\s+(?!index\b)\S/im.test(body)
      if (!hasConceptSections) {
        const composed = resolveTemplateSchema(
          resolved.template.rawContent,
          resolved.resolveInclude,
        )
        for (const e of composed.errors) warnings.push(`${e.path}: ${e.message}`)
        const scaffold = scaffoldBodyFromSchema(composed.schema)
        body = body ? `${scaffold}\n${body}` : scaffold
        scaffolded = true
      }
    } else {
      warnings.push(
        `Template "${args.template_name}" could not be resolved from "${args.template_url}" — frontmatter written, body not scaffolded.`,
      )
    }
  } catch (err) {
    warnings.push(`Template resolution failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  const notice = `> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://innfo.cognnitive.com/app/innfo-doc).`

  if (!body.includes('> [!NOTE]')) {
    body = body ? notice + '\n\n' + body : notice
  }

  const modelVersion = args.model_version || 'V_0-1-0'
  const title = args.title || cleanId

  const frontmatter = `---
spec_version: "V_0-2-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-2-0_NN.md"
level: 3
parent_spec:
  name: "${args.template_name}"
  url: "${args.template_url}"
model_version: "${modelVersion}"
title: "${title}"
---`

  const newContent = frontmatter + '\n\n' + body.trim() + '\n'
  await writeFile(filePath, newContent, 'utf-8')

  // Validate what we just wrote (hygiene + schema) so the caller does not have
  // to make a second round-trip.
  const doc = validateDocument(newContent, {
    fileName: basename(filePath),
    template,
    resolveInclude,
  })

  return {
    success: true,
    templateResolved,
    scaffolded,
    warnings,
    filePath,
    content: newContent,
    validation: { valid: doc.valid, errors: doc.errors, warnings: doc.warnings },
  }
}

/* ── Reachability Graph, Backup & Spec Pruning Engine ───────── */

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

interface ZipEntryInput {
  name: string
  buffer: Buffer
}

function buildZipArchive(entries: ZipEntryInput[]): Buffer {
  const localHeaders: Buffer[] = []
  const cdHeaders: Buffer[] = []
  let currentOffset = 0

  for (const entry of entries) {
    const filenameBuf = Buffer.from(entry.name, 'utf-8')
    const compressed = deflateRawSync(entry.buffer)
    const crc = crc32(entry.buffer)
    const uncompressedSize = entry.buffer.length
    const compressedSize = compressed.length

    const localHeader = Buffer.alloc(30 + filenameBuf.length)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(8, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(compressedSize, 18)
    localHeader.writeUInt32LE(uncompressedSize, 22)
    localHeader.writeUInt16LE(filenameBuf.length, 26)
    localHeader.writeUInt16LE(0, 28)
    filenameBuf.copy(localHeader, 30)

    localHeaders.push(localHeader, compressed)

    const cdHeader = Buffer.alloc(46 + filenameBuf.length)
    cdHeader.writeUInt32LE(0x02014b50, 0)
    cdHeader.writeUInt16LE(20, 4)
    cdHeader.writeUInt16LE(20, 6)
    cdHeader.writeUInt16LE(0, 8)
    cdHeader.writeUInt16LE(8, 10)
    cdHeader.writeUInt16LE(0, 12)
    cdHeader.writeUInt16LE(0, 14)
    cdHeader.writeUInt32LE(crc, 16)
    cdHeader.writeUInt32LE(compressedSize, 20)
    cdHeader.writeUInt32LE(uncompressedSize, 24)
    cdHeader.writeUInt16LE(filenameBuf.length, 28)
    cdHeader.writeUInt16LE(0, 30)
    cdHeader.writeUInt16LE(0, 32)
    cdHeader.writeUInt16LE(0, 34)
    cdHeader.writeUInt16LE(0, 36)
    cdHeader.writeUInt32LE(0, 38)
    cdHeader.writeUInt32LE(currentOffset, 42)
    filenameBuf.copy(cdHeader, 46)

    cdHeaders.push(cdHeader)
    currentOffset += localHeader.length + compressed.length
  }

  const cdStartOffset = currentOffset
  let cdSize = 0
  for (const cd of cdHeaders) cdSize += cd.length

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cdSize, 12)
  eocd.writeUInt32LE(cdStartOffset, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([...localHeaders, ...cdHeaders, eocd])
}

/**
 * Traverses L3 models (`models/`), root entrypoints (`workspace_NN.md`, `index.md`),
 * and L2 templates (`templates/`) to build the workspace reference reachability graph.
 */
export async function calculateSpecReachability(rootDir: string): Promise<ReachabilityGraph> {
  const activeSpecs = new Set<string>()
  const referencedBy = new Map<string, string[]>()

  const addReference = (specRef: string, sourceFile: string) => {
    if (!specRef) return
    const key = specRef.toLowerCase().trim()
    activeSpecs.add(key)

    // Store normalized <name>@<version> and base <name> in activeSpecs (Fix W-02 & C-01)
    const parsed = parseSpecName(key)
    if (parsed.base) {
      activeSpecs.add(parsed.base)
      if (parsed.version) {
        activeSpecs.add(`${parsed.base}@${parsed.version}`)
        const normVKey = `${parsed.base}_v_${parsed.version.replace(/\./g, '-')}`
        activeSpecs.add(normVKey)
      }
    }

    const existing = referencedBy.get(key) ?? []
    if (!existing.includes(sourceFile)) {
      existing.push(sourceFile)
      referencedBy.set(key, existing)
    }
  }

  const searchDirs = [join(rootDir, 'models'), rootDir, join(rootDir, 'templates')]
  const scannedFiles = new Set<string>()

  for (const dir of searchDirs) {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
          const filePath = join(dir, entry.name)
          if (scannedFiles.has(filePath)) continue
          scannedFiles.add(filePath)

          try {
            const content = await readFile(filePath, 'utf-8')
            const parsed = parseModel(content)
            const fm = parsed.frontmatter
            const parentName =
              fm?.parent_spec?.name ||
              (typeof fm?.parent === 'string' ? fm.parent : (fm?.parent as any)?.name)
            const parentUrl = fm?.parent_spec?.url || (fm?.parent as any)?.url

            if (parentName) {
              addReference(parentName, filePath)
            }
            if (parentUrl) {
              const urlStem = basename(parentUrl).replace(/\.(md|markdown)$/i, '')
              addReference(urlStem, filePath)
              const tmplMatch = parentUrl.match(/\/templates\/([^/]+)\/([^/]+)/i)
              if (tmplMatch) {
                const pkgBase = tmplMatch[1].toLowerCase()
                const pkgVer = normalizeVersion(tmplMatch[2])
                addReference(pkgBase, filePath)
                addReference(`${pkgBase}@${pkgVer}`, filePath)
              }
            }

            for (const inc of fm?.includes ?? []) {
              if (inc.name) {
                addReference(inc.name, filePath)
                if (inc.url) {
                  const urlStem = basename(inc.url).replace(/\.(md|markdown)$/i, '')
                  addReference(urlStem, filePath)
                  const tmplMatch = inc.url.match(/\/templates\/([^/]+)\/([^/]+)/i)
                  if (tmplMatch) {
                    const pkgBase = tmplMatch[1].toLowerCase()
                    const pkgVer = normalizeVersion(tmplMatch[2])
                    addReference(pkgBase, filePath)
                    addReference(`${pkgBase}@${pkgVer}`, filePath)
                  }
                }
              }
            }
          } catch {
            // Ignore unparseable
          }
        }
      }
    } catch {
      // Directory absent
    }
  }

  // Helper to test if a candidate spec file matches specKey (Fix C-01)
  const matchesCandidateFile = (filePath: string, specKey: string): boolean => {
    const normPath = filePath.replace(/\\/g, '/').toLowerCase()
    const keyLow = specKey.toLowerCase().trim()
    if (normPath.includes(keyLow) || basename(filePath).toLowerCase().includes(keyLow)) return true

    const keyParts = keyLow.split('@')
    const keyBase = keyParts[0].split(/_v_/i)[0]
    const keyVer = keyParts[1] ? normalizeVersion(keyParts[1]) : undefined

    if (normPath.includes(`/templates/${keyBase}/`)) {
      if (!keyVer) return true
      if (
        normPath.includes(`/${keyVer}/`) ||
        normPath.includes(`/v_${keyVer.replace(/\./g, '-')}/`) ||
        normPath.includes(`/v_${keyVer}/`)
      ) {
        return true
      }
    }
    const parsedFile = parseSpecName(basename(filePath))
    if (parsedFile.base === keyBase) {
      if (!keyVer || !parsedFile.version || parsedFile.version === keyVer) return true
    }
    return false
  }

  // Transitive closure of includes up to depth 10
  const queue = Array.from(activeSpecs)
  const visited = new Set<string>()

  while (queue.length > 0) {
    const specKey = queue.shift()!
    if (visited.has(specKey)) continue
    visited.add(specKey)

    const candidateFiles = await getMarkdownFiles(join(rootDir, 'specs')).catch(() => [])
    for (const file of candidateFiles) {
      if (matchesCandidateFile(file, specKey)) {
        try {
          const content = await readFile(file, 'utf-8')
          const parsed = parseModel(content)
          const fm = parsed.frontmatter
          for (const inc of fm?.includes ?? []) {
            if (inc.name) {
              const incKey = inc.name.toLowerCase()
              addReference(inc.name, file)
              if (!visited.has(incKey)) queue.push(incKey)
              if (inc.url) {
                const urlStem = basename(inc.url).replace(/\.(md|markdown)$/i, '')
                addReference(urlStem, file)
                const tmplMatch = inc.url.match(/\/templates\/([^/]+)\/([^/]+)/i)
                if (tmplMatch) {
                  const pkgBase = tmplMatch[1].toLowerCase()
                  const pkgVer = normalizeVersion(tmplMatch[2])
                  addReference(pkgBase, file)
                  addReference(`${pkgBase}@${pkgVer}`, file)
                  if (!visited.has(`${pkgBase}@${pkgVer}`)) queue.push(`${pkgBase}@${pkgVer}`)
                }
              }
            }
          }
        } catch {
          // Ignore
        }
      }
    }
  }

  const orphanedCandidates: string[] = []
  const specsDir = join(rootDir, 'specs')

  try {
    const entries = await readdir(specsDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = join(specsDir, entry.name)

      if (entry.name === 'templates') {
        try {
          const tmplEntries = await readdir(fullPath, { withFileTypes: true })
          for (const nameDir of tmplEntries) {
            if (nameDir.isDirectory()) {
              const pkgName = nameDir.name
              const verPath = join(fullPath, pkgName)
              const verEntries = await readdir(verPath, { withFileTypes: true })

              for (const verDir of verEntries) {
                if (verDir.isDirectory()) {
                  const pkgVerDir = join(verPath, verDir.name)
                  const verClean = normalizeVersion(verDir.name)
                  const verDash = verClean.replace(/\./g, '-')
                  const pkgNameLow = pkgName.toLowerCase()

                  const isPkgActive = Array.from(activeSpecs).some((s) => {
                    const sLow = s.toLowerCase()
                    if (sLow === pkgNameLow) return true
                    if (sLow === `${pkgNameLow}@${verClean}`) return true
                    if (sLow === `${pkgNameLow}_v_${verDash}`) return true
                    if (sLow === `${pkgNameLow}_v_${verClean}`) return true

                    const parsed = parseSpecName(sLow)
                    if (parsed.base === pkgNameLow) {
                      if (!parsed.version || parsed.version === verClean) return true
                    }

                    if (
                      sLow.includes(`${pkgNameLow}@${verClean}`) ||
                      sLow.includes(`${pkgNameLow}_v_${verDash}`)
                    ) {
                      return true
                    }

                    return false
                  })

                  if (!isPkgActive) {
                    orphanedCandidates.push(pkgVerDir)
                  }
                }
              }
            }
          }
        } catch {
          // Ignore
        }
      } else if (entry.isFile() && /\.(md|markdown)$/i.test(entry.name)) {
        const stem = entry.name.replace(/\.(md|markdown)$/i, '').toLowerCase()
        const parsedFile = parseSpecName(stem)
        const isFileActive = Array.from(activeSpecs).some((s) => {
          const sLow = s.toLowerCase()
          if (sLow === stem) return true
          const parsedSpec = parseSpecName(sLow)
          if (parsedSpec.base === parsedFile.base) {
            if (
              !parsedSpec.version ||
              !parsedFile.version ||
              parsedSpec.version === parsedFile.version
            ) {
              return true
            }
          }
          if (parsedFile.version && sLow.includes(`${parsedFile.base}@${parsedFile.version}`))
            return true
          return stem.includes(sLow) || sLow.includes(stem)
        })

        if (!isFileActive) {
          orphanedCandidates.push(fullPath)
        }
      }
    }
  } catch {
    // specs directory absent
  }

  return {
    activeSpecs,
    referencedBy,
    orphanedCandidates,
  }
}

/**
 * Packaging orphan spec candidates into .backup/specs_<timestamp>.zip before mutation.
 */
export async function createSpecsBackupZip(
  rootDir: string,
  candidatePaths?: string[],
): Promise<string> {
  const backupDir = join(rootDir, '.backup')
  await mkdir(backupDir, { recursive: true })

  const now = new Date()
  const timestamp = now
    .toISOString()
    .replace(/[-:T.]/g, '')
    .slice(0, 14)
  const zipPath = join(backupDir, `specs_${timestamp}.zip`)

  const filesToZip: Array<{ fullPath: string; zipRelPath: string }> = []

  if (candidatePaths && candidatePaths.length > 0) {
    for (const p of candidatePaths) {
      const st = await stat(p).catch(() => null)
      if (st?.isFile()) {
        const rel = join('specs', basename(p)).replace(/\\/g, '/')
        filesToZip.push({ fullPath: p, zipRelPath: rel })
      } else if (st?.isDirectory()) {
        const subFiles = await getMarkdownFiles(p)
        for (const f of subFiles) {
          const subRel = f
            .replace(rootDir, '')
            .replace(/^[/\\]/, '')
            .replace(/\\/g, '/')
          filesToZip.push({ fullPath: f, zipRelPath: subRel })
        }
      }
    }
  } else {
    const specsDir = join(rootDir, 'specs')
    const allFiles = await getMarkdownFiles(specsDir).catch(() => [])
    for (const f of allFiles) {
      const rel = join('specs', f.replace(specsDir, '').replace(/^[/\\]/, '')).replace(/\\/g, '/')
      filesToZip.push({ fullPath: f, zipRelPath: rel })
    }
  }

  const entries: ZipEntryInput[] = []
  for (const f of filesToZip) {
    const buffer = await readFile(f.fullPath).catch(() => null)
    if (buffer) {
      entries.push({ name: f.zipRelPath, buffer })
    }
  }

  const zipBuf = buildZipArchive(entries)
  await writeFile(zipPath, zipBuf)
  return zipPath
}

export interface PruneOrphanedSpecsResult {
  success: boolean
  dryRun: boolean
  orphanedCount: number
  removedFiles: string[]
  backupZip: string | null
  message: string
}

/**
 * Prunes orphaned spec packages and files not reachable in active workspace models.
 * Supports parameters dry_run (default true) and backup (default true).
 */
export async function pruneOrphanedSpecs(
  rootDir: string,
  opts?: { dry_run?: boolean; backup?: boolean },
): Promise<PruneOrphanedSpecsResult> {
  const dryRun = opts?.dry_run ?? true
  const backup = opts?.backup ?? true

  const graph = await calculateSpecReachability(rootDir)
  const candidates = graph.orphanedCandidates

  if (candidates.length === 0) {
    return {
      success: true,
      dryRun,
      orphanedCount: 0,
      removedFiles: [],
      backupZip: null,
      message: 'No orphaned specs found.',
    }
  }

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      orphanedCount: candidates.length,
      removedFiles: candidates,
      backupZip: null,
      message: `Dry run: ${candidates.length} orphaned spec candidate(s) identified for deletion.`,
    }
  }

  let zipPath: string | null = null
  if (backup) {
    zipPath = await createSpecsBackupZip(rootDir, candidates)
  }

  for (const c of candidates) {
    await rm(c, { recursive: true, force: true }).catch(() => {})
  }

  return {
    success: true,
    dryRun: false,
    orphanedCount: candidates.length,
    removedFiles: candidates,
    backupZip: zipPath,
    message: `Successfully pruned ${candidates.length} orphaned spec candidate(s).${zipPath ? ` Backup created at ${zipPath}` : ''}`,
  }
}
