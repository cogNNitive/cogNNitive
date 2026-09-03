import type { SpecDocument, ValidationError, ValidationReport } from '../types'
import type { IncludeResolver } from '../schema'
import { parseModel } from '../parser'
import { validateFormatContent } from './content'
import { validateModel } from './model'
import type { SubmodelResolver } from './references'

export interface DocumentValidation {
  /** Document hygiene: frontmatter keys, body structure, naming conventions. */
  format: ValidationReport
  /** Schema conformance against the resolved template. Null when no template
   *  was supplied or the document is not a level-2/3 document. */
  schema: { valid: boolean; errors: ValidationError[]; warnings: ValidationError[] } | null
  /** Flat merged view over both passes. */
  errors: ValidationError[]
  warnings: ValidationError[]
  valid: boolean
}

/**
 * The single validation entry point for an iNNfo document. Runs BOTH the
 * document-hygiene linter (`validateFormatContent`) and, for level-2/3
 * documents with a resolved template, the schema-conformance validator
 * (`validateModel`), then merges the results.
 *
 * Both the MCP (`validate_model`) and the editor call this so a document is
 * held to one set of rules everywhere. Previously the MCP ran only the schema
 * pass and the editor only the hygiene pass, so each surfaced problems the
 * other missed.
 */
export function validateDocument(
  content: string,
  opts: {
    fileName: string
    template?: SpecDocument | null
    formatSpec?: SpecDocument | null
    expectedSpecVersion?: string
    resolveInclude?: IncludeResolver
    resolveSubmodel?: SubmodelResolver
    referringPath?: string
  },
): DocumentValidation {
  const format = validateFormatContent(content, opts.fileName, opts.expectedSpecVersion)

  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  for (const check of format.checks) {
    if (check.passed || check.severity === 'info') continue
    const entry: ValidationError = {
      path: `format.${check.id}`,
      message: check.message ?? check.label,
      severity: check.severity === 'error' ? 'error' : 'warning',
    }
    ;(entry.severity === 'error' ? errors : warnings).push(entry)
  }

  let schema: DocumentValidation['schema'] = null
  const parsed = parseModel(content)
  const level = parsed.frontmatter?.level
  if ((level === 2 || level === 3) && (opts.template !== undefined || opts.formatSpec !== undefined)) {
    const result = validateModel(
      parsed,
      opts.template ?? null,
      opts.formatSpec ?? null,
      {
        resolveInclude: opts.resolveInclude,
        resolveSubmodel: opts.resolveSubmodel,
        referringPath: opts.referringPath ?? opts.fileName,
      },
    )
    schema = result
    errors.push(...result.errors)
    warnings.push(...result.warnings)
  }

  return { format, schema, errors, warnings, valid: errors.length === 0 }
}
