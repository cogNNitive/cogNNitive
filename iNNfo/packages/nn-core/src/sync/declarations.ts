/**
 * Reads the Synchronization elements of a sources catalog (`sources/sources_NN.md`).
 * Pure and browser-safe: text in, declarations and diagnostics out.
 */

import { SLUG_RE } from '../address/grammar.js'
import { parseKnowledge } from '../parser/index.js'
import type { ReferenceDiagnostic } from '../validator/references.js'

export interface Synchronization {
  alias: string
  origin: string
  kind: 'file' | 'folder'
  state: 'active' | 'paused'
}

const CONCEPT = 'Synchronization'

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/**
 * The declared synchronizations, in document order. An invalid or duplicate alias
 * is reported and never returned, so it can never name a mirror path. A missing
 * `state` means `active`; a `kind` other than `file` means `folder`.
 */
export function readSynchronizations(catalog: string): {
  synchronizations: Synchronization[]
  diagnostics: ReferenceDiagnostic[]
} {
  const synchronizations: Synchronization[] = []
  const diagnostics: ReferenceDiagnostic[] = []
  const seen = new Set<string>()

  for (const el of parseKnowledge(catalog).elements.get(CONCEPT) ?? []) {
    const alias = text(el.fields['alias'])
    const path = `elements.${CONCEPT}.${el.name}.fields.alias`
    if (!SLUG_RE.test(alias)) {
      diagnostics.push({
        path,
        message: `SYNC_ALIAS_INVALID: alias "${alias}" of Synchronization "${el.name}" is not a folder-safe slug; use lowercase letters, digits and hyphens`,
        severity: 'error',
        code: 'SYNC_ALIAS_INVALID',
        meta: { field: 'alias' },
      })
      continue
    }
    if (seen.has(alias)) {
      diagnostics.push({
        path,
        message: `SYNC_ALIAS_DUPLICATE: alias "${alias}" of Synchronization "${el.name}" is already declared; aliases are unique within the domaiNN`,
        severity: 'error',
        code: 'SYNC_ALIAS_DUPLICATE',
        meta: { field: 'alias' },
      })
      continue
    }
    seen.add(alias)
    synchronizations.push({
      alias,
      origin: text(el.fields['origin_uri']),
      kind: text(el.fields['kind']) === 'file' ? 'file' : 'folder',
      state: text(el.fields['state']) === 'paused' ? 'paused' : 'active',
    })
  }
  return { synchronizations, diagnostics }
}
