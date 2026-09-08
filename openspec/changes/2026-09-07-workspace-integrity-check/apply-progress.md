# Apply Progress — Workspace Integrity Check

**Change:** `2026-09-07-workspace-integrity-check`
**Slice:** 1 of 4 — `innfo-core` primitives + report builder (+ orchestrator-scoped esbuild/drift-guard)
**Mode:** Strict TDD
**Branch:** `feat/workspace-integrity-check-core`
**Delivery:** chained PR slice (`size:exception` — ~380 src+test lines, over the 400 SDD default, under the repo 800 budget)

## Status

Slice 1 COMPLETE. Ready for Slice 2 (`innfo-mcp` `check_workspace`).

## What landed

| File | Action | Notes |
|---|---|---|
| `iNNfo/packages/innfo-core/src/workspace/integrity/versionStatus.ts` | Create | 5 pure primitives (`parseSemVer`, `compareVersions`, `gapKind`, `parsePinnedUrl`, `classifyAgainstCatalog`) + `TemplateCatalog` / `VersionStatus` / `VersionGap` / `VersionClassification` types. Ported behaviour-for-behaviour from `actioNN/skills/nn-preflight/scripts/upgrade-check.js:37-215`. |
| `iNNfo/packages/innfo-core/src/workspace/integrity/versionStatus.spec.ts` | Create | 27 tests, fixtures lifted from `upgrade-check.test.js` for provable parity. |
| `iNNfo/packages/innfo-core/src/workspace/integrity/report.ts` | Create | AD-1 ports (3 required + 2 optional), `ModelIntegrityReport` / `WorkspaceIntegrityReport` / `WorkspaceIntegrityAggregate`, `buildWorkspaceIntegrityReport(ports, options)`, pure `summarizeWorkspaceIntegrity(models)`. No `node:fs` / `fetch` / `node:path`. Freshness dedup-by-URL + concurrency cap (default 4) live in the builder. |
| `iNNfo/packages/innfo-core/src/workspace/integrity/report.spec.ts` | Create | 17 tests with hand-written fake ports (zero IO). |
| `iNNfo/packages/innfo-core/src/workspace/integrity/purity.spec.ts` | Create | Static guard: no `node:*` / `require` / `fetch` in the browser-exported modules. |
| `iNNfo/packages/innfo-core/src/index.ts` · `src/browser.ts` | Modify | Export both integrity modules from both entry points. |
| `scripts/build-preflight-primitives.mjs` | Create | esbuild (hoisted via `tsup`) → `--bundle --format=cjs --platform=neutral`. `--check` drift mode mirrors `scripts/template-catalog.mjs`. `--out` override for tests. |
| `scripts/build-preflight-primitives.test.mjs` | Create | 4 zero-framework node tests (render, `--check` in sync, `--check` drift → exit 1, committed artifact in sync). |
| `actioNN/skills/nn-preflight/scripts/lib/version-status.generated.cjs` | Create | GENERATED. Machine-produced, review-exempt, drift-guarded. Do not hand-edit. |
| `scripts/verify.js` | Modify | New step 11: `node scripts/build-preflight-primitives.mjs --check`. |

## Design deviations

Two additive vocabulary widenings, both driven by the spec deltas (which the design's
AD-1/AD-2 type snippets predate):

1. `VersionGap` — added the `'none'` literal (kept `null` for genuinely unparseable input).
   The specs (`Per-Model Integrity Result`, `Offline Degradation`) say `gap` is `major` /
   `minor` / `patch` / `none`. `classifyAgainstCatalog` returns `'none'` for unpinned /
   unlisted / ahead / offline, `'same'` for `current`, and the bump kind for `upgrade-available`.
2. `FreshnessField` — added `'offline'` alongside `'not-checked'` / `'unknown'`. The specs
   (`Offline Degradation`, `template-freshness-diagnostic`) require `freshness → offline` when
   the catalog/remote is unreachable; `not-checked` stays reserved for "this platform has no
   freshness port".

`classifyAgainstCatalog(null, null)` returns `unknown` (offline dominates unpinned) per the
`Offline Degradation` scenario "`versionStatus` is `unknown` … for every model".

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 / 1.2 | `src/workspace/integrity/versionStatus.spec.ts` | Unit (core) | N/A (new) | ✅ module load fail | ✅ 27/27 | ✅ table-driven, all 6 statuses + flat/pkg URL layouts | ✅ single-source semver helpers |
| 1.3 / 1.4 | `src/workspace/integrity/report.spec.ts` | Unit (core) | N/A (new) | ✅ module load fail | ✅ 17/17 | ✅ ports present / optional omitted / catalog null / each port throwing / dedup / concurrency 3 & default 4 | ✅ `runWithConcurrency` extracted |
| 1.6 | `src/workspace/integrity/purity.spec.ts` | Unit (static) | N/A (new) | ✅ (asserts on real source) | ✅ 2/2 | ➖ single (guard is one shape) | ➖ none needed |
| S1.8 / S1.9 | `scripts/build-preflight-primitives.test.mjs` | Unit (scripts, node) | N/A (new) | ✅ script missing → spawn non-zero | ✅ 4/4 | ✅ render + in-sync + drift + committed-artifact | ➖ none needed |

### Test Summary
- Total tests written this slice: **50** (27 + 17 + 2 + 4)
- All passing. No `.only` / `.skip` left.
- Full suites green: core **471 pass / 1 skip**, mcp **195 pass**, editor **630 pass / 2 skip**.
- Layers used: Unit (50). Integration (0). E2E (0).
- Approval tests: none — no refactoring of existing production code (semver fns were ported into a new module; `upgrade-check.js` is untouched, its delegation is Slice 3).
- Pure functions created: 6 (`parseSemVer`, `compareVersions`, `gapKind`, `parsePinnedUrl`, `classifyAgainstCatalog`, `summarizeWorkspaceIntegrity`).

## Verification results (exact)

- `npm --prefix iNNfo/packages/innfo-core run build` → exit 0.
- `npm --prefix iNNfo/packages/innfo-core test` → **Test Files 40 passed (40); Tests 471 passed | 1 skipped (472)**.
- `npm --prefix iNNfo run typecheck` → exit 0 (`innfo-core` `tsc` + `innfo-editor` `vue-tsc --noEmit`).
- `npm --prefix iNNfo run lint` → **488 problems (0 errors, 488 warnings)** — all warnings pre-existing; zero in new files.
- `npm --prefix iNNfo/packages/innfo-mcp test` → **21 passed (21); 195 passed (195)**.
- `npm --prefix iNNfo/apps/innfo-editor test` → **88 passed | 1 skipped (89); 630 passed | 2 skipped (632)**.
- `npm run typecheck:scripts` (`tsc --noEmit -p tsconfig.scripts.json`) → exit 0 (covers the new `.mjs`).
- `node scripts/build-preflight-primitives.mjs --check` → exit 0 ("up to date").
- `node scripts/build-preflight-primitives.test.mjs` → all 4 pass.
- `node scripts/verify.js` → **BLOCKED (pre-existing, not caused by this slice)** at step "Validate Stable
  Manifest": `scripts/manifest/validate-manifest.js --channel stable` fails with 34 violations (stable
  manifest pinned to tag `ff7a4bd` / `templates-v0.2.4`; template tree restructured since; raw
  githubusercontent 404s + SKILL.md/manifest version mismatches for `nn-innfo` / `nn-trannsform`). The
  exact same command fails identically on `origin/main`. Documented: MEMORY.md → "verify.js
  stable-manifest step blocked until tag cut". The new step 11 is downstream of this halt but verified
  independently (above).

## Commits on `feat/workspace-integrity-check-core`

1. `docs(openspec): add workspace-integrity-check change`
2. `feat(innfo-core): port template version-status primitives from preflight CLI`
3. `feat(innfo-core): add workspace integrity report builder`
4. `build(preflight): bundle version-status primitives to a committed CJS artifact`
5. `docs(openspec): record slice 1 apply progress` (this file + tasks.md checkboxes)

No PR opened — orchestrator handles PR creation.

## What Slice 2 inherits

- `@cognnitive/innfo-core` now exports (from `index.ts` and `browser.ts`):
  - `parseSemVer`, `compareVersions`, `gapKind`, `parsePinnedUrl`, `classifyAgainstCatalog`
  - `buildWorkspaceIntegrityReport`, `summarizeWorkspaceIntegrity`
  - types: `WorkspaceIntegrityPorts`, `WorkspaceModelRef`, `IntegrityDiagnostic`,
    `TemplateResolutionResult`, `ModelIntegrityReport`, `WorkspaceIntegrityReport`,
    `WorkspaceIntegrityAggregate`, `BuildWorkspaceIntegrityOptions`, `CatalogSource`,
    `FreshnessField`, `TemplateResolution`, `TemplateCatalog` (+ `TemplateCatalogEntry` /
    `TemplateCatalogVersion`), `VersionStatus`, `VersionGap`, `VersionClassification`, `SemVerTriple`.
- Port contract Slice 2 must satisfy from the Node adapter (`iNNfo/packages/innfo-mcp/src/tools/check-workspace.ts`):
  - `discoverModels()` → `WorkspaceModelRef[]` (level-3 only; `path` forward-slashed workspace-relative;
    `parentUrl` = `parent_spec.url` ?? `spec_url` ?? null).
  - `validateAll(models)` → `Map<path, { errors: IntegrityDiagnostic[]; warnings: IntegrityDiagnostic[] }>`,
    ONE `recursiveParse` / `collectWorkspaceDiagnostics` for the whole tree (AD-4 split is Slice 2).
  - `fetchCatalog()` → `{ catalog: TemplateCatalog | null; source: CatalogSource }`, never throws.
  - `resolveTemplate?(model)` → `TemplateResolutionResult` with `outcome` and, when resolved,
    `localContent` (depth-0 raw template bytes — the builder needs it to feed `checkFreshness`).
  - `checkFreshness?(url, localContent)` → `'fresh' | 'stale' | 'unknown'`. The builder already
    dedups by URL and caps concurrency; the adapter just wraps `freshnessVerdict` (export it — task 2.4).
- Builder guarantees Slice 2 can rely on: never rejects; offline (`catalog === null`) forces every
  model to `versionStatus: 'unknown'`, `gap: 'none'`, `freshness: 'offline'`, `report.offline: true`;
  `report.degraded[]` carries human-readable "could not determine" notes; `summary_only` trimming is the
  caller's job (re-run `summarizeWorkspaceIntegrity` on the full list, keep `aggregate` full — Slice 2 task 2.5).
- `versionStatus.ts` is the esbuild entry for `version-status.generated.cjs`. If Slice 3 changes
  `versionStatus.ts`, it MUST re-run `node scripts/build-preflight-primitives.mjs` and commit the
  regenerated `.cjs` or `verify.js` step 11 / the `.test.mjs` will fail.
- Pre-existing blocker unchanged: `node scripts/verify.js` stops at "Validate Stable Manifest"
  regardless of this work. Slice 2/3 verification should run the same individual commands used here.
