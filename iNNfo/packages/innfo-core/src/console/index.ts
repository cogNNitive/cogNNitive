/**
 * Console subsystem entrypoint for innfo-core.
 */

export * from './citations.js'
export * from './element-history.js'
export * from './fs-source-resolver.js'
export * from './payload-builder.js'
export * from './schema-resolution.js'
export * from './slot.js'
export { parseFrontmatter, parseYaml } from '../parser/index.js'
// Naming-contract predicates for scripts that load only the console payload mirror.
export {
  displayStem,
  isConsoleModel,
  isExcludedPath,
  isNNName,
  isSidecarName,
  parentSpecNameOf,
  parseName,
  roleOf,
} from '../naming/contract.js'

// Write-once producer primitives for scripts that load only the console payload mirror.
export { latestOfFamily } from '../writeOnce/plan.js'
export { writeOnce } from '../writeOnce/fs.js'
export { hashParsedElement } from './element-hash.js'
