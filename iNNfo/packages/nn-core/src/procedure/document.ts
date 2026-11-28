import type { ParsedKnowledge } from '../types/index.js'
import type { GraphDiagnostic } from './types.js'

/**
 * The structure every procedure document keeps: exactly one `Procedure` element, which is the
 * procedure's header, and every `Work` step nested under it. Kept apart from `procedureGraph`,
 * which only needs the steps, so a model that is not a procedure document can still be walked.
 */
export function procedureDocumentDiagnostics(model: ParsedKnowledge): GraphDiagnostic[] {
  const headers = model.elements.get('Procedure') ?? []
  const diagnostics: GraphDiagnostic[] = []
  if (headers.length !== 1) {
    diagnostics.push({
      code: 'PROCEDURE_HEADER_COUNT',
      severity: 'error',
      detail: `A procedure document holds exactly one Procedure element; this one holds ${headers.length}.`,
    })
    return diagnostics
  }
  const header = headers[0]
  for (const step of model.elements.get('Work') ?? []) {
    const parent = step.parentElement
    const nested =
      parent !== undefined &&
      parent.concept === 'Procedure' &&
      (parent.slug ?? parent.name) === (header.slug ?? header.name)
    if (!nested)
      diagnostics.push({
        code: 'WORK_NOT_UNDER_PROCEDURE',
        severity: 'error',
        step: step.slug ?? '',
        detail: `Work "${step.name}" is not nested under the Procedure "${header.name}"; write it as a ### NN Work: heading below it.`,
      })
  }
  return diagnostics
}
