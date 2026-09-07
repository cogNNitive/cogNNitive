# Tasks: Workspace Integrity Check

## Pre-flight / confirm before starting (open questions — do NOT silently resolve)

- [ ] **(a) Canonical catalog URL.** Slice 3 publishes `docs/innfo/templates/catalog.json` and slice 4
  fetches `https://cognnitive.com/innfo/templates/catalog.json`. Confirm whether `iNNfo/specs/` is
  mirrored to `cogNNitive/iNNfo` `specs/` on `main` so the `raw.githubusercontent.com` fallback
  (AD-3 tier 2) actually resolves. If not, the raw fallback URL must be re-pointed before slice 3.
- [ ] **(b) `nn-innfo` SKILL.md §1 drift.** It says "13 herramientas" and lists `prune_orphaned_specs`,
  but `server.ts` registers 14 and has no such case. Slice 4 fixes the count + documents
  `check_workspace`; confirm `prune_orphaned_specs` was intentionally retired (out of scope — flag only).
- [ ] **(c) `cross-model-reference-validation` delta.** Confirm AD-4's `collectWorkspaceDiagnostics` /
  `filterDiagnosticsForModel` split fully covers the "diagnostics no longer filtered to one model"
  need, or whether a standalone `cross-model-reference-validation` delta spec is still required.
- [ ] **(b2) Catalog `--check` in CI.** Design open question: wire `scripts/template-catalog.mjs --check`
  into `verify.js` alongside the primitives drift guard in slice 3, or defer to a follow-up.

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

- [ ] 1.1 RED — `src/workspace/integrity/versionStatus.spec.ts`: table-driven tests for `parseSemVer`,
  `compareVersions`, `gapKind`, `parsePinnedUrl` (flat + package layouts) and `classifyAgainstCatalog`
  across all six statuses; lift fixtures from `upgrade-check.test.js` for provable parity. Fails (no module).
- [ ] 1.2 GREEN — Create `src/workspace/integrity/versionStatus.ts`: port the 5 pure fns from
  `upgrade-check.js:37-215` + `VersionStatus` / `VersionGap` / `VersionClassification` types. `unknown`
  is reachable only when `catalog === null`; the 5 published values keep exact CLI parity.
- [ ] 1.3 RED — `src/workspace/integrity/report.spec.ts` with hand-written fake ports: all ports present;
  optional ports omitted → `not-checked`; `catalog: null` → `offline`; throwing ports never reject the
  pass; freshness dedup by URL + concurrency cap (default 4). Fails (no builder).
- [ ] 1.4 GREEN — Create `src/workspace/integrity/report.ts`: AD-1 port interfaces, `ModelIntegrityReport`
  / `WorkspaceIntegrityReport` / `WorkspaceIntegrityAggregate` types, `buildWorkspaceIntegrityReport(ports, options)`,
  pure `summarizeWorkspaceIntegrity(models)`. No `node:fs` / `fetch` / `path`; dedup + concurrency cap live in the builder.
- [ ] 1.5 GREEN — Export both modules from `src/index.ts` AND `src/browser.ts`.
- [ ] 1.6 REFACTOR — De-dup shared semver helpers; assert no `node:*` import reaches `browser.ts`.
- [ ] 1.7 Verify — `npm --prefix iNNfo/packages/innfo-core run build`; `npm --prefix iNNfo test`;
  `npm --prefix iNNfo run typecheck`; `npm --prefix iNNfo run lint`; `node scripts/verify.js`.

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

- [ ] 2.0 Rebuild core first: `npm --prefix iNNfo/packages/innfo-core run build` (stale `dist/` surfaces
  as `<fn> is not a function` and looks like an integration bug).
- [ ] 2.1 RED — `validate.spec.ts`: `filterDiagnosticsForModel` (pure) + `collectWorkspaceDiagnostics`
  on a `mkdtemp` fixture workspace, asserting ONE `recursiveParse`.
- [ ] 2.2 GREEN — Split `validate.ts:243` into `collectWorkspaceDiagnostics(rootDir, cache)` + pure
  `filterDiagnosticsForModel(diags, rootDir, resolvedModelPath)`; rewrite `runWorkspaceValidation` as the
  2-line composition. Delete the stale L229-242 comment; replace with an accurate one.
- [ ] 2.3 REGRESSION — Existing `validate_model` suite (both `workspace` modes) passes untouched;
  `workspace: true` output byte-for-byte identical.
- [ ] 2.4 GREEN — Export `freshnessVerdict` from `resolver-node.ts` (visibility-only change).
- [ ] 2.5 RED — `check-workspace.spec.ts` (mkdtemp, network stubbed): self-heals a missing template
  package → `hydrated`, existing `specs/` bytes untouched; `offline: true` → full local validation with
  `unknown` / `offline`; `summary_only: true` trims `models` (cap 25, `truncated: true`) but not `aggregate`.
- [ ] 2.6 GREEN — Create `tools/check-workspace.ts`: Node ports (`discoverModels` `level === 3`;
  `validateAll` via `collectWorkspaceDiagnostics` + merged first-wins `SpecCache`; `fetchCatalog`;
  `resolveTemplate` via `resolveParentChainNode(..., { checkFreshness: false })`; `checkFreshness` via
  `freshnessVerdict`), executing AD-5 steps 1–6 (self-heal → collect → validate+filter → classify → dedup freshness).
- [ ] 2.7 GREEN — Register in `server.ts`: `toolDefinitions` entry + `inputSchema` (`root`,
  `summary_only`, `offline`) + `case 'check_workspace'` returning `envelope('innfo-check-workspace', report)`.
- [ ] 2.8 REFACTOR — Per-model `TEMPLATE_CACHE_STALE` warnings preserve `code` / `message` / `promptHint`
  / canonical URL; warnings never mark a model or the pass failed.
- [ ] 2.9 Verify — rebuild core → `npm --prefix iNNfo test` → `npm --prefix iNNfo run typecheck` →
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

- [ ] 3.1 RED — node test: `scripts/build-preflight-primitives.mjs --check` exits 1 on drift, 0 when the
  committed artifact matches the rendered bundle.
- [ ] 3.2 GREEN — Create `scripts/build-preflight-primitives.mjs`: esbuild (via hoisted `tsup`)
  `--bundle --format=cjs --platform=neutral` from `innfo-core/src/workspace/integrity/versionStatus.ts` →
  `actioNN/skills/nn-preflight/scripts/lib/version-status.generated.cjs`; `--check` mirrors `template-catalog.mjs`.
- [ ] 3.3 GREEN — Commit the generated `version-status.generated.cjs`; mark it review-exempt in the PR body.
- [ ] 3.4 GREEN — `upgrade-check.js`: delete the 5 private fns + the L143-215 decision tree; `require`
  the generated module; `scanWorkspaceUpgrades` calls `classifyAgainstCatalog` per model. Keep
  `discoverModels` fs orchestration in the CLI.
- [ ] 3.5 REGRESSION — `upgrade-check.test.js` passes unchanged against the delegated implementation.
- [ ] 3.6 GREEN — `scripts/build-docs.mjs`: add a step adjacent to CDN-bundle staging — run
  `node scripts/template-catalog.mjs`, copy the result to `docs/innfo/templates/catalog.json`.
- [ ] 3.7 GREEN — `preflight-check.js`: prefer `https://cognnitive.com/innfo/templates/catalog.json`,
  keep the `raw.githubusercontent.com/.../main/iNNfo/specs/templates/catalog.json` fallback
  (remote-first, 2.5 s timeout → local → offline). Gated on pre-flight (a).
- [ ] 3.8 GREEN — `scripts/verify.js`: run `node scripts/build-preflight-primitives.mjs --check`;
  add `node scripts/template-catalog.mjs --check` if pre-flight (b2) confirms it belongs here.
- [ ] 3.9 GREEN — Add `docs/innfo/templates/catalog.json` to the `nn-dev-check-integrity` Group 7
  generated-artifact drift list.
- [ ] 3.10 Verify — `node scripts/verify.js`; `node scripts/build-docs.mjs` then
  `git status --porcelain -- docs/` clean; `node actioNN/skills/nn-preflight/scripts/upgrade-check.test.js`.

Boundary — Start: two classifiers (`upgrade-check.js` private copy), no published catalog. Finish: one
classifier (core → generated CJS), `docs/innfo/templates/catalog.json` published and drift-guarded,
preflight remote-first. Verify: `verify.js` + preflight tests + docs drift clean.
Rollback: `git revert`; `upgrade-check.js` restores its inlined fns.

Satisfies: `workspace-template-upgrade` §Template Catalog Artifact (canonical remote URL), §Tier-3
Upgrade Detection Scan (one implementation, no private copy).

## Slice 4 — `innfo-editor` wiring + UI + docs

Depends on: slices 1 and 3 (canonical catalog URL from AD-3). Est. ~330 lines.

- [ ] 4.0 Rebuild core: `npm --prefix iNNfo/packages/innfo-core run build`.
- [ ] 4.1 RED — store test: `open()` never awaits the check; a rejecting check does not set `error`;
  `reset()` clears `integrityReport` / `integrityRunning`.
- [ ] 4.2 GREEN — Create `src/services/workspaceIntegrityPorts.ts`: 3 of 5 ports — `discoverModels` from
  `modelStore.nodes`, `validateAll` in-memory over parsed roots, `fetchCatalog` same-origin
  `fetch(CATALOG_URL)` 2.5 s timeout; omit `resolveTemplate` + `checkFreshness` → `not-checked`.
- [ ] 4.3 GREEN — `workspaceStore.ts`: add `integrityReport` / `integrityRunning` state, `_runIntegrityCheck()`,
  `void this._runIntegrityCheck().catch(() => {})` immediately after `this.hasParsed = true` (L149),
  clear both in `reset()`.
- [ ] 4.4 RED — component test: three visually distinct bands (invalid / informational / cannot-determine);
  `unknown` ≠ `invalid`; passive + dismissible; renders `not-checked` distinctly.
- [ ] 4.5 GREEN — Create `src/components/layout/WorkspaceIntegrityNotice.vue`: three bands per Resolved
  Decision 5, mirroring the `useTemplateVersionNotice` / `ModelInfoPanel.vue:316` badge + copyable
  `innfo:` prompt pattern. Only the invalid band uses the error treatment.
- [ ] 4.6 GREEN — Mount the notice in `WorkspaceDashboard.vue`.
- [ ] 4.7 GREEN — `actioNN/skills/nn-innfo/SKILL.md`: document `check_workspace` in §1 and the
  workspace-open flow; fix the stale tool count. Flag the `prune_orphaned_specs` drift per pre-flight (b) —
  do NOT silently resolve it.
- [ ] 4.8 REFACTOR — Assert no FS/Node import reaches the browser bundle; `not-checked` / `offline`
  fields render visually distinct from "invalid".
- [ ] 4.9 Verify — rebuild core → `npm --prefix iNNfo test` → `npm --prefix iNNfo run typecheck` →
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
