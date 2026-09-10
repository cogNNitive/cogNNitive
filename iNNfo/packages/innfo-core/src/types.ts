/**
 * Public type surface, split into focused modules and re-exported as a barrel so
 * every existing `from './types'` / `from '../types'` import keeps working:
 *   - `./types/parser`     — parser/model primitives (concepts, specs, elements, matrices)
 *   - `./types/validation` — validation report/check types
 *   - `./types/io`         — pluggable driver + resolver contracts
 *   - `./types/graph`      — normalized editor graph model
 */
export * from './types/parser'
export * from './types/validation'
export * from './types/io'
export * from './types/graph'
