/**
 * Provenance model discovery: every level-3 model of a workspace, in the shape
 * the drift engines consume (`ProvenanceModel`: canonical model id + parsed
 * document + path).
 *
 * Split from `provenance-strict.ts` so `validate.ts` can build the fold report
 * without importing the strict engine (and its blueprint resolver).
 */
import { readFile } from 'node:fs/promises'
import {
  canonicalUnitModelId,
  parseKnowledge,
  touchedModels,
  type ChangeLog,
  type ParsedKnowledge,
  type ProvenanceModel,
} from '@cognnitive/nn-core'
import { listKnowledge } from './list-read.js'
import { findKnowledgeFile } from './spec.js'
import type { NodeDomainIndex } from './domain-index.js'

async function parseLevel3(path: string): Promise<ParsedKnowledge | null> {
  try {
    const parsed = parseKnowledge(await readFile(path, 'utf-8'))
    return parsed.frontmatter.level === 3 ? parsed : null
  } catch {
    return null
  }
}

/**
 * Every level-3 model of the workspace, ordered by id.
 *
 * Discovery lists only `knowledge` documents, but `apply_change` also writes level-3
 * documents that discovery leaves out on purpose: a `procedures` document is a
 * `procedure` or a `catalog` (#637). With the change log, each id it touched that the
 * listing does not cover is looked up with the same resolver `apply_change` used to
 * write it, so a file that exists is never reported as missing.
 *
 * `call.index` is a domain index already built for `rootDir` in the same tool
 * call; the listing and every lookup then share it.
 */
export async function collectProvenanceModels(
  rootDir: string,
  log?: ChangeLog,
  call: { index?: NodeDomainIndex } = {},
): Promise<ProvenanceModel[]> {
  const models: ProvenanceModel[] = []
  for (const info of await listKnowledge(rootDir, {}, call)) {
    const parsed = await parseLevel3(info.path)
    if (!parsed) continue
    // `listKnowledge` ids come from the domain index and never carry `_NN`.
    const modelId = canonicalUnitModelId(info.id)
    models.push({ modelId, model: parsed, path: info.path })
  }

  if (log) {
    const listed = new Set(models.map((entry) => entry.modelId))
    for (const modelId of touchedModels(log).keys()) {
      if (listed.has(modelId)) continue
      const path = await findKnowledgeFile(rootDir, modelId, { index: call.index }).catch(
        () => null,
      )
      if (!path) continue
      const parsed = await parseLevel3(path)
      if (parsed) models.push({ modelId, model: parsed, path })
    }
    models.sort((a, b) => (a.modelId < b.modelId ? -1 : a.modelId > b.modelId ? 1 : 0))
  }
  return models
}
