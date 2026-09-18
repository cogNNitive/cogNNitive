# Tasks: Nested Workspace Resolution and Mutation Hygiene

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

## Phase 1: Grammar & Lexer Enhancement
- [x] Implement character-by-character tokenizer in `splitSourceFieldValue` to parse bracketed lists and arrays with single/double quotes and escaped commas (`\,`) in [`packages/innfo-core/src/sourceRef.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-core/src/sourceRef.ts).
- [x] Export `levenshteinDistance` helper in [`packages/innfo-core/src/sourceRef.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-core/src/sourceRef.ts).
- [x] Add unit tests for quoted list items, escaped commas, and mixed brackets/quotes in [`packages/innfo-core/src/sourceRef.spec.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-core/src/sourceRef.spec.ts).

## Phase 2: Enhanced Diagnostics & Fuzzy Matching
- [x] Extend `SourceResolution` and `SourceResolver` interfaces in [`packages/innfo-core/src/validator/workspaceSources.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-core/src/validator/workspaceSources.ts) to support `parentExists` and `suggestions`.
- [x] Update `validateWorkspaceSources` in [`packages/innfo-core/src/validator/workspaceSources.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-core/src/validator/workspaceSources.ts) to emit distinct `KU_DANGLING_FILE` messages for missing parent directories vs missing files with Levenshtein "did you mean" hints.
- [x] Add unit tests for missing parent folders and fuzzy match suggestions in [`packages/innfo-core/tests/workspaceSources.test.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-core/tests/workspaceSources.test.ts).

## Phase 3: Nested Workspace Sources Resolver
- [x] Update `resolveSource` in [`packages/innfo-mcp/src/tools/validate.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-mcp/src/tools/validate.ts) and [`packages/innfo-mcp/src/tools/check-workspace.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-mcp/src/tools/check-workspace.ts) to walk up ancestor directories from `referringPath` searching for the nearest `sources/` directory before falling back to `rootDir`.
- [x] Populate `parentExists` and candidate file suggestions within the resolver implementation.
- [x] Add integration tests for nested sub-workspace source resolution and ancestor fallback in [`packages/innfo-mcp/test/validate-workspace-sources.test.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-mcp/test/validate-workspace-sources.test.ts).

## Phase 4: Cross-Model Reference Cascading in `bump_version`
- [x] Extend `bumpVersion` in [`packages/innfo-mcp/src/tools/apply-change.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-mcp/src/tools/apply-change.ts) to scan all workspace markdown models for references to the target model in `derived_from_inputs::`, `business_model::`, `sources::`, and wikilinks.
- [x] Implement in-memory pre-mutation template validation for all affected models before writing changes to disk in [`packages/innfo-mcp/src/tools/apply-change.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-mcp/src/tools/apply-change.ts).
- [x] Ensure atomic commit: roll back with zero disk changes if any dependent model fails validation.
- [x] Add tests for cascading version bumps and pre-mutation rollback safety in [`packages/innfo-mcp/test/apply-change.test.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-mcp/test/apply-change.test.ts).

## Phase 5: Verification & Integrity Tests
- [x] Run full `innfo-core` and `innfo-mcp` test suites via `pnpm test`.
- [x] Execute `validate_model --workspace` and `check_workspace` against test fixtures to verify zero regression and clean diagnostics.
