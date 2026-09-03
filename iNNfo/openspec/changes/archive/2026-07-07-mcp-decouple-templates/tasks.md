# Tasks: Decouple `innfo-mcp` from hardcoded templates and spec URLs

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 120–180 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr (project default) |

Decision needed before apply: No

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Tests red for new `get_spec`/`get_template` contract | PR 1 | strict TDD — tests first |
| 2 | Remove hardcoding in `spec.ts` + rewire `mutate.ts` + `server.ts` | PR 1 | green |
| 3 | Typecheck, full test run, rebuild bundle | PR 1 | verify |

## Phase 1: Tests first (red)

- [x] 1.1 In `packages/innfo-mcp/src/tools/spec.spec.ts`, replace the `getSpec resolves local level-1 spec` test to call `getSpec(rootDir, { url })` with a local `specs/` stub; assert no fetch, spec resolved.
      *Verify*: test compiles against new signature and fails (red) before implementation.
- [x] 1.2 Add test: `getSpec(rootDir, { modelId })` derives `parent_spec.url` from a stub model on disk and resolves.
      *Verify*: red.
- [x] 1.3 Add test: `getSpec(rootDir, {})` returns an error/null without attempting fetch.
      *Verify*: red.
- [x] 1.4 Replace the `getTemplate resolves local level-2 template spec` test with `getTemplateFromUrl`-based resolution via `url` and via a stub model's `parent_spec.url`.
      *Verify*: red.
- [x] 1.5 Add test: `validateModel` on a model with no `parent_spec.url` returns `template: null` path with a warning and no throw.
      *Verify*: red.

## Phase 2: Remove hardcoding (green)

- [x] 2.1 `packages/innfo-mcp/src/tools/spec.ts`: delete `SPEC_BASE_URL`, `TEMPLATE_SPECS`, `resolveVersion()`, and `getTemplate()`. Add `readParentSpecUrl(rootDir, modelId)` helper. Rewrite `getSpec` to signature `(rootDir, { url?, modelId? })` resolving from url or model-derived `parent_spec.url`; error when neither. Keep `getTemplateFromUrl` unchanged.
      *Verify*: `grep -n "SPEC_BASE_URL\|TEMPLATE_SPECS" spec.ts` is empty; Phase 1 spec tests pass.
- [x] 2.2 `packages/innfo-mcp/src/tools/mutate.ts`: remove the `else if (parentName) getTemplate(...)` branch in both `validateModel()` and `applyChange()`. Add optional `template_url` handling in `validateModel`. Emit a warning when no template resolves.
      *Verify*: no reference to `getTemplate` remains in `mutate.ts`; Phase 1 validate test passes.
- [x] 2.3 `packages/innfo-mcp/src/server.ts`: update `toolDefinitions` for `get_spec` and `get_template` to `inputSchema` `{ url?, model_id? }` with publisher-neutral descriptions (remove "business/procedures/kb"). Update `handleGetSpec` and `handleGetTemplate` to read `url`/`model_id` and error when both absent.
      *Verify*: server compiles; handlers dispatch correctly.

## Phase 3: Verification

- [x] 3.1 Run `npm run typecheck` — zero type errors.
      *Verify*: exit code 0.
- [x] 3.2 Run `npm run lint` on `packages/innfo-mcp`.
      *Verify*: no new lint errors.
- [x] 3.3 Run root `npm run test` — all `innfo-mcp` suites green.
      *Verify*: vitest exit code 0.
- [x] 3.4 Rebuild the bundle: `npm run build:bundle` in `packages/innfo-mcp`; confirm `bin/innfo-mcp.bundle.js` regenerated and contains no `SPEC_BASE_URL`/`TEMPLATE_SPECS`.
      *Verify*: `grep -c "TEMPLATE_SPECS" bin/innfo-mcp.bundle.js` is 0.
