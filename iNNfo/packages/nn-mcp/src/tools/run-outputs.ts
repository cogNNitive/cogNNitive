import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { ChangeItem } from '@cognnitive/nn-core'
import { artifactPathCandidate, resolveArtifactPath } from './artifact-path.js'
import { fail } from './procedure-state.js'
import type { FoldedRun, ToolError } from './procedure-state.js'

/**
 * Private run outputs (executions spec, "Artifacts"): the deliverable a person writes for a
 * step's `file` output travels with the completion, as `requested_outputs` on a `complete`
 * Step Request or as the `outputs` argument of `procedure_record`. The runner keeps it private
 * to the run, at `executions/<run>/outputs/<slug>/<name>`, and records the artifact row in the
 * same atomic changeset as the completion. An artifact that declares `at` is written at that
 * path instead, its slots filled from the run params. Either path must pass the containment
 * rule of `resolveArtifactPath` (relative, inside the domaiNN, not a `*_NN.md` model), checked
 * for every output before anything is written, so nothing is written outside the domaiNN root
 * and no model is overwritten without a changeset.
 */

/** The largest text one output may carry, in UTF-8 bytes. */
export const MAX_OUTPUT_BYTES = 256 * 1024

type Change = Omit<ChangeItem, 'id'>

/** One output ready to write: where it goes and the bytes its rev pins. */
export interface StagedOutput {
  slug: string
  /** Domain-relative POSIX path, the value the artifact row records. */
  path: string
  bytes: Buffer
  rev: string
}

/**
 * A file name kept to a plain basename: letters, digits, `.`, `_` and `-`, anything else
 * replaced by `-`, no leading dots. Empty falls back to `<slug>.md`.
 */
export function outputFileName(slug: string, name: string | undefined): string {
  const base = (name ?? '').split(/[\\/]/).pop() ?? ''
  const clean = base.replace(/[^A-Za-z0-9._-]/g, '-').replace(/^\.+/, '')
  return clean === '' ? `${slug}.md` : clean
}

/**
 * The `{ slug: { name?, text } }` map as an object: given as one, or as its JSON text (the
 * one-line form a Step Request stores). Anything else is refused.
 */
function outputsMap(raw: unknown): { map: Record<string, unknown> } | ToolError {
  let value = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return fail(
        'INVALID_OUTPUT',
        'outputs must be a JSON object: artifact slug -> { name?, text }.',
      )
    }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return fail('INVALID_OUTPUT', 'outputs must be an object: artifact slug -> { name?, text }.')
  return { map: value as Record<string, unknown> }
}

/**
 * The artifact row a recorded output takes: the same `set_fields` shape `action=artifact`
 * writes, with the step that recorded it.
 */
export const artifactRowChange = (
  run: string,
  slug: string,
  fields: Record<string, string>,
): Change => ({
  op: 'set_fields',
  target: `${run}@${slug}`,
  to: JSON.stringify(fields),
  evidence: 'decision',
})

/**
 * Validates the outputs a completion of `step` carries, all of them before anything is
 * written: every slug is an output of that step, of kind `file`, with a string text within
 * `MAX_OUTPUT_BYTES`. Returns the files to write, the artifact rows to record, and the run
 * with those rows applied, so the completion is planned against what it records.
 */
export function stageOutputs(
  root: string,
  f: FoldedRun,
  step: string,
  raw: unknown,
): { outputs: StagedOutput[]; changes: Change[]; run: FoldedRun['run'] } | ToolError {
  const parsed = outputsMap(raw)
  if ('ok' in parsed) return parsed
  const declared = f.graph.steps[step]!.outputs
  const outputs: StagedOutput[] = []
  for (const [slug, entry] of Object.entries(parsed.map)) {
    if (!declared.includes(slug))
      return fail('INVALID_OUTPUT', `"${slug}" is not an output of step "${step}".`, {
        step,
        artifact: slug,
        outputs: declared,
      })
    const kind = f.graph.artifacts[slug]?.kind
    if (kind !== 'file')
      return fail(
        'INVALID_OUTPUT',
        `Output "${slug}" is a ${kind} artifact; only a file output can be written from its text.`,
        { step, artifact: slug, kind },
      )
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry))
      return fail('INVALID_OUTPUT', `Output "${slug}" must be { name?, text }.`, { artifact: slug })
    const { name, text } = entry as Record<string, unknown>
    if (typeof text !== 'string')
      return fail('INVALID_OUTPUT', `Output "${slug}" needs its text as a string.`, {
        artifact: slug,
      })
    if (name !== undefined && typeof name !== 'string')
      return fail('INVALID_OUTPUT', `Output "${slug}" names its file with a string.`, {
        artifact: slug,
      })
    const bytes = Buffer.from(text, 'utf8')
    if (bytes.length > MAX_OUTPUT_BYTES)
      return fail(
        'INVALID_OUTPUT',
        `Output "${slug}" holds ${bytes.length} bytes; the limit is ${MAX_OUTPUT_BYTES}.`,
        { artifact: slug, bytes: bytes.length, limit: MAX_OUTPUT_BYTES },
      )
    const decl = f.graph.artifacts[slug]
    const declaredAt = decl?.at
      ? artifactPathCandidate({ ...decl, verify: undefined }, f.run)
      : undefined
    const resolved = resolveArtifactPath(
      root,
      slug,
      declaredAt ?? `executions/${f.run.id}/outputs/${slug}/${outputFileName(slug, name)}`,
    )
    if ('ok' in resolved) return resolved
    const path = resolved.path
    outputs.push({
      slug,
      path,
      bytes,
      rev: createHash('sha256').update(bytes).digest('hex'),
    })
  }
  const rows = outputs.map((o) => ({
    slug: o.slug,
    fields: { kind: 'file', status: 'validated', value: o.path, rev: o.rev, step },
  }))
  const artifacts = { ...f.run.artifacts }
  for (const { slug, fields } of rows)
    artifacts[slug] = { ...artifacts[slug], ...fields, kind: 'file', status: 'validated' }
  return {
    outputs,
    changes: rows.map(({ slug, fields }) => artifactRowChange(f.run.id, slug, fields)),
    run: { ...f.run, artifacts },
  }
}

/**
 * Writes staged outputs and returns how to undo exactly that: a file this call created is
 * removed, one it overwrote gets its earlier bytes back, so a failed commit leaves the run
 * folder as it found it.
 */
export async function writeOutputs(
  root: string,
  outputs: StagedOutput[],
): Promise<() => Promise<void>> {
  const undo: Array<() => Promise<void>> = []
  const rollback = async (): Promise<void> => {
    for (const step of undo.reverse()) await step().catch(() => undefined)
  }
  try {
    for (const o of outputs) {
      const abs = join(root, ...o.path.split('/'))
      const dir = dirname(abs)
      // The topmost folder this write creates (`outputs/` on a run's first output).
      let created: string | null = null
      for (let at = dir; !existsSync(at); at = dirname(at)) created = at
      const previous = existsSync(abs) ? await readFile(abs) : null
      await mkdir(dir, { recursive: true })
      if (created !== null) {
        const top = created
        undo.push(() => rm(top, { recursive: true, force: true }))
      }
      await writeFile(abs, o.bytes)
      undo.push(() => (previous === null ? rm(abs, { force: true }) : writeFile(abs, previous)))
    }
  } catch (err) {
    await rollback()
    throw err
  }
  return rollback
}
