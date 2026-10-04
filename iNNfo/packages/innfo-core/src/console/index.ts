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
  parseName,
  roleOf,
} from '../naming/contract.js'

// Write-once producer primitives for scripts that load only the console payload mirror.
export { latestOfFamily } from '../writeOnce/plan.js'
export { writeOnce } from '../writeOnce/fs.js'

// Blueprint schema resolution for scripts that load only the console payload mirror
// (e.g. scripts/export-console.mjs), so the CLI and the MCP derive the SAME schema slot.
export { resolveBlueprintSchema } from '../schema/index.js'
export type { ResolvedBlueprintSchema } from '../schema/index.js'
