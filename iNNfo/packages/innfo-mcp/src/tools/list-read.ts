/**
 * list_models and read_model tools.
 *
 * list_models scans the root directory for iNNfo model files (`*_NN.md`)
 * and returns their id, path, mode, and version.
 *
 * read_model parses a model by id and returns its parsed structure.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { listModels as coreListModels, parseModel } from '@cognnitive/innfo-core'
import type { ModelInfo, ParsedModel } from '@cognnitive/innfo-core'

/**
 * Normalize a model ID by stripping trailing file extensions (.md, .markdown) and redundant _NN suffixes.
 * E.g., `defiNNe_V_1-0_NN.md` or `model_NN_NN` resolves to `defiNNe_V_1-0` or `model`.
 *
 * @param id Raw model ID input string
 * @returns Normalized canonical base model ID
 */
export function normalizeId(id: string): string {
  if (!id) return ''
  let normalized = id.trim()
  normalized = normalized.replace(/\.(md|markdown)$/i, '')
  while (/_NN$/i.test(normalized)) {
    normalized = normalized.replace(/_NN$/i, '')
  }
  return normalized
}

/**
 * Scan a directory for iNNfo models.
 */
export async function listModels(rootDir: string): Promise<ModelInfo[]> {
  const rootModels = await coreListModels(rootDir)
  const modelsDir = join(rootDir, 'models')
  try {
    const { stat } = await import('node:fs/promises')
    const st = await stat(modelsDir)
    if (st.isDirectory()) {
      const subModels = await coreListModels(modelsDir)
      for (const m of subModels) {
        if (!rootModels.some((rm) => rm.path === m.path)) {
          rootModels.push(m)
        }
      }
    }
  } catch {
    // Ignore error if models/ does not exist
  }
  rootModels.sort((a, b) => a.id.localeCompare(b.id))
  return rootModels
}

/**
 * Read and parse an iNNfo model by its id.
 * The id is the filename stem (e.g. `Ghostbusters_V_0-1-0_business`
 * resolves to `Ghostbusters_V_0-1-0_business_NN.md`).
 *
 * Searches the root and the conventional `models/` subdirectory, trying
 * `<cleanId>_NN.md`, `<cleanId>.md`, `<cleanId>`, `<id>` and `<id>.md`.
 *
 * Returns null if the file doesn't exist or can't be parsed.
 */
export async function readModel(rootDir: string, id: string): Promise<ParsedModel | null> {
  const { findModelFile } = await import('./spec.js')
  const filePath = await findModelFile(rootDir, id)
  if (!filePath) return null
  try {
    const content = await readFile(filePath, 'utf-8')
    return parseModel(content)
  } catch {
    return null
  }
}

