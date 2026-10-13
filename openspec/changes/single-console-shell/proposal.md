# Proposal: One console shell (scoped domain console)

## Intent

Two console shells exist: `artifact_shell.html` (the `InnfoConsole` runtime) and
`workspace/assets/model_console.html` (driven by `render-model-viewer.js`). They
also come with two console "types" (model console, procedures console) and an MCP
tool (`build_console_payload`) whose only real consumer is one procedure. Each
console feature has to be built twice or ends up drifting, and the viewer is
already behind the runtime (no review mode parity, no facets, no CSP inlining).

Greenfield decision (maintainer): keep **one** shell,
`iNNfo/specs/bluepriNNts/console/artifact_shell.html`. Every console is the
domain console with a **scope**: the whole domaiNN, one model, a subset of
models, or one view. A reviewer-facing filtered console is just a scoped domain
console. No backwards-compat, no fallbacks, no legacy ledger entries.

## Scope

### In Scope
- Runtime parity before any deletion:
  - model identity header in the navbar (`meta.title`, template, `modelVersion`, generated);
  - working `#el-<id>` deep links that open the card and switch concept;
  - `meta.sourceUrl` link with a safe-scheme allowlist;
  - header-level "sources" citation icons, verified in jsdom.
- Payload/meta fixes:
  - per-model `sha256`, `feedbackState` and `citationsResolvedAt` in `meta.models`, read there by `review.js` (verdict badges, `source_sha256`);
  - a scope suffix in the draft-store `domainId`.
- Scope descriptor `meta.consoleScope = { view?, models?, label }`. The model/subset scope stays separate from the view scope, which strips the explorer.
- `export-console` scoped mode:
  - `<ModelName>`, `--filter` and `--all` become sugar for a scoped domain console;
  - output is write-once under `artifacts/<scope>_console/`;
  - `--status` and `--stale` are redefined over per-model `sha256` in `meta.models`.
- Re-point every viewer-booting test to `artifact_shell.html` and prove each one can still go red.
- Delete:
  - `model_console.html`, `render-model-viewer.js` and `compile_model_console_NN.md`;
  - `build_console_payload` (tool, spec, server wiring) and `console-golden-parity.test.ts`;
  - the two procedures consoles (`document_sop_console`, `Ghostbusters_V_0-2-0_procedures_console`).
- Update docs, living specs and the `nn-innfo` tool table. Supersede backlog decision D17.
- Releases (tag-driven, keys from `scripts/release/release-keys.js`: `skills|blueprints|innfo-mcp|innfo-console`): `innfo-console-v*`, `blueprints-v*` + repin, `innfo-mcp-v*` (breaking), skills bump. Pins are never hand-edited.

### Out of Scope (greenfield, not ported)
- Per-concept section headings with counts, schema-weight sorting, and an "All concepts" rail entry. Active-filter pills already cover the reset case.
- Per-scope tab configuration. Choosing scope from the UI (the existing `model:` facet already lets a reviewer narrow further).
- A replacement procedure for `compile_model_console`, and a CLI-only golden test (optional, later).
- The core payload builder in innfo-core, which stays.

## Assumptions / decisions taken in auto mode, maintainer may override

1. The per-model CLI mode stops being a distinct mode. `<ModelName>`, `--filter` and `--all` produce a domain console scoped to those models. `--status` and `--stale` use the per-model `sha256` in `meta.models`.
2. A scoped console shows the same tabs as the domain console, narrowed by the scoped payload.
3. Scoped consoles are write-once timestamped files under `artifacts/<scope>_console/`. Scoped export never touches `domaiNN_console.html`.
4. The `meta.sourceUrl` link is kept, ported into the runtime together with its allowlist and XSS tests.
5. Scope is chosen at export time (CLI) only.

## Capabilities

### New Capabilities
- `console-scope`: a scope descriptor (`meta.consoleScope = { view?, models?, label }`) that turns any console into a scoped domain console (whole domaiNN, one model, a subset of models, or one view).

### Modified Capabilities
- `console-architecture`: one shell; the L3 "Model Custom Consoles" requirement is removed in favor of scoped domain consoles.
- `innfo-console-runtime`: identity header, deep links, `sourceUrl`, header-level sources icons, `consoleScope.models`/`label`, scoped draft identity.
- `console-export-cli`: the per-model family is replaced by the scoped mode; `--status`/`--stale` redefined; `--view` may be combined with a model subset.
- `console-payload-builder`: the MCP tool and procedure parts are removed; `meta.models` carries `sha256`/`feedbackState`/`citationsResolvedAt`.
- `console-schema-resolution`: CLI-only.
- `console-view-registry`: the `--view` scope descriptor shares `consoleScope`.
- `console-review-mode`, `innfo-console-feedback`: verdict badges read per-model state from `meta.models`.
- `console-ui-kit`, `console-field-citations`: viewer references are dropped; header-level sources go through the runtime.
- `template-procedures-manifest-and-discovery`: the `compile-model-console` scenario and the stale file count are removed.
- `nn-naming-contract`: the frozen-procedure example is replaced.
- `lineage-single-edge`, `editor-lineage-ui`, `metrics-console-adoption`: staleness and console references are re-pointed to the scoped domain console.

### Removed
- `build_console_payload` MCP tool, `compile_model_console` procedure, and the console types "model console" and "procedures console".

## Approach (ordered slices)

| Slice | Content |
|---|---|
| S1 | Runtime parity (identity header, deep links, `sourceUrl`, header sources), meta fixes (`meta.models` state, scoped `domainId`), scope descriptor. jsdom tests. |
| S2 | `export-console` scoped mode, write-once `artifacts/<scope>_console/`, `--status`/`--stale` on `meta.models[].sha256`, relax the `--view` + subset check (`export-console.mjs:415`). |
| S3 | Re-point `console-review-env.ts` and the suites listed in the exploration (§1, §5) to `artifact_shell.html`. Rewrite the viewer-only suites through the runtime. Mutation-check that each one can go red. |
| S4 | Delete the shell, viewer, procedure, MCP tool and parity test, and the old consoles. Update `console-bundle.js` SOURCES, guards, docs and living spec deltas. Mark D17 as superseded. |
| S5 | Releases: regenerate bundles; tag-driven release keys (`skills|blueprints|innfo-mcp|innfo-console`) via `scripts/release/release-keys.js`, never hand-edited. |

## Active OpenSpec changes coherence

- `2026-10-10-blueprint-external-skills` also deltas `template-procedures-manifest-and-discovery` (R-TPD-04, not the `compile-model-console` scenario). Archive it before this change's delta lands, or rebase onto it.
- That change's `specs/template-package-structure/spec.md:10` has a stale example, `assets/model_viewer.html`. Fix it there.
- The other pre-existing active changes do not couple by spec: `2026-10-01-nn-domain-git-workflow` and `2026-10-11-video-script-contract-additions` are clean; `2026-09-30-nn-quarantine-removal` couples only because it names the editor `useLegacyDomain.ts` (retired by the lineage change S5) and it is BLOCKED; `2026-10-07-nn-upgrade-contract-docs` was folded into the lineage change S4.

### Reconcile with the lineage change set (2026-10-13)

This change was authored in parallel with the eight 2026-10-13 lineage changes
(`2026-10-13-*`) and collides with six of them (#1A, #1C, S2c, S3, S5, S6) on the same
capability requirements (console-architecture, console-payload-builder,
console-review-mode, console-export-cli, innfo-console-runtime, lineage-single-edge,
editor-lineage-ui, innfo-console-feedback, console-view-registry).

**Authority:** this change is the console spine and applies **first**; the lineage deltas
that touch console capabilities are re-cut against the post-SCS living specs. The full
order, the requirement-by-requirement overlap list and the affected external changes live
in [`openspec/changes/2026-10-13-DEPENDENCIES.md`](../2026-10-13-DEPENDENCIES.md).

## Affected Areas

| Area | Impact |
|---|---|
| `iNNfo/specs/bluepriNNts/console/innfo-runtime.js`, `artifact_shell.html`, `review.js` | Modified |
| `scripts/export-console.mjs`, `scripts/lib/console-bundle.js`, `console-shell-guard*` | Modified |
| `iNNfo/specs/bluepriNNts/workspace/assets/model_console.html`, `console/render-model-viewer.js`, `workspace/procedures/compile_model_console_NN.md` | Removed |
| `iNNfo/packages/innfo-mcp/src/tools/build-console-payload*`, `server.ts`, `test/console-golden-parity.test.ts` | Removed/Modified |
| `procedures/.../document_sop_console/`, `samples/.../Ghostbusters_V_0-2-0_procedures_console/` | Removed |
| `iNNfo/packages/innfo-core/tests/console-*`, `test/console-element-card.test.mjs` | Modified |
| `skills/nn-innfo/SKILL.md`, `docs/innfo/documentation/*`, `openspec/backlog.md` | Modified |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Identity header or deep links are lost silently | Med | S1 lands with tests before S4 deletes anything |
| `--stale` / lineage staleness regress | Med | Redefine and test in S2 against `meta.models[].sha256` |
| Re-pointed suites pass vacuously | High | Prove each suite can go red in S3 |
| Scoped export clobbers `domaiNN_console.html`, or drafts collide | Med | Write-once path plus a scope suffix in `domainId`, both tested |
| Frozen `workspace` byte-check | Med | Repin `blueprints-v*` (`workspace/` deletions only; `workspace_spec_NN.md` is untouched, so no version bump) |
| Delta collision with the external-skills change | Med | Sequence the archive first (see coherence) |
| MCP clients calling `build_console_payload` | Low | Breaking `innfo-mcp` minor; sole user |

## Rollback Plan

- Each slice is its own PR. S1–S3 are additive or test-only and can be reverted per commit.
- S4 is a pure deletion: revert the commit to restore the files.
- S5: published tags stay immutable. Roll back by repinning the previous `blueprints-v*`, `innfo-console-v*` and `innfo-mcp-v*` tags.

## Success Criteria

- [ ] `rg "model_console|render-model-viewer|build_console_payload|compile_model_console"` over source, specs and docs finds only archived/permanent history.
- [ ] A single-model scoped console shows the model title, template, version and generated date. `#el-<id>` opens the card and switches concept.
- [ ] Verdict badges and `source_sha256` work in a scoped console.
- [ ] Scoped export writes under `artifacts/<scope>_console/`, `domaiNN_console.html` is unchanged, and drafts are isolated per scope.
- [ ] `--status`/`--stale` report correctly from `meta.models` sha256.
- [ ] Every re-pointed suite fails when its target behavior is broken. `verify.js` and `check-integrity` are green after S5.

## Review Workload Forecast

| Slice | Est. changed lines (hand-written) |
|---|---|
| S1 | ~450 (runtime ~200, tests ~250) |
| S2 | ~350 |
| S3 | ~600 (about 15 suites + env helper) |
| S4 | ~350 hand edits + large generated/deleted files |
| S5 | ~80 hand edits + regenerated bundles |

- Delivery (maintainer, 2026-10-13): **one session branch, one final integration, slice-per-commit** — no chained PRs. S4 stays gated on S1–S3.
- 400-line budget risk: **High**, accepted (mitigated by slice commits for revert, not by PR splitting).
- Archive ordering: `2026-10-10-blueprint-external-skills` is archived before this change's spec deltas land.
