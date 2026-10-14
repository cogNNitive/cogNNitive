import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { ChangeItem, ValidationError } from '@cognnitive/innfo-core'
import { normalizeId } from './spec.js'
import { isSafeRelativeId } from './path-guard.js'
import { applyChange } from './apply-change.js'
import { writeProposedChangeset } from './propose-changeset.js'
import { applyWithConsole, type ConsoleOutcome, type NextSteps, type RegenerateOptions } from './console-regeneration.js'

/**
 * `init_knowledge` is a thin wrapper over the changeset path: it builds a one-change
 * `add_model` proposal, writes it with the shared proposed-changeset writer and applies
 * it through the normal apply path, so every model creation is recorded as a change.
 * It is create-only: an existing id fails with `MODEL_EXISTS` and the file is untouched.
 */

export interface InitKnowledgeArgs {
  template_url?: string
  blueprint_url?: string
  blueprint_name?: string
  title?: string
  knowledge_version?: string
}

export interface InitKnowledgeResult {
  success: boolean
  /** Present only when the document was written. */
  filePath?: string
  /** Present only when the document was written. */
  content?: string
  /** Workspace-relative path of the applied `add_model` changeset. */
  changeset?: string
  status?: string
  warnings: string[]
  validation: { valid: boolean; errors: ValidationError[]; warnings: ValidationError[] }
  errors?: Array<{ path: string; message: string; code?: string }>
  console?: ConsoleOutcome
  next_steps?: NextSteps
  manifest?: unknown
}

function failure(
  errors: Array<{ path: string; message: string; code?: string }>,
  extra: Partial<InitKnowledgeResult> = {},
): InitKnowledgeResult {
  return {
    success: false,
    warnings: [],
    errors,
    validation: {
      valid: false,
      errors: errors.map((e) => ({ path: e.path, message: e.message, severity: 'error' as const })),
      warnings: [],
    },
    ...extra,
  }
}

export async function initKnowledge(
  rootDir: string,
  id: string,
  args: InitKnowledgeArgs,
  opts: { open?: boolean; regenerate?: RegenerateOptions } = {},
): Promise<InitKnowledgeResult> {
  if (!isSafeRelativeId(id)) {
    return failure([
      {
        path: 'id',
        code: 'ADD_MODEL_INVALID_TARGET',
        message: `Invalid model id "${id}": resolves outside the workspace root`,
      },
    ])
  }
  const cleanId = normalizeId(id)
  const change: ChangeItem = {
    id: 'c-01',
    op: 'add_model',
    target: cleanId,
    blueprint_name: args.blueprint_name || '',
    blueprint_url: args.blueprint_url || args.template_url || '',
    ...(args.title ? { name: args.title } : {}),
    ...(args.knowledge_version ? { knowledge_version: args.knowledge_version } : {}),
  }
  if (!change.blueprint_name || !change.blueprint_url) {
    return failure([
      { path: 'blueprint', code: 'INVALID_OPERATION', message: 'init_knowledge requires blueprint_name and blueprint_url' },
    ])
  }

  const written = await writeProposedChangeset(rootDir, {
    changes: [change],
    title: `Create model ${cleanId}`,
    author: 'agent',
  })
  const payload = (await applyWithConsole(rootDir, () => applyChange(rootDir, written.path), {
    open: opts.open ?? false,
    ...opts.regenerate,
  })) as {
    success: boolean
    status?: string
    newPath?: string
    errors?: Array<{ path: string; message: string; code?: string }>
    warnings?: Array<{ path: string; message: string }>
    console?: ConsoleOutcome
    next_steps?: NextSteps
    manifest?: unknown
  }

  if (!payload.success || payload.status !== 'applied') {
    // A rejected proposal changed nothing and is not a record worth keeping.
    if (payload.status === 'rejected') await rm(written.absolutePath, { force: true })
    return failure(
      payload.errors ?? [{ path: cleanId, message: 'The add_model change was not applied' }],
      payload.status === 'rejected' ? { status: payload.status } : { status: payload.status, changeset: written.path },
    )
  }

  const filePath = payload.newPath ?? join(rootDir, 'kNNowledge', `${cleanId}_NN.md`)
  const content = await readFile(filePath, 'utf-8')
  return {
    success: true,
    filePath,
    content,
    changeset: written.path,
    status: payload.status,
    warnings: (payload.warnings ?? []).map((w) => w.message),
    validation: { valid: true, errors: [], warnings: [] },
    ...(payload.console ? { console: payload.console } : {}),
    ...(payload.next_steps ? { next_steps: payload.next_steps } : {}),
    ...(payload.manifest !== undefined ? { manifest: payload.manifest } : {}),
  }
}
