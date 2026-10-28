import { existsSync } from 'node:fs'
import { writeFile, rename } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import {
  readLineageRecord,
  readLineageSnapshot,
  projectLineage,
  renderLineageSections,
  renderRecordFrontmatter,
  refreshExistingModel,
  type LineageProjection,
} from '@cognnitive/nn-core'
import { isInsideRoot, isSafeRelativeId } from './path-guard.js'

export interface SyncLineageResult {
  status: 'created' | 'refreshed'
  recordPath: string
  sourceCount: number
  modelCount: number
  artifactCount: number
  projection: LineageProjection
}

const PROCEDURES_GUIDANCE =
  'Append-only. One entry per pipeline run (--scan, --import-url). Never regenerated.'

function emptySection(concept: string, guidance: string): string {
  return `# NN ${concept}\n\n<!-- ${guidance} -->\n`
}

function buildFreshRecord(projectName: string, sections: { sources: string; modelRecords: string; artifacts: string }): string {
  const index =
    '# NN index\n\n' +
    '* [[Sources]]\n' +
    '* [[ModelRecords]]\n' +
    '* [[Artifacts]]\n' +
    '* [[Procedures]]\n'

  const blocks = [
    index,
    sections.sources,
    sections.modelRecords,
    sections.artifacts,
    emptySection('Procedures', PROCEDURES_GUIDANCE),
  ].map((s) => s.replace(/\n+$/, '') + '\n')

  return (
    renderRecordFrontmatter(`${projectName} Provenance`) +
    '\n' +
    blocks.join('\n') +
    '\n'
  )
}

/**
 * `sync_lineage` tool: recomputes the projection from the workspace filesystem
 * and updates or creates `<project>_cogNNitive_NN.md`.
 */
export async function syncLineageTool(
  rootDir: string,
  options: { projectName?: string } = {},
): Promise<SyncLineageResult> {
  const absRoot = resolve(rootDir)
  const projectName = options.projectName || basename(absRoot)

  const snapshot = readLineageSnapshot(absRoot)
  const projection = projectLineage(snapshot)
  const sections = renderLineageSections(projection)

  const existing = readLineageRecord(absRoot)

  let recordPath: string
  let status: 'created' | 'refreshed'
  let newContent: string

  if (existing) {
    status = 'refreshed'
    recordPath = join(absRoot, existing.path)
    newContent = refreshExistingModel(existing.content, sections)
  } else {
    status = 'created'
    recordPath = join(absRoot, `${projectName}_cogNNitive_NN.md`)
    newContent = buildFreshRecord(projectName, sections)
  }

  await writeFile(recordPath, newContent, 'utf8')

  return {
    status,
    recordPath,
    sourceCount: projection.sources.length,
    modelCount: projection.knowledge.length,
    artifactCount: projection.artifacts.length,
    projection,
  }
}
