export { findDomainRoot } from './root.js'
export { findStemCollisions, stemCollisionMessage } from './stem-collision.js'
export type { StemCollision } from './stem-collision.js'
export { buildScopeChain } from './chain.js'
export type { DirProbe } from './chain.js'
export { findScopeChain, findInChain } from './fs-chain.js'
export { loadChain } from './fs-layers.js'
export { resolve } from './resolve.js'
export type {
  MergeStrategy,
  Supplier,
  LoadedChain,
  Candidate,
  UnionEntry,
  ExplainTrace,
  Resolution,
} from './resolve.js'
export type {
  JsonValue,
  ScopeLink,
  ScopeChain,
  ScopeChainResult,
  ScopeNode,
} from './types.js'
