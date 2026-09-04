import { readFile, writeFile, rm, stat, rename } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import {
  parseModel,
  serializeModel,
  validateModel as coreValidate,
  applyMutation as coreApplyMutation,
  resolveTemplateSchema,
} from '@cognnitive/innfo-core'
import type { SpecDocument, ParsedModel } from '@cognnitive/innfo-core'
import { findModelFile } from './spec.js'
import { isLocalPath, toLocalFilePath, saveSpecOnce } from './resolver-node.js'
import { createSpecsBackupZip } from './spec-backup.js'
import { loadModel, saveModel, resolveTemplateForModel } from './model-io.js'

export interface ApplyChangeResult {
  success: boolean
  model?: ParsedModel
  newPath?: string
  errors?: Array<{ path: string; message: string }>
  warnings?: Array<{ path: string; message: string }>
}

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

  // A pre-write backup is taken when the caller asked for one, or when the
  // `specs/` tree has uncommitted changes. If a backup was judged necessary
  // and then fails, abort the bump — do NOT rename/delete spec files without
  // the safety net that was deemed required.
  let backupNeeded = args.backup === true || args.prompt_backup === true
  if (!backupNeeded) {
    try {
      const { execSync } = await import('node:child_process')
      const gitStatus = execSync('git status --porcelain specs', {
        cwd: rootDir,
        encoding: 'utf-8',
      })
      backupNeeded = gitStatus.trim() !== ''
    } catch {
      // git unavailable — no dirty-tree signal, so no auto-backup is taken.
    }
  }
  if (backupNeeded) {
    try {
      await createSpecsBackupZip(rootDir)
    } catch (err) {
      return {
        success: false,
        errors: [
          {
            path: '',
            message: `Pre-write specs backup failed — bump_version aborted before any file was changed: ${
              err instanceof Error ? err.message : String(err)
            }`,
          },
        ],
      }
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
