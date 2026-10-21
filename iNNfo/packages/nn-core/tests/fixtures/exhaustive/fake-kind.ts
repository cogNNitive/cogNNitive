import type { KnowledgeUnit } from '../../../src/sourceRef.js'
import { assertNever } from '../../../src/assertNever.js'

type WithFakeKind = KnowledgeUnit | { kind: 'fake'; extra: true }

export function label(u: WithFakeKind): string {
  switch (u.kind) {
    case 'header':
      return u.slug
    case 'row':
      return u.id
    case 'pointer':
      return u.pointer
    case 'element':
      return u.slug
    case 'matrix':
      return u.matrixSlug
    default:
      return assertNever(u)
  }
}
