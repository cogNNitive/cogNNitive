# Tasks: Refactor Metamodel Alignment

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 200-300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units
 
| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Unify parsing, merge fields dynamically, and clean up header | Single PR | Low risk, fits within 400-line budget |

## Phase 1: Core Parsing & Exports

- [x] 1.1 Extract `normalizeSingleModel` from `parseAndRegisterModel` in `packages/innfo-core/src/recursiveParser.ts` (returns `{ nodes, issues }`).
- [x] 1.2 Export `normalizeSingleModel` in `packages/innfo-core/src/index.ts`.
- [x] 1.3 Export `normalizeSingleModel` in `packages/innfo-core/src/browser.ts`.

## Phase 2: Editor Integration

- [x] 2.1 Refactor `apps/innfo-editor/src/composables/useUrlDocLoader.ts` to call `normalizeSingleModel` instead of manual generation.
- [x] 2.2 Define `getConceptFieldsForNode` helper in `apps/innfo-editor/src/components/editor/TreeEditor.vue` to merge concept fields from store.
- [x] 2.3 Update `blockFromNode` in `TreeEditor.vue` to dynamically merge metamodel fields per node.
- [x] 2.4 Implement dynamic field merging in computed properties of `apps/innfo-editor/src/views/WorkspaceView.vue`.
- [x] 2.5 Remove custom `parseFrontmatter` regex in `apps/innfo-editor/src/components/layout/Header.vue` and read fields from root node.

## Phase 3: Testing & Verification

- [x] 3.1 Add unit tests for `normalizeSingleModel` in `packages/innfo-core/tests/recursive-parser.test.ts`.
- [x] 3.2 Add integration tests verifying URL-loaded graphs in `apps/innfo-editor/tests/unit/file-system-ops.test.ts` or `workspace.integration.test.ts`.
- [x] 3.3 Verify empty metamodel field rendering in `BlockSheet` and `TreeEditor` component tests.
- [x] 3.4 Ensure no regressions in model parser and validator tests across the monorepo.

## Phase 4: Documentation & Cleanup

- [x] 4.1 Update JSDoc comments for the new `normalizeSingleModel` parser helper function.
- [x] 4.2 Clean up any unused imports or custom regex variables in modified Vue and TS files.
