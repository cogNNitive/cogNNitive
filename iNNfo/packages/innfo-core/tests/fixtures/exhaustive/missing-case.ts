import type { KnowledgeUnit } from '../../../src/sourceRef.js'
import { assertNever } from '../../../src/assertNever.js'

export function label(u: KnowledgeUnit): string {
  switch (u.kind) {
    case 'header':
      return u.slug
    case 'row':
      return u.id
    case 'pointer':
      return u.pointer
    case 'element':
      return u.slug
    // matrix omitted intentionally
    default:
      return assertNever(u)
  }
}
