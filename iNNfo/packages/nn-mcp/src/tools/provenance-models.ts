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
  type ParsedKnowledge,
  type ProvenanceModel,
} from '@cognnitive/nn-core'
import { listKnowledge } from './list-read.js'

/** Every level-3 model of the workspace, ordered by id. */
export async function collectProvenanceModels(rootDir: string): Promise<ProvenanceModel[]> {
  const models: ProvenanceModel[] = []
  for (const info of await listKnowledge(rootDir)) {
    let parsed: ParsedKnowledge
    try {
      parsed = parseKnowledge(await readFile(info.path, 'utf-8'))
    } catch {
      continue
    }
    if (parsed.frontmatter.level !== 3) continue
    // `listKnowledge` ids come from the domain index and never carry `_NN`.
    const modelId = canonicalUnitModelId(info.id)
    models.push({ modelId, model: parsed, path: info.path })
  }
  return models
}
