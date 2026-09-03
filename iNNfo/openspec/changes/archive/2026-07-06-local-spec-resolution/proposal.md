# Proposal: Local Spec Resolution and Browser Bundle Separation

## Intent
Eliminate browser compilation issues in `innfo-core` by separating Node-dependent resolution logic, and support offline-first local spec resolution.

## Scope
### In Scope
- Extract `resolveParentChain` and related Node fs/path dependencies from `innfo-core`'s default bundle.
- Retain pure functions (`getSpecForLevel`, `getTemplate`, `getFormatSpec`, `getDefiNNe`) in `innfo-core/src/resolver.ts` without Node imports.
- Implement recursive local file search in `specs/` directory for spec files (by name/filename) prior to fetching from URL.
- Implement caching downloaded specs from URL into `.spec-cache/`.
- Update `packages/innfo-mcp` tools (`mutate.ts`, `spec.ts`) to use the new local-first spec resolution.

### Out of Scope
- Modifying browser UI logic or editor-specific storage mechanisms.
- Changing metamodel schemas or syntax validator rules.

## Capabilities
### New Capabilities
- **Offline-First Local Resolution**: The system recursively searches the `specs/` directory for matching spec names or filenames to resolve dependencies without network requests.

### Modified Capabilities
- **Browser-Safe Core**: `innfo-core` is clean of Node imports (`node:fs/promises`, `node:path`), preventing browser compilation failures.
- **Node-Only Resolution**: Resolution logic (`resolveParentChain`) is moved to `innfo-mcp` (or browser-excluded path) with network fallbacks caching to `.spec-cache/`.

## Approach
- **Move Logic**: Relocate Node-dependent `resolveParentChain` from `packages/innfo-core/src/resolver.ts` to `packages/innfo-mcp` (or a node-only helper).
- **Pure Core**: Strip `packages/innfo-core/src/resolver.ts` of any Node imports, ensuring it only exports pure functions. Remove `resolveParentChain` from `packages/innfo-core/src/index.ts`.
- **Recursive Search**: In the new resolver, recursively search `specs/` for files matches (e.g. `business_V_0-2-0` or `business_V_0-2-0_NN.md`). If found, assume it is the absolute source of truth.
- **Network Fallback**: If not found locally, fetch from `parent_spec.url` and cache under `.spec-cache/`.
- **Integrate**: Update MCP tools to call this new local-first resolver.

## Affected Areas
| Area | Impact | Description |
|---|---|---|
| `packages/innfo-core` | Medium | Remove Node dependencies and `resolveParentChain` export. |
| `packages/innfo-mcp` | Medium | House `resolveParentChain` and implement recursive local file search. |
| `apps/innfo-editor` | Low | Update imports of pure functions in test files. |

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Missing URL Fallback | Low | Verify that if a spec is not found locally, the network download succeeds and writes to `.spec-cache/`. |
| Directory Search Performance | Low | Cache search results in memory during resolution traversal to avoid redundant disk reads. |

## Rollback Plan
Revert core exports and restore original `resolver.ts` with Node imports. Revert MCP tools implementation back to original imports of `resolveParentChain` from `@cognnitive/innfo-core`.

## Dependencies
- None

## Success Criteria
- [ ] `packages/innfo-core` successfully compiles for browser bundles without Node-native errors.
- [ ] Specs found in `specs/` are resolved offline without network calls.
- [ ] Missing local specs fallback to downloading and are cached correctly in `.spec-cache/`.
- [ ] Unit tests for metamodel resolution continue to pass.
