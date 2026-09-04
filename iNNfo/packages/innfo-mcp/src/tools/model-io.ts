import { readFile, writeFile } from 'node:fs/promises'
import { parseModel, serializeModel } from '@cognnitive/innfo-core'
import type { ParsedModel, SpecDocument } from '@cognnitive/innfo-core'
import { resolveTemplateWithCache } from './spec.js'

/**
 * Resolve a model's template from its `parent_spec.url` (source of truth).
 * Returns null when the model declares no resolvable parent.
 */
export async function resolveTemplateForModel(
  rootDir: string,
  model: ParsedModel,
): Promise<{
  template: SpecDocument | null
  resolveInclude: (ref: { name: string; url: string }) => string | null
}> {
  const parent = model.frontmatter.parent_spec
  if (parent?.url && parent?.name) {
    const r = await resolveTemplateWithCache(rootDir, parent.url, parent.name)
    return { template: r.template, resolveInclude: r.resolveInclude }
  }
  return { template: null, resolveInclude: () => null }
}

/**
 * Load a model: read + parse.
 */
export async function loadModel(filePath: string): Promise<ParsedModel> {
  const content = await readFile(filePath, 'utf-8')
  return parseModel(content)
}

/**
 * Save a model: serialize + write.
 */
export async function saveModel(filePath: string, model: ParsedModel): Promise<void> {
  const content = serializeModel(model)
  await writeFile(filePath, content, 'utf-8')
}
