import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { isNNName } from '@cognnitive/nn-core'
import { isInsideRoot, isSafeRelativeId } from './path-guard.js'
import { fail, slotValuesOf, substitute } from './procedure-state.js'
import type { FoldedRun, ToolError } from './procedure-state.js'

/**
 * The one rule for where a procedure's file artifact lives (executions spec, "Artifacts").
 *
 * The path comes from untrusted text: an agent-supplied `value`, or an `at` / `verify: file:`
 * declaration filled from run params the caller chose at `procedure_start`. Every such path
 * must be a relative POSIX path that stays inside the domain root and never names a `*_NN.md`
 * model (models change only through a changeset). Anything else is refused with a typed error
 * before the path reaches `stat`, `readFile`, a hash or a write.
 */

type ArtifactDecl = FoldedRun['graph']['artifacts'][string]

/**
 * The path a file artifact names before it is checked, in resolution order: the recorded or
 * supplied `value`, then the declared `at`, then the file a `verify: file:` check names. Slots
 * are filled from the run's params. Undefined when none of them names a path.
 */
export function artifactPathCandidate(
  decl: ArtifactDecl | undefined,
  run: FoldedRun['run'],
  value?: string,
): string | undefined {
  const slots = slotValuesOf(run)
  const at = substitute(decl?.at, slots)?.trim()
  const verify = substitute(decl?.verify, slots)?.trim()
  const verifyFile = verify?.startsWith('file:') ? verify.slice('file:'.length).trim() : undefined
  const path = value?.trim() || at || verifyFile
  return path || undefined
}

/**
 * Checks `candidate` against the containment rule and returns its domain-relative POSIX form.
 * `ARTIFACT_PATH_OUTSIDE_DOMAIN` for an absolute path, a `..` segment or anything that resolves
 * outside `root`; `ARTIFACT_PATH_IS_MODEL` for a `*_NN.md` target.
 */
export function resolveArtifactPath(
  root: string,
  artifact: string,
  candidate: string,
): { path: string } | ToolError {
  const path = candidate.trim().replace(/\\/g, '/')
  if (!isSafeRelativeId(path) || !isInsideRoot(root, path))
    return fail(
      'ARTIFACT_PATH_OUTSIDE_DOMAIN',
      `Artifact "${artifact}" path "${path}" is not a relative path inside the domaiNN.`,
      { artifact, path },
    )
  if (isNNName(path.trim()))
    return fail(
      'ARTIFACT_PATH_IS_MODEL',
      `Artifact "${artifact}" path "${path}" names a model; models change only through a changeset.`,
      { artifact, path },
    )
  return { path }
}

/**
 * sha256 of an already resolved artifact path: `rev` undefined when nothing is there,
 * `ARTIFACT_PATH_NOT_A_FILE` when the path is a directory or another non-file entry.
 */
export function artifactFileRev(
  root: string,
  artifact: string,
  path: string,
): { rev: string | undefined } | ToolError {
  const abs = join(root, ...path.split('/'))
  const entry = statSync(abs, { throwIfNoEntry: false })
  if (!entry) return { rev: undefined }
  if (!entry.isFile())
    return fail(
      'ARTIFACT_PATH_NOT_A_FILE',
      `Artifact "${artifact}" path "${path}" is not a file.`,
      { artifact, path },
    )
  return { rev: createHash('sha256').update(readFileSync(abs)).digest('hex') }
}
