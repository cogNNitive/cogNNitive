# Tasks: adhoc-model-authoring-fixes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 180 - 280 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Adhoc model authoring fixes across MCP, core validator, and editor scanner | PR 1 | `npm test` | `npm test` | Revert changes in `packages/innfo-mcp`, `packages/innfo-core`, and `apps/innfo-editor` |

## Phase 1: Model ID Normalization & Local Spec Resolution

- [x] 1.1 [RED Test] Add failing unit tests in `packages/innfo-mcp/test/normalize-id.test.ts` for stripping `_NN`, `_NN.md`, `.md` and handling `model_NN_NN.md`
- [x] 1.2 Implement `normalizeId()` helper in `packages/innfo-mcp/src/tools/list-read.ts` and apply to `readModel` and `findModelFile` in `packages/innfo-mcp/src/tools/spec.ts`
- [x] 1.3 [RED Test] Add failing unit tests in `packages/innfo-mcp/test/resolver-node.test.ts` for `file://` URIs, absolute paths, missing paths, and `../../secret` traversal
- [x] 1.4 Update `packages/innfo-mcp/src/tools/resolver-node.ts` to convert `file://` and absolute paths using `fileURLToPath` and read via `readFile` without HTTP `fetch()`

## Phase 2: Diagnostics & Level 2 Template Validation

- [x] 2.1 [RED Test] Add failing tests in `packages/innfo-core/test/validator.test.ts` for emitting `[PARENT_RESOLUTION_FAILED]` and suppressing downstream concept warnings on missing parent specs
- [x] 2.2 Update `packages/innfo-core/src/validator/model.ts` to emit `[PARENT_RESOLUTION_FAILED]` error code and halt concept checks when parent loading fails
- [x] 2.3 [RED Test] Add failing integration tests in `packages/innfo-mcp/test/validate-template.test.ts` for `validate_template` tool with `level === 2` frontmatter
- [x] 2.4 Register `validate_template` MCP tool and handler in `packages/innfo-mcp/src/server.ts` with frontmatter level-2 auto-detection

## Phase 3: Media Scanner Extensions & Warnings

- [x] 3.1 [RED Test] Add failing unit tests in `apps/innfo-editor/test/useMediaScanner.test.ts` for `.xls` inclusion and omission warnings on `.exe`/`.zip`/`.txt` files
- [x] 3.2 Update `apps/innfo-editor/src/composables/useMediaScanner.ts` to support `.xls` files and return explicit `{ assets, warnings }` for omitted unsupported extensions

## Phase 4: Integration Verification & Documentation

- [x] 4.1 Run full test suite across core, mcp, and editor packages to verify zero regressions
- [x] 4.2 Update inline docstrings and tool schema descriptions for `validate_template` and `normalizeId`
