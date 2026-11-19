import { readFile } from 'node:fs/promises'
import { parseKnowledge, isModelClosed } from '@cognnitive/nn-core'
import type { ParsedKnowledge } from '@cognnitive/nn-core'
import type { buildNodeDomainIndex } from './domain-index.js'
import { findElementInModel } from './change-args.js'

/**
 * Resolves a model cited as evidence (`<model id>@<element>`): the model must exist,
 * hold the element and be closed (`close_model`). An open model is not citable.
 */
export async function resolveModelCitation(
  index: Awaited<ReturnType<typeof buildNodeDomainIndex>>,
  modelId: string,
  elementSlug: string | undefined,
): Promise<{ ok: true; path: string } | { ok: false; code: 'CITATION_UNRESOLVED' | 'CITATION_NOT_CLOSED'; detail: string }> {
  const path = index.pathOf(modelId)
  if (!path) return { ok: false, code: 'CITATION_UNRESOLVED', detail: `which does not resolve (MODEL_NOT_FOUND)` }
  let model: ParsedKnowledge
  try {
    model = parseKnowledge(await readFile(path, 'utf-8'))
  } catch {
    return { ok: false, code: 'CITATION_UNRESOLVED', detail: 'which does not resolve (UNREADABLE)' }
  }
  if (elementSlug && !findElementInModel(model, undefined, elementSlug)) {
    return { ok: false, code: 'CITATION_UNRESOLVED', detail: 'which does not resolve (UNKNOWN_ANCHOR)' }
  }
  if (!isModelClosed(model.frontmatter as Record<string, unknown>)) {
    return {
      ok: false,
      code: 'CITATION_NOT_CLOSED',
      detail: `but model "${modelId}" has no closing event; only a closed model (close_model) is a citable record`,
    }
  }
  return { ok: true, path }
}

