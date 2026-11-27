/**
 * `read_lineage` tool (computed-lineage-view): the domain's computed lineage,
 * read-only.
 *
 * Inventory from the filesystem, edges and diagnostics from the change log. It
 * never writes: the persisted lineage record no longer exists (S4), and nothing
 * here depends on it.
 */
import {
  projectLineage,
  type LineageArtifact,
  type LineageChangeset,
  type LineageDiagnostic,
  type LineageEdge,
  type LineageKnowledge,
  type LineageSource,
  type LineageView,
} from '@cognnitive/nn-core'
import { readDomainLineage } from './domain-lineage.js'

export interface ReadLineageInput {
  /** Substring filter applied to every section's refs (case-insensitive). */
  focus?: string
  /** `live` (default) uses the last applied change of each unit; `all-time` every change. */
  scope?: 'live' | 'all-time'
}

export interface ReadLineageResult {
  sources: LineageSource[]
  /** Models, named `models` in this contract (`knowledge` in the projection). */
  models: LineageKnowledge[]
  artifacts: LineageArtifact[]
  /** Changesets, named `changes` in this contract (`changesets` in the projection). */
  changes: LineageChangeset[]
  edges: LineageEdge[]
  diagnostics: LineageDiagnostic[]
}

function matches(focus: string | undefined, ...values: Array<string | undefined>): boolean {
  if (!focus) return true
  const needle = focus.toLowerCase()
  return values.some((value) => typeof value === 'string' && value.toLowerCase().includes(needle))
}

/** The projection reshaped to the `read_lineage` contract, optionally narrowed. */
export async function readLineageTool(
  rootDir: string,
  input: ReadLineageInput = {},
): Promise<ReadLineageResult> {
  // One snapshot, its change log and the parses both made: every file parsed once, and
  // the changesets taken from the persistent changeset index.
  const { files, log, parses } = readDomainLineage(rootDir)
  const view: LineageView = projectLineage(files, log, {
    scope: input.scope ?? 'live',
    parses,
  })
  const focus = input.focus

  return {
    sources: view.sources.filter((source) =>
      matches(focus, source.raw_filename, source.normalized_content, source.name),
    ),
    models: view.knowledge.filter((model) => matches(focus, model.model_ref, model.name)),
    artifacts: view.artifacts.filter((artifact) => matches(focus, artifact.artifact_ref, artifact.name)),
    changes: view.changesets.filter((changeset) =>
      matches(focus, changeset.changeset_ref, changeset.name),
    ),
    edges: view.edges.filter((edge) => matches(focus, edge.from, edge.to)),
    diagnostics: view.diagnostics.filter((diagnostic) => matches(focus, diagnostic.path)),
  }
}
