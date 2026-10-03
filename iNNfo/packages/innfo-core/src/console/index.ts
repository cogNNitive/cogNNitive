/**
 * Console subsystem entrypoint for innfo-core.
 */

export * from './citations.js'
export * from './feedback-ledger.js'
export * from './fs-source-resolver.js'
export * from './payload-builder.js'
export * from './slot.js'
export { parseFrontmatter, parseYaml } from '../parser/index.js'
// Naming-contract predicates for scripts that load only the console payload mirror.
export {
  displayStem,
  isExcludedPath,
  isNNName,
  isSidecarName,
  parentSpecNameOf,
  roleOf,
} from '../naming/contract.js'

