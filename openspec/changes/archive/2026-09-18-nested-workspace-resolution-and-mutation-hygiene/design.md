# Design: Nested Workspace Resolution and Mutation Hygiene

## Technical Approach
This design addresses false positive `KU_DANGLING_FILE` errors in nested sub-workspaces, reference breakages during model version bumps, rigid citation list parsing, and uninformative dangling file diagnostics. We introduce:
1. Multi-tier source directory traversal relative to referring models.
2. Workspace-wide reference cascading in `bump_version` with atomic pre-mutation validation.
3. A robust quote- and escape-aware tokenizer in `splitSourceFieldValue`.
4. Enriched diagnostics distinguishing missing parent folders from files, plus fuzzy Levenshtein suggestions.

## Architecture Decisions

### AD-01: Multi-Tier Relative Source Path Resolution
- **Context**: In nested workspace layouts (e.g. `subproject/models/model_NN.md`), source files reside in `subproject/sources/nn/` rather than the workspace root.
- **Decision**: `SourceResolver` and `validate.ts` walk up ancestor directories starting from `referringPath`'s directory to find the nearest ancestor directory containing a `sources/` folder before falling back to `rootDir`.
- **Rationale**: Preserves self-contained nested workspaces while supporting root-level fallback.
- **Alternatives Considered**: Flat workspace scan (causes name collisions across projects); strictly requiring absolute paths (breaks portability).

### AD-02: Workspace-Wide Reference Cascade in `bump_version`
- **Context**: Bumping a model's version (`Plan_V_0-1-0_NN.md` -> `Plan_V_0-2-0_NN.md`) breaks referencing models citing it via `derived_from_inputs::`, `business_model::`, `sources::`, or wikilinks `[[Plan_V_0-1-0_NN]]`.
- **Decision**:
  1. `bumpVersion` discovers all `.md` files across the workspace.
  2. For each file, updates references targeting the old model filename/ID.
  3. Pre-validates all modified models against their templates in memory.
  4. Commits all writes atomically; if any dependent model fails validation, the operation aborts with zero disk changes.
- **Rationale**: Prevents dangling references across dependent workspace models while guaranteeing atomic safety.
- **Alternatives Considered**: Warning without mutating (leaves workspace broken); partial unvalidated writes (risks silent corruption).

### AD-03: Quote- and Escape-Aware List Tokenization in `splitSourceFieldValue`
- **Context**: Filenames with commas (e.g. `report, final.md`) or quoted items (`["a, b.md#intro", "c.md"]`) break naive `.split(',')`.
- **Decision**: Refactor `splitSourceFieldValue` to use character-by-character tokenization:
  - Supports double (`"..."`) and single (`'...'`) quotes inside bracketed lists `[...]` and array items.
  - Supports escaped commas (`\,`) in unquoted strings, unescaping them to `,`.
  - Strips surrounding quotes while preserving inner content.
- **Rationale**: Maintains 100% backward compatibility with unquoted syntax while enabling complex paths.
- **Alternatives Considered**: Regex split (fragile with mixed escaping and nested quotes).

### AD-04: Richer `KU_DANGLING_FILE` Diagnostics with Fuzzy Matching
- **Context**: `KU_DANGLING_FILE` offers no insight into whether a directory is missing or a filename has a typo.
- **Decision**: `SourceResolver` reports directory existence and sibling candidate filenames. If the target parent directory is missing, the diagnostic indicates `Parent directory '<dir>' does not exist`. If the directory exists, it runs Levenshtein distance matching against sibling files and appends `Did you mean '<candidate>'?`.
- **Rationale**: Dramatically improves agent and human remediation speed.
- **Alternatives Considered**: Static error strings only.

## File Changes

| File | Changes |
| :--- | :--- |
| `packages/innfo-core/src/sourceRef.ts` | Refactor `splitSourceFieldValue` to support quotes and `\,` escapes; export `levenshteinDistance` helper. |
| `packages/innfo-core/src/validator/workspaceSources.ts` | Extend `SourceResolver` interface; add missing parent dir diagnostics and fuzzy "did you mean" hints for `KU_DANGLING_FILE`. |
| `packages/innfo-mcp/src/tools/validate.ts` | Update `resolveSource` in `collectWorkspaceDiagnostics` to perform ancestor-based `sources/` resolution and supply candidate files / dir existence. |
| `packages/innfo-mcp/src/tools/apply-change.ts` | Implement workspace model scanning, cascading updates across fields & wikilinks, and pre-mutation rollback validation in `bumpVersion`. |
| `packages/innfo-core/tests/` | Unit tests for quote parsing, escaped commas, missing parent dir, and fuzzy source suggestions. |
| `packages/innfo-mcp/tests/` | Integration tests for nested workspace validation and cascading version bumps. |

## Interfaces / Contracts

```typescript
export interface SourceResolution {
  exists: boolean
  headings?: string[]
  content?: string
  parentExists?: boolean
  suggestions?: string[]
}

export type SourceResolver = (
  refPath: string,
  referringPath?: string,
) => SourceResolution | null

export function splitSourceFieldValue(value: unknown): string[]
```

## Testing Strategy
- **Unit Tests (`innfo-core`)**:
  - `splitSourceFieldValue`: test `["a, b.md#intro", "c.md"]`, `[a\, b.md, c.md]`, array inputs, mixed quotes/escapes.
  - `validateWorkspaceSources`: verify `KU_DANGLING_FILE` messages include "Parent directory does not exist" and "Did you mean '...'".
- **Integration Tests (`innfo-mcp`)**:
  - Nested sub-workspaces with local `sources/nn/` directories resolving cleanly without false positives.
  - `bump_version` cascading updates across dependent models (`derived_from_inputs`, `sources`, wikilinks).
  - `bump_version` aborting safely when a dependent model fails template validation.
