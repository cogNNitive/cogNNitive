# Tasks: Console cleanup and shell lint

All paths below are under `iNNfo/specs/bluepriNNts/` unless they start with `scripts/`, `innfo-core/`, `docs/` or `manifest/`. Strict TDD: RED, then GREEN, then REFACTOR. Every new test MUST be proven able to go red before its GREEN step. Each slice is one chained PR with work-unit commits (tests stay with the behavior they verify). Do not `git add -A`, `commit -a`, or stash (blocked by hook).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | Slice 1 ~780 (~700 deletions), Slice 2 ~350, Slice 3 ~250; total ~1,380 |
| 400-line budget risk | High (slice 1 alone exceeds it, but it is mostly whole-file deletions) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 cleanup -> PR 2 guard -> PR 3 pins + exporter + release |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (recommend stacked-to-main; see below) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

Recommendation: `stacked-to-main`. Each slice is green on its own, the repo uses a single `dev` integration branch batched to `main`, and the release batch is one push (`dev:main`). Slice 1 needs a maintainer `size:exception` for its ~700 deletion lines, or a split into 1a (consumer-proof test + 6 deletions, ~600 mostly deleted lines) and 1b (spec edits, bumps, registry regen, test repoints, ~180). Note: `nn-dev-release` skill text is stale; use the release sequence in Phase 3.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Cleanup: consumer proof, 6 deletions, spec edits, `blueprints` 0.20.0 | PR 1 | Base = `main`; green alone; no guard yet |
| 2 | Guard: registry D1, C1-C3, R1-R2, ledgered exception, wiring | PR 2 | Base = PR 1 branch (or `main` once PR 1 merged); needs the cleaned tree |
| 3 | Pins, exporter whole-URL, C4, `console_assets` 0.7.0, docs, release | PR 3 | Base = PR 2 branch; release steps run after merge |

## Phase 0: Pre-apply gates (maintainer, blocking)

- [ ] 0.1 Chain strategy chosen (`stacked-to-main` recommended) and slice-1 `size:exception` or 1a/1b split decided.
- [ ] 0.2 Open question: confirm `innfo-console-v*` tags resolve on jsDelivr under `cogNNitive/cogNNitive-web` (manifest repo) versus `cogNNitive/cogNNitive` used by today's shells. Blocks task 3.5 (repo literal in C4 and exporter constant).
- [ ] 0.3 Open question: confirm asset-only `blueprint_version` bumps are NOT needed for metrics, procedures and workspace (assumed no; they ride the new `blueprints-v` tag).
- [ ] 0.4 Re-audit git state and run the `nn-dev-development` concurrency scan; do not touch the other untracked `2026-09-30-*` change dirs.

## Phase 1: Slice 1, Cleanup (PR 1)

Commit 1.A `test(console): prove no consumer reads removed shells`; commit 1.B `chore(console): remove dead shells and assets`; commit 1.C `chore(blueprints): drop console assets and bump blueprints 0.20.0`.

- [ ] 1.1 RED: add the consumer-proof test (new `innfo-core/tests/console-removed-shells.test.ts`) that greps non-fixture sources for the 6 deleted file names and for `layout` reads in `console/*.js`, `workspace_hub.html` and `canonical-registry.ts`; it MUST fail when a reference is planted (Scenario: Consumer found) and currently pass or fail only on the `assets:` mirror.
- [ ] 1.2 RED: repoint `innfo-core/tests/console-citations-dom.test.ts` fixture to `workspace/assets/model_console.html` (`#doc-title`, `#rail`); run it green against the current tree first.
- [ ] 1.3 RED: update `innfo-core/tests/console-{shell,renderers,thinning}.test.ts`: drop the model_viewer seam block and the `git show HEAD` byte test; keep registry assertions working on the current shape (capability-only assertions land in slice 2).
- [ ] 1.4 GREEN: delete `business/assets/model_viewer.html` and the 5 thin shells (`analysis/assets/strategic_audit_console.html`, `documentation/assets/docs_portal_console.html`, `innovation/assets/innovation_funnel_console.html`, `organization/assets/org_chart_console.html`, `projects/assets/roadmap_console.html`).
- [ ] 1.5 GREEN: remove the `assets:` entries and patch-bump `blueprint_version` in the 6 `spec_NN.md` (business, analysis, documentation, innovation, organization, projects); in business also remove the `:185-187` transition sentence. Do not edit `_V_x-y-z_` files.
- [ ] 1.6 GREEN: set `manifest/source.yaml` `blueprints` channel to 0.20.0 (the `version:` key means spec_version; do not touch it); run `node scripts/sync-versions.mjs`, never hand-edit generated refs.
- [ ] 1.7 GREEN: regenerate `innfo-core/src/schema/canonical-registry.ts` with `node scripts/generate-canonical-registry.mjs`. Do NOT rebuild `innfo-mcp/bin/innfo-mcp.bundle.js` (D5: it would mutate published `innfo-mcp-v0.12.0`).
- [ ] 1.8 REFACTOR: confirm `rg` finds no dangling reference to the 6 deleted paths outside fixtures and `simulation/FINDINGS.md`.
- [ ] 1.9 VERIFY: `npm run lint`, `npm run typecheck`, `npm --workspace=@cognnitive/innfo-core test`, `npm run test`, `node scripts/verify.js`, `node scripts/check-integrity.js`; all green.

## Phase 2: Slice 2, Guard (PR 2)

Commit 2.A `feat(console): add console shell guard with capability-only registry`; commit 2.B `feat(console): wire guard into verify and integrity gates with ledgered exception`.

- [ ] 2.1 RED: create `scripts/lib/console-shell-guard.test.js` with tmp-repo fixtures and LITERAL manifest versions (never computed like the code). Cases: unknown need (C2); missing feedback anchors (C3); `rail` alternative accepted; `config.runtime` present (C1 and Dead Runtime Key); registry holding a URL or `-vX.Y.Z` (R2); extra registry key (R1); stale exception (shell no longer declares the need, has the anchors, or is gone); exception does not cover pin or needs-subset; discovery finds a new shell without editing the guard. Build the legacy marker by concatenation as `legacy-ledger-guard.test.js:18` does. Run it and watch every case fail.
- [ ] 2.2 RED: real-tree test: CLI exits 0 on the repo; a copy of the real `model_console.html` without the exception goes red on `feedback-export` (proposal success criterion).
- [ ] 2.3 GREEN: rewrite `console/needs-registry.json` to D1 (`needs -> { description, anchors: string[][], renderer? }`; drop `version`, `runtime`, `renderers`, `since`). Seed the anchor table from the design and re-derive each from its bundle `getElementById` line; derive `guided-procedure` from `render-procedure-stepper.js` boot.
- [ ] 2.4 GREEN: create `scripts/lib/console-shell-guard.js` (`validateConsoleShells`, `discoverShells`, CLI block; C1-C3, R1-R2; `ANCHOR_EXCEPTIONS` for `workspace/assets/model_console.html` + `feedback-export`). C4 (pins) is NOT in this slice.
- [ ] 2.5 GREEN: add the marker `legacy:console/model-console-feedback-anchors` as a comment in `model_console.html` (no anchors added) and a 1:1 entry in `legacy-ledger.yaml` (`id`, `what`, `paths`, `why`, `removal` = "bundle injects feedback UI", `owner` = `2026-09-30-console-feedback-roundtrip`). Run `node scripts/lib/legacy-ledger-guard.js`.
- [ ] 2.6 GREEN: wire `scripts/verify.js` step 7f (after 7d) and `scripts/check-integrity.js` Group 2e (mirror Group 2d); RED first by planting a violation and confirming both exit non-zero.
- [ ] 2.7 RED then GREEN: make `innfo-core/tests/console-{shell,renderers,thinning}.test.ts` and `metrics/scripts/verify.harness.js` (reads `needs` only) pass with capability-only registry assertions.
- [ ] 2.8 REFACTOR: dedupe helpers shared with `legacy-ledger-guard.js` only if trivial.
- [ ] 2.9 VERIFY: `npm run lint`, `npm run typecheck`, `npm run test`, `node scripts/verify.js` (confirm `collectTestSuites` discovers the new suite), `node scripts/check-integrity.js`.
- [ ] 2.10 Cross-change note (no task here): change 2 `console-design-tokens-and-ui-kit` adds a "no color values in shell `:root`" rule to this guard, so keep rules pluggable per shell (a rule list, not one monolithic function).

## Phase 3: Slice 3, Pins, exporter and release (PR 3)

Commit 3.A `feat(console): enforce shell pin coherence (C4)`; commit 3.B `fix(console): export rewrites whole pinned URL and locks markers shapes`; commit 3.C `docs(console): registry is capabilities only`; then release steps.

- [ ] 3.1 RED: extend the guard test for C4 using literal versions: `@main` on jsDelivr, stale tag, wrong repo, missing vendored tag, legacy `templates/console` path all fail; `cdnUrl`, the raw.githubusercontent mirror and `./innfo-console.bundle.js` pass. Expect the real tree to go red on `artifact_shell`, `model_console`, `timeline`, `procedure_console`.
- [ ] 3.2 RED: `scripts/export-console.test.mjs`: output URL equals `getConsoleReleaseInfo().cdnUrl` for a fixture; no `templates/console`; `element.markers` is an object and `schema.markers` is an array, with and without markers (lock test, no exporter change for markers); `config.runtime` absent.
- [ ] 3.3 GREEN: `scripts/export-console.mjs` replaces the whole URL with a constant built from the banner version (D6; no manifest read at run time, #91); drop `config.runtime`.
- [ ] 3.4 GREEN: add C4 to the guard; set `manifest/source.yaml` `console_assets` to 0.7.0 (all 3 entries) via `sync-versions.mjs`; rebuild the bundle banner in `console/innfo-console.bundle.js` with `scripts/build-console-bundle.mjs`; add the new CDN bundle file as `build-docs.mjs` requires.
- [ ] 3.5 GREEN (after gate 0.2): update pin, repo and path in `console/artifact_shell.html`, `workspace/assets/model_console.html`, `metrics/assets/timeline.html`, `procedures/assets/procedure_console.html`; drop `config.runtime`; fix header comments. Touch only lines the pin forces (other `templates/` literals belong to the nomenclature rename).
- [ ] 3.6 GREEN: update `docs/innfo/documentation/console-needs-and-visuals.md` and `offline-consoles.md` (registry = capabilities; remove the shell list).
- [ ] 3.7 REFACTOR: remove leftover `runtime`/pin references in tests and comments.
- [ ] 3.8 VERIFY: `npm run lint`, `npm run typecheck`, `npm run test`, `node scripts/verify.js`, `node scripts/check-integrity.js`.
- [ ] 3.9 RELEASE (real tags, in order; nothing hand-typed): `node scripts/sync-versions.mjs`; `node scripts/check-integrity.js --pre-push` on `dev`; `git push origin dev:main`; immediately tag `blueprints-v0.20.0` and `innfo-console-v0.7.0` on `origin/main` and push both (refs derived by `scripts/lib/channel-refs.js`); run `node scripts/verify.js --release`. No `innfo-mcp` release (D5). Use the detached-worktree rehearsal if the tree is dirty.
- [ ] 3.10 Post-release: confirm jsDelivr resolves `innfo-console-v0.7.0` at the pinned URL; note in the PR that the stale `innfo-mcp` bundle mirror ships with the next `innfo-mcp` release.

## Dependencies

- Sequential: Phase 1 -> Phase 2 -> Phase 3; release (3.9) only after PR 3 merges.
- Parallel inside a slice: 1.1/1.2/1.3 (RED tests); 3.2 and 3.1 (independent suites).
- Bottleneck: gate 0.2 blocks 3.5 and the C4 repo literal.
