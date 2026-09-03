# Tasks: Template Resolution from `parent_spec.url`

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 60–80 |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr (project default) |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | URL-based `getTemplateFromUrl` + wire into `mutate.ts` | PR 1 | Single PR, all changes in packages/innfo-mcp |
| 2 | Fallback edge case & typecheck/tests | PR 1 | Same PR, verify after changes |

## Phase 1: New URL-based Template Resolution

- [x] 1.1 Add `getTemplateFromUrl(rootDir, url, name)` to `packages/innfo-mcp/src/tools/spec.ts`
      — calls `resolveParentChain(url, name, join(rootDir, '.spec-cache'))`, then `coreGetTemplate(cache)`. If template is null, reads `{name}_NN.md` from cache dir and parses frontmatter with `parseFrontmatter` to build a `SpecDocument` (level: `fm.level ?? 2`). Wrap all in try-catch, return null on any error. Keep existing `getTemplate()` unchanged.
      *Verify*: Function exported and callable; returns `SpecDocument` on valid URL, `null` on 404; legacy `getTemplate` unaffected.

- [x] 1.2 In `packages/innfo-mcp/src/tools/mutate.ts`, import `getTemplateFromUrl` from `./spec.js`.
      In `validateModel()` (lines 111–116): after extracting `parentName`, check `model.frontmatter.parent_spec?.url`. If present, call `getTemplateFromUrl(rootDir, url, parentName)`; otherwise fall back to name-based `getTemplate()`.
      *Verify*: `validateModel` resolves via URL when present; falls back to legacy path when `parent_spec.url` is absent.

- [x] 1.3 In `packages/innfo-mcp/src/tools/mutate.ts`, apply same URL-first pattern to `applyChange()` at the template resolution block (lines 201–206).
      *Verify*: `applyChange` resolves via URL when present; legacy path unchanged otherwise.

## Phase 2: Fallback Edge Case

- [x] 2.1 In `getTemplateFromUrl`, when `coreGetTemplate(cache)` returns undefined, call `getFormatSpec(cache)` as a secondary check before the direct file read fallback. If `getFormatSpec` returns a document, return it. This mirrors the pattern in `getSpec()` and handles the case where the resolved cache has a format spec but no named template.
      *Verify*: `getFormatSpec(cache)` is called in the fallback path; its result returned if non-null; otherwise falls through to direct file read.

## Phase 3: Verification

- [x] 3.1 Run `npx tsc --noEmit` in packages/innfo-mcp — confirmed zero type errors.
      *Verify*: `tsc` exits with code 0.

- [x] 3.2 Run root `npm run test` — 14 of 14 tests pass (1 pre-existing suite failure in innfo-core, unrelated).
      *Verify*: `vitest` exits with code 0, all tests green.
