export { findDomainRoot } from './root.js'
export { findStemCollisions, stemCollisionMessage } from './stem-collision.js'
export type { StemCollision } from './stem-collision.js'
export { buildScopeChain } from './chain.js'
export type { DirProbe } from './chain.js'
export { findScopeChain, findInChain } from './fs-chain.js'
export { loadChain } from './fs-layers.js'
export { loadScopeProcedures } from './fs-procedures.js'
export { resolve } from './resolve.js'
export { resolveProcedures } from './procedures.js'
export { elementChain } from './elements.js'
export { loadElementChain, listScopeElements } from './fs-elements.js'
export type {
  ElementLoadErrorCode,
  ElementLoadFailure,
  ElementChainLoad,
  ScopeElementRef,
  ScopeElementList,
} from './fs-elements.js'
export { driftReport } from './drift.js'
export type {
  ProcedureDiagnostic,
  Binding,
  ShadowedProcedure,
  EffectiveProcedure,
  ProcedureResolution,
} from './procedures.js'
export type {
  ElementScopeDecl,
  ScopeElement,
  ElementSource,
  ElementTarget,
  ElementErrorCode,
  ElementChainResult,
} from './elements.js'
export type {
  DriftChain,
  DriftInput,
  DriftBaseline,
  DriftVariant,
  DriftRow,
  DriftReport,
} from './drift.js'
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
  SlotDecl,
  ForkRecord,
  ProcedureDef,
} from './types.js'
