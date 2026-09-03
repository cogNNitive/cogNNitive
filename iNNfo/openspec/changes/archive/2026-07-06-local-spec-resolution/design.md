# Design: Local Specification Resolution

## Technical Approach
Refactor spec resolution by decoupling Node-specific filesystem operations from `@cognnitive/innfo-core` to ensure the core remains browser-safe. We will move filesystem recursive searching and caching into a new Node-specific resolver helper inside `@cognnitive/innfo-mcp`, prioritizing local search in the `specs/` directory before falling back to HTTP fetching and caching in `.spec-cache/`.

## Architecture Decisions
### Decision: Decoupling Node APIs from Core Resolver
**Choice**: Remove `resolveParentChain` from `packages/innfo-core/src/resolver.ts` and keep only pure cache query functions. Re-implement the resolution logic with recursive file lookup under `packages/innfo-mcp/src/tools/resolver-node.ts`.
**Alternatives considered**: Using dynamic imports of Node APIs inside core. Rejected because bundlers still flag static imports of Node built-ins or pack them unnecessarily in browser builds.
**Rationale**: Keeps core lightweight and 100% pure browser-safe, ensuring zero bundler configuration/shims are needed for `node:fs` or `node:path`.

### Decision: Local Directory Prioritization & Matching
**Choice**: Use loose and strict normalization algorithms (stripping version and suffix strings like `_NN.md`) to resolve spec names recursively against files in `specs/`. If version is mismatched, bypass the local file to fetch the correct version from GitHub.
**Alternatives considered**: Strict exact string match only. Rejected because template names are requested as unversioned keys (e.g. `business`) but exist as versioned files (e.g. `business_V_0-1-1_NN.md`) or vice-versa.
**Rationale**: Version normalization prevents loading outdated specifications from `specs/latest/` when specific version chains are requested.

## Data Flow
```text
[mutate / spec tool] -> [resolver-node]
                              |
                     (1) Search local specs/ ?
                    /                         \
                [Found]                   [Not Found]
                  |                            |
          (2) Load locally            (2) Try .spec-cache/ ?
                                      /                    \
                                  [Found]               [Not Found]
                                    |                        |
                              Load cache               (3) Fetch GitHub URL
                                                       (4) Save to .spec-cache/
                                                             |
                                                       Load downloaded
```

## File Changes
| File | Action | Description |
|---|---|---|
| `packages/innfo-core/src/resolver.ts` | Modify | Remove `node:path` and `node:fs/promises` imports. Remove `resolveParentChain` function. Export only browser-safe helpers. |
| `packages/innfo-core/src/index.ts` | Modify | Export only the pure resolver functions. Remove `resolveParentChain` export. |
| `packages/innfo-core/src/browser.ts` | Modify | Export browser-safe resolver functions (`getSpecForLevel`, `getTemplate`, `getFormatSpec`, `getDefiNNe`). |
| `packages/innfo-core/tests/browser-safe.test.ts` | Create | Static check verifying that no file transitively imported by `src/browser.ts` imports Node built-ins. |
| `packages/innfo-mcp/src/tools/resolver-node.ts` | Create | New helper implementing recursive `specs/` traversal, normalization matching, caching, and `resolveParentChainNode`. |
| `packages/innfo-mcp/src/tools/spec.ts` | Modify | Replace `resolveParentChain` with `resolveParentChainNode` and pass the root repository path. |
| `packages/innfo-mcp/src/tools/mutate.ts` | Modify | Ensure it compiles correctly with updated exports. |
| `packages/innfo-mcp/tests/resolver-node.test.ts` | Create | Unit tests validating recursive file finding, version matching, caching fallback, and HTTP mocks. |

## Interfaces / Contracts
```typescript
// packages/innfo-mcp/src/tools/resolver-node.ts
export interface ResolverOptions {
  maxDepth?: number;
  timeout?: number;
}

export function resolveParentChainNode(
  rootDir: string,
  parentUrl: string,
  parentName: string,
  cacheDir: string,
  options?: ResolverOptions
): Promise<SpecCache>;
```

## Testing Strategy
| Layer | What to Test | Approach |
|---|---|---|
| Browser Integration | Verify core imports are browser-safe | Static import scanner in `browser-safe.test.ts` scanning `src/browser.ts` transitives. |
| Resolution Unit | Recursive resolution in `specs/` | Test `resolveParentChainNode` using mock directory structures and fetch mock overrides. |
| Fallback Integration | HTTP fetch and caching | Verify that missing local files download, write to `.spec-cache/`, and resolve. |

## Migration / Rollout
No database/schema changes needed. Build and link MCP package locally to verify the new resolution path.

## Open Questions
- None
