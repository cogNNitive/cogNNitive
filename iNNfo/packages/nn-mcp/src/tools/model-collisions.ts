import { findStemCollisions, stemCollisionMessage } from '@cognnitive/nn-core'

/** A model id carried by several documents: reported as resolvable info, never resolved or dropped. */
export interface ModelIdCollisionDiagnostic {
  code: 'MODEL_ID_COLLISION'
  severity: 'info' | 'warning'
  id: string
  paths: string[]
  message: string
}

/**
 * Diagnostics for repeated model ids among the models of ONE domaiNN. Reported as info
 * (resolvable via domain-relative path under Option A).
 */
export function modelIdCollisionDiagnostics(modelPaths: readonly string[]): ModelIdCollisionDiagnostic[] {
  return findStemCollisions(modelPaths).map((collision) => ({
    code: 'MODEL_ID_COLLISION',
    severity: 'warning',
    id: collision.id,
    paths: collision.paths,
    message: stemCollisionMessage(collision),
  }))
}
