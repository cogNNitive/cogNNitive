import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { isInsideRoot, isSafeRelativeId } from './path-guard.js'
import { fail, slotValuesOf, substitute } from './procedure-state.js'
import type { FoldedRun, ToolError } from './procedure-state.js'

/**
 * The one rule for where a procedure's file artifact lives (executions spec, "Artifacts").
 *
 * The path comes from untrusted text: an agent-supplied `value`, or an `at` / `verify: file:`
 * declaration filled from run params the caller chose at `procedure_start`. Every such path
 * must be a relative POSIX path that stays inside the domain root. Anything else is refused
 * with a typed error before the path reaches `stat`, `readFile`, a hash or a write.
 *
 * An artifact MAY be a `*_NN.md` file: the blueprint declares a file artifact's `at` as a
 * path and the Document SOP pilot produces its deliverable at one. Writing a model's *content*
 * is what needs a changeset, and that stays out of reach: containment keeps this rule to the
 * file the run itself produces, and nothing here mutates an existing model.
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
 * outside `root`. A `*_NN.md` target is allowed: `at` is a declared path and a procedure's
 * deliverable may be a model file.
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
