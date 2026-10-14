import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { planDomainScaffold } from '@cognnitive/innfo-core'

/**
 * `init_domain`: creates an empty, conformant domaiNN container from the one pure
 * scaffold plan (`planDomainScaffold` in innfo-core). It is not a changeset: a changeset
 * lives inside a domain, and the manifest is the record of the domain.
 */

export interface InitDomainResult {
  success: boolean
  dir?: string
  workspace_id?: string
  /** Workspace-relative folders and files that were created. */
  created?: { dirs: string[]; files: string[] }
  errors?: Array<{ path: string; message: string; code: string }>
}

const WORKSPACE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

function fail(path: string, code: string, message: string): InitDomainResult {
  return { success: false, errors: [{ path, code, message: `${code}: ${message}` }] }
}

export async function initDomain(
  dir: string,
  name: string,
  workspaceId?: string,
): Promise<InitDomainResult> {
  if (!dir || !dir.trim()) return fail('dir', 'INVALID_ARGUMENT', 'init_domain requires dir')
  if (!name || !name.trim()) return fail('name', 'INVALID_ARGUMENT', 'init_domain requires name')
  if (workspaceId !== undefined && !WORKSPACE_ID_RE.test(workspaceId.trim())) {
    return fail('workspace_id', 'INVALID_ARGUMENT', `workspace_id "${workspaceId}" must use letters, digits, dot, dash or underscore only`)
  }

  const root = resolve(dir)
  const existing = await stat(root).catch(() => null)
  if (existing) {
    if (!existing.isDirectory()) return fail('dir', 'DOMAIN_DIR_NOT_EMPTY', `"${root}" exists and is not a directory`)
    if ((await readdir(root)).length > 0) {
      return fail('dir', 'DOMAIN_DIR_NOT_EMPTY', `"${root}" is not empty; init_domain only creates a domain in an empty directory`)
    }
  }

  const plan = planDomainScaffold({ name, workspaceId })
  if (!WORKSPACE_ID_RE.test(plan.workspaceId)) {
    return fail('workspace_id', 'INVALID_ARGUMENT', `cannot derive a workspace_id from "${name}"; pass workspace_id explicitly`)
  }

  await mkdir(root, { recursive: true })
  for (const rel of plan.dirs) await mkdir(join(root, rel), { recursive: true })
  for (const file of plan.files) {
    const target = join(root, file.path)
    await mkdir(dirname(target), { recursive: true })
    const staging = `${target}.tmp`
    try {
      await writeFile(staging, file.content, 'utf-8')
      await rename(staging, target)
    } catch (err) {
      await rm(staging, { force: true })
      throw err
    }
  }
  return {
    success: true,
    dir: root,
    workspace_id: plan.workspaceId,
    created: { dirs: plan.dirs, files: plan.files.map((f) => f.path) },
  }
}
