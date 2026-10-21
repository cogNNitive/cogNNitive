/**
 * Public type surface, split into focused modules and re-exported as a barrel so
 * every existing `from './types'` / `from '../types'` import keeps working:
 *   - `./parser`     — parser/model primitives (concepts, specs, elements, matrices)
 *   - `./validation` — validation report/check types
 *   - `./io`         — pluggable driver + resolver contracts
 *   - `./graph`      — normalized editor graph model
 *
 * Lives at `types/index.ts` (not a sibling `types.ts`) so the emitted
 * specifier is unambiguous under Node ESM resolution: `./types.js` and
 * `./types/` both existing on disk is not resolvable by plain Node.
 */
export * from './parser.js'
export * from './validation.js'
export * from './io.js'
export * from './graph.js'
