/**
 * Console subsystem entrypoint for nn-core.
 */

export * from './citations.js'
export * from './element-history.js'
export * from './files-inventory.js'
export * from './fs-source-resolver.js'
export * from './output-path.js'
export * from './payload-builder.js'
export * from './schema-resolution.js'
export * from './slot.js'
export * from './unit-address.js'
// The console derives history and origin from the change log; the payload mirror
// ships the browser-safe builder so the exporter reuses it.
export { buildChangeLogFromChangesets } from '../changelog/load.js'
export type { ChangeLog, LoggedChange } from '../changelog/index.js'
export { parseFrontmatter, parseYaml } from '../parser/index.js'
// The sources catalog's Synchronization elements feed the exporter's origins.
export { readSynchronizations } from '../sync/declarations.js'
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
