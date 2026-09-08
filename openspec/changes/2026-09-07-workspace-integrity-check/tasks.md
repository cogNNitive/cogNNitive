# Tasks: Workspace Integrity Check

## Pre-flight / confirm before starting (open questions — do NOT silently resolve)

- [x] **(a) Canonical catalog URL.** RESOLVED (orchestrator pre-flight): there is NO `cogNNitive/iNNfo`
  mirror repo. Canonical template/catalog serving is raw from the monorepo —
  `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/<path>` (the exact
  pattern `scripts/template-catalog.mjs:138` already emits). Catalog canonical URL is therefore
  `.../main/iNNfo/specs/templates/catalog.json`. The `docs/`/cognnitive.com same-origin copy (AD-3) is a
  slice-3 concern. Slice 1: `parsePinnedUrl` / `parseSemVer` fixtures use this URL shape.
- [x] **(b) `nn-innfo` SKILL.md §1 drift.** RESOLVED (orchestrator pre-flight): OUT OF SCOPE for this
  change. Tool-count / `prune_orphaned_specs` drift is not touched. Deferred to a follow-up.
- [x] **(c) `cross-model-reference-validation` delta.** RESOLVED (slice 2 apply): AD-4's
  `collectWorkspaceDiagnostics` / `filterDiagnosticsForModel` split fully covers the
  "diagnostics no longer filtered to one model" need; no standalone delta spec is required.
- [x] **(b2) Catalog `--check` in CI.** RESOLVED (slice 3 apply): `scripts/template-catalog.mjs --check`
  is wired into `verify.js` alongside the primitives drift guard. It immediately caught a real drift
  (business V_0-2-1 → V_0-2-3 from the concurrent template work).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1430 total across 4 chained PRs (S1 ~380 · S2 ~420 · S3 ~300 incl. ~120 generated · S4 ~330) |
| Repo 800-line budget (`iNNfo/AGENTS.md`) | Every slice is under it |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 core → PR2 mcp → PR3 catalog → PR4 editor (PR2 may sub-split 2a/2b) |
| Delivery strategy | ask-on-risk (assumed — not supplied) |
| Chain strategy | pending (user picks stacked-to-main or feature-branch-chain) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | PR | Base / depends on | Notes |
|------|------|----|-------------------|-------|
| 1 | `innfo-core` version-status primitives + `buildWorkspaceIntegrityReport` builder + report types + esbuild-to-CJS script + `--check` drift guard | PR1 | main / — | ~380 > 400 SDD default → `size:exception` |
| 2 | `innfo-mcp` `validate.ts` split + `check_workspace` tool + `server.ts` registration + `freshnessVerdict` export | PR2 | PR1 | ~420 > 400 → `size:exception` OR sub-split 2a (refactor) / 2b (new tool) |
| 3 | Catalog publication in `build-docs.mjs` + `verify.js` guard + `upgrade-check.js` delegation | PR3 | PR1 | generated `.cjs` review-exempt |
| 4 | `innfo-editor` `workspaceStore.open()` wiring + report state + 3-band UI + `nn-innfo` docs | PR4 | PR1, PR3 | needs canonical catalog URL from PR3 |

Dependency graph: `PR1 ─┬─► PR2` and `PR1 ─┴─► PR3 ─► PR4`.

## Slice 1 — `innfo-core` primitives + report builder

Depends on: nothing. Blocks: slices 2, 3, 4. Est. ~380 lines (≈260 src + 120 test) — under 800, over the 400 SDD default → `size:exception`.

> Orchestrator scope note: the esbuild-to-CJS script + `verify.js` drift guard (Work Unit 1 in the
> forecast table) were pulled into this slice. The `upgrade-check.js` delegation, catalog publication
> in `build-docs.mjs`, and the `preflight-check.js` URL change stay in Slice 3 (tasks 3.4, 3.6, 3.7).

- [x] 1.1 RED — `src/workspace/integrity/versionStatus.spec.ts`: table-driven tests for `parseSemVer`,
  `compareVersions`, `gapKind`, `parsePinnedUrl` (flat + package layouts) and `classifyAgainstCatalog`
  across all six statuses; lift fixtures from `upgrade-check.test.js` for provable parity. Fails (no module).
  → 27 tests, confirmed RED (module load failure) then GREEN.
- [x] 1.2 GREEN — Create `src/workspace/integrity/versionStatus.ts`: port the 5 pure fns from
  `upgrade-check.js:37-215` + `VersionStatus` / `VersionGap` / `VersionClassification` types. `unknown`
  is reachable only when `catalog === null`; the 5 published values keep exact CLI parity. `VersionGap`
  gains the additive `'none'` literal (spec vocabulary) alongside `null` (unparseable).
- [x] 1.3 RED — `src/workspace/integrity/report.spec.ts` with hand-written fake ports: all ports present;
  optional ports omitted → `not-checked`; `catalog: null` → `offline`; throwing ports never reject the
  pass; freshness dedup by URL + concurrency cap (default 4). Fails (no builder). → 17 tests, RED then GREEN.
- [x] 1.4 GREEN — Create `src/workspace/integrity/report.ts`: AD-1 port interfaces, `ModelIntegrityReport`
  / `WorkspaceIntegrityReport` / `WorkspaceIntegrityAggregate` types, `buildWorkspaceIntegrityReport(ports, options)`,
  pure `summarizeWorkspaceIntegrity(models)`. No `node:fs` / `fetch` / `path`; dedup + concurrency cap live in the builder.
  `FreshnessField` gains the additive `'offline'` value (spec vocabulary).
- [x] 1.5 GREEN — Export both modules from `src/index.ts` AND `src/browser.ts`.
- [x] 1.6 REFACTOR — Semver helpers already single-source in `versionStatus.ts` (no duplication introduced);
  added `src/workspace/integrity/purity.spec.ts` statically asserting no `node:*` / `require` / `fetch`
  import reaches the browser-exported modules.
- [x] 1.7 Verify — `npm --prefix iNNfo/packages/innfo-core run build` ✅; core suite 471 pass / 1 skip ✅;
  `npm --prefix iNNfo run typecheck` ✅; `npm --prefix iNNfo run lint` ✅ (0 errors, 488 pre-existing warnings);
  mcp 195 pass ✅; editor 630 pass / 2 skip ✅. `node scripts/verify.js` — BLOCKED at the pre-existing
  "Validate Stable Manifest" step (stable manifest pinned to tag `ff7a4bd`; identical failure on
  `origin/main`; documented in MEMORY.md "verify.js stable-manifest step blocked until tag cut"). The new
  step 11 drift guard passes in isolation and is covered by `scripts/build-preflight-primitives.test.mjs`.

### Slice 1 — added by orchestrator scope note (esbuild + drift guard)

- [x] S1.8 RED — `scripts/build-preflight-primitives.test.mjs`: render mode emits a requireable CJS bundle
  with the ported primitives; `--check` exits 0 in sync, 1 on drift; committed artifact matches source. RED then GREEN.
- [x] S1.9 GREEN — Create `scripts/build-preflight-primitives.mjs`: esbuild (hoisted via `tsup`)
  `--bundle --format=cjs --platform=neutral` from `versionStatus.ts` →
  `actioNN/skills/nn-preflight/scripts/lib/version-status.generated.cjs`; `--check` mirrors `template-catalog.mjs`.
- [x] S1.10 GREEN — Commit the generated `version-status.generated.cjs` (machine-produced, review-exempt).
- [x] S1.11 GREEN — `scripts/verify.js`: run `node scripts/build-preflight-primitives.mjs --check` (step 11).

Boundary — Start: no integrity module in core. Finish: core exports builder + primitives, fully
unit-tested, `dist/` rebuilt, no consumer wired. Verify: core suite + typecheck + lint + `verify.js` green.
Rollback: `git revert` the slice commit; additive dead code only.

Satisfies: `workspace-integrity-check` §Single Workspace Integrity Pass, §Per-Model Integrity Result,
§Workspace Aggregate, §Offline Degradation, §Status Orthogonal to Severity; `workspace-template-upgrade`
§Tier-3 Upgrade Detection Scan (shared primitive); `template-cache-staleness-detection` §Freshness
dedup + concurrency-cap.

## Slice 2 — `innfo-mcp` `check_workspace`

Depends on: slice 1 (`innfo-core` `dist/` built and consumed). Blocks: nothing downstream. Est. ~420
lines — under 800, over 400 SDD default. May sub-split: **2a** = `validate.ts` refactor (2.0–2.4),
**2b** = new tool (2.5–2.9), if the diff exceeds ~450 lines.

- [x] 2.0 Rebuild core first: `npm --prefix iNNfo/packages/innfo-core run build` (stale `dist/` surfaces
  as `<fn> is not a function` and looks like an integration bug).
- [x] 2.1 RED — `validate.spec.ts`: `filterDiagnosticsForModel` (pure) + `collectWorkspaceDiagnostics`
  on a `mkdtemp` fixture workspace, asserting ONE `recursiveParse`.
- [x] 2.2 GREEN — Split `validate.ts:243` into `collectWorkspaceDiagnostics(rootDir, cache)` + pure
  `filterDiagnosticsForModel(diags, rootDir, resolvedModelPath)`; rewrite `runWorkspaceValidation` as the
  2-line composition. Delete the stale L229-242 comment; replace with an accurate one.
- [x] 2.3 REGRESSION — Existing `validate_model` suite (both `workspace` modes) passes untouched;
  `workspace: true` output byte-for-byte identical.
- [x] 2.4 GREEN — Export `freshnessVerdict` from `resolver-node.ts` (visibility-only change).
- [x] 2.5 RED — `check-workspace.spec.ts` (mkdtemp, network stubbed): self-heals a missing template
  package → `hydrated`, existing `specs/` bytes untouched; `offline: true` → full local validation with
  `unknown` / `offline`; `summary_only: true` trims `models` (cap 25, `truncated: true`) but not `aggregate`.
- [x] 2.6 GREEN — Create `tools/check-workspace.ts`: Node ports (`discoverModels` `level === 3`;
  `validateAll` via `collectWorkspaceDiagnostics` + merged first-wins `SpecCache`; `fetchCatalog`;
  `resolveTemplate` via `resolveParentChainNode(..., { checkFreshness: false })`; `checkFreshness` via
  `freshnessVerdict`), executing AD-5 steps 1–6 (self-heal → collect → validate+filter → classify → dedup freshness).
- [x] 2.7 GREEN — Register in `server.ts`: `toolDefinitions` entry + `inputSchema` (`root`,
  `summary_only`, `offline`) + `case 'check_workspace'` returning `envelope('innfo-check-workspace', report)`.
- [x] 2.8 REFACTOR — Per-model `TEMPLATE_CACHE_STALE` warnings preserve `code` / `message` / `promptHint`
  / canonical URL; warnings never mark a model or the pass failed.
- [x] 2.9 Verify — rebuild core → `npm --prefix iNNfo test` → `npm --prefix iNNfo run typecheck` →
  `lint` → `node scripts/verify.js`.

Boundary — Start: no `check_workspace`; `runWorkspaceValidation` monolithic; stale comment present.
Finish: tool registered returning a `WorkspaceIntegrityReport`, `validate.ts` split with accurate comment,
`validate_model` output unchanged. Verify: mcp suite + regression + `verify.js` green.
Rollback: `git revert`; dropping `case 'check_workspace'` restores prior behaviour exactly.

Satisfies: `workspace-integrity-check` §summary_only Flag, §Silent Additive Self-Healing Hydration,
§Non-Blocking (MCP), §Offline Degradation; `template-cache-staleness-detection` §Freshness Surfaces as a
Per-Model Field; `template-freshness-diagnostic` §MCP Server Parity (`check_workspace`);
`cross-model-reference-validation` (unfiltered diagnostics at workspace scope).

## Slice 3 — Catalog publication + preflight delegation

Depends on: slice 1 (`versionStatus.ts` is the esbuild input). Blocks: slice 4 (canonical catalog URL).
Est. ~180 hand-written + ~120 generated.

- [x] 3.1 RED — node test: `scripts/build-preflight-primitives.mjs --check` exits 1 on drift, 0 when the
  committed artifact matches the rendered bundle.
- [x] 3.2 GREEN — Create `scripts/build-preflight-primitives.mjs`: esbuild (via hoisted `tsup`)
  `--bundle --format=cjs --platform=neutral` from `innfo-core/src/workspace/integrity/versionStatus.ts` →
  `actioNN/skills/nn-preflight/scripts/lib/version-status.generated.cjs`; `--check` mirrors `template-catalog.mjs`.
- [x] 3.3 GREEN — Commit the generated `version-status.generated.cjs`; mark it review-exempt in the PR body.
- [x] 3.4 GREEN — `upgrade-check.js`: delete the 5 private fns + the L143-215 decision tree; `require`
  the generated module; `scanWorkspaceUpgrades` calls `classifyAgainstCatalog` per model. Keep
  `discoverModels` fs orchestration in the CLI.
- [x] 3.5 REGRESSION — `upgrade-check.test.js` passes unchanged against the delegated implementation.
- [x] 3.6 GREEN — `scripts/build-docs.mjs`: add a step adjacent to CDN-bundle staging — run
  `node scripts/template-catalog.mjs`, copy the result to `docs/innfo/templates/catalog.json`.
- [x] 3.7 GREEN — `preflight-check.js`: prefer `https://cognnitive.com/innfo/templates/catalog.json`,
  keep the `raw.githubusercontent.com/.../main/iNNfo/specs/templates/catalog.json` fallback
  (remote-first, 2.5 s timeout → local → offline). Gated on pre-flight (a).
- [x] 3.8 GREEN — `scripts/verify.js`: run `node scripts/build-preflight-primitives.mjs --check`;
  add `node scripts/template-catalog.mjs --check` if pre-flight (b2) confirms it belongs here.
- [x] 3.9 GREEN — Add `docs/innfo/templates/catalog.json` to the `nn-dev-check-integrity` Group 7
  generated-artifact drift list.
- [x] 3.10 Verify — `node scripts/verify.js`; `node scripts/build-docs.mjs` then
  `git status --porcelain -- docs/` clean; `node actioNN/skills/nn-preflight/scripts/upgrade-check.test.js`.

Boundary — Start: two classifiers (`upgrade-check.js` private copy), no published catalog. Finish: one
classifier (core → generated CJS), `docs/innfo/templates/catalog.json` published and drift-guarded,
preflight remote-first. Verify: `verify.js` + preflight tests + docs drift clean.
Rollback: `git revert`; `upgrade-check.js` restores its inlined fns.

Satisfies: `workspace-template-upgrade` §Template Catalog Artifact (canonical remote URL), §Tier-3
Upgrade Detection Scan (one implementation, no private copy).

## Slice 4 — `innfo-editor` wiring + UI + docs

Depends on: slices 1 and 3 (canonical catalog URL from AD-3). Est. ~330 lines.

- [x] 4.0 Rebuild core: `npm --prefix iNNfo/packages/innfo-core run build`.
- [x] 4.1 RED — store test: `open()` never awaits the check; a rejecting check does not set `error`;
  `reset()` clears `integrityReport` / `integrityRunning`.
- [x] 4.2 GREEN — Create `src/services/workspaceIntegrityPorts.ts`: 3 of 5 ports — `discoverModels` from
  `modelStore.nodes`, `validateAll` in-memory over parsed roots, `fetchCatalog` same-origin
  `fetch(CATALOG_URL)` 2.5 s timeout; omit `resolveTemplate` + `checkFreshness` → `not-checked`.
- [x] 4.3 GREEN — `workspaceStore.ts`: add `integrityReport` / `integrityRunning` state, `_runIntegrityCheck()`,
  `void this._runIntegrityCheck().catch(() => {})` immediately after `this.hasParsed = true` (L149),
  clear both in `reset()`.
- [x] 4.4 RED — component test: three visually distinct bands (invalid / informational / cannot-determine);
  `unknown` ≠ `invalid`; passive + dismissible; renders `not-checked` distinctly.
- [x] 4.5 GREEN — Create `src/components/layout/WorkspaceIntegrityNotice.vue`: three bands per Resolved
  Decision 5, mirroring the `useTemplateVersionNotice` / `ModelInfoPanel.vue:316` badge + copyable
  `innfo:` prompt pattern. Only the invalid band uses the error treatment.
- [x] 4.6 GREEN — Mount the notice in `WorkspaceDashboard.vue`.
- [x] 4.7 GREEN — `actioNN/skills/nn-innfo/SKILL.md`: document `check_workspace` in §1 and the
  workspace-open flow; fix the stale tool count. Flag the `prune_orphaned_specs` drift per pre-flight (b) —
  do NOT silently resolve it.
- [x] 4.8 REFACTOR — Assert no FS/Node import reaches the browser bundle; `not-checked` / `offline`
  fields render visually distinct from "invalid".
- [x] 4.9 Verify — rebuild core → `npm --prefix iNNfo test` → `npm --prefix iNNfo run typecheck` →
  `lint` → `npm --prefix iNNfo/apps/innfo-editor run build` → `node scripts/verify.js`.

Boundary — Start: `workspaceStore` has zero integrity hooks. Finish: report produced fire-and-forget on
`open()`, three-band passive UI mounted, docs updated. Verify: editor suite + app build + `verify.js` green.
Rollback: `git revert`; dropping the `open()` call + the notice restores current behaviour.

Satisfies: `workspace-integrity-check` §Editor Runs Catalog-Only on Open, §Non-Blocking (editor);
`template-freshness-diagnostic` §Web Editor Displays Warning Without Mutating Files (workspace-level
report), §Uncomputed freshness shown as not checked.

## Global rules (every slice)

- Strict TDD: RED (failing test) → GREEN (implementation) → REFACTOR. Test runner:
  `npm --prefix iNNfo test`; also `npm --prefix iNNfo run typecheck` and `npm --prefix iNNfo run lint`.
- Rebuild `innfo-core` (`npm --prefix iNNfo/packages/innfo-core run build`) before any `innfo-mcp` or
  `innfo-editor` test task.
- Per-slice rollback is a single `git revert` with no coupled state; each slice is additive.
- Follow `chained-pr` + `work-unit-commits`: one deliverable per PR, tests/docs in the same commit,
  each child PR carries a dependency diagram marking itself with the current-PR marker.
