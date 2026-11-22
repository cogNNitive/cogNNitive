/**
 * Console subsystem entrypoint for nn-core.
 */

export * from './citations.js'
export * from './element-history.js'
export * from './files-inventory.js'
export * from './fs-source-resolver.js'
export * from './locate-writer.js'
export * from './output-path.js'
export * from './payload-builder.js'
export * from './schema-resolution.js'
export * from './slot.js'
export * from './unit-address.js'
// The console derives history and origin from the change log; the payload mirror
// ships the browser-safe builder so the exporter reuses it.
export { buildChangeLogFromChangesets } from '../changelog/load.js'
export type { ChangeLog, LoggedChange } from '../changelog/index.js'
// The recordless-model audit (#587): a model no applied change names was written
// as a raw file, so its elements carry no history. The exporter reports it.
export { auditModelRecords, type RecordedModel } from '../changelog/audit.js'
export { parseFrontmatter, parseKnowledge, parseYaml } from '../parser/index.js'
// The procedure graph and run fold: the export folds each run of the domaiNN so the
// console stepper shows real runs without a second implementation in the browser.
export { foldRun, procedureGraph, runModelOf } from '../procedure/index.js'
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

// The domain index is the single source of model ids: the exporter addresses each
// model by its index id (a hierarchical `<container>/<slug>` for a distributed
// instance, the stem for a compact model), never by its filename stem.
export { buildDomainIndex } from '../domain/index.js'
export { discoverDomainModels } from '../helpers.js'
