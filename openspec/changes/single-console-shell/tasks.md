# Tasks: One console shell (scoped domain console)

Authority: design.md (verified against code) > specs > proposal > exploration.
Strict TDD: every behavioral task is RED (failing test, run and seen red) -> GREEN -> REFACTOR.
Greenfield: no fallback, compat or legacy-ledger tasks. Never hand-edit pins; releases are tag-driven.

Conventions:
- `CORE` = `npx vitest run <file>` from `iNNfo/packages/innfo-core`. `MCP` = same from `iNNfo/packages/innfo-mcp`.
- `NODE` = `node --test <file>` from the worktree root.
- "Mutation check" = apply the named mutation, confirm the suite goes red, revert, record in apply-progress.
- Do NOT run `npm ci` from the worktree (node_modules are junctions to the primary checkout).

## Phase T0: Spec/proposal reconciliation (before any apply)

- [x] T0.1 (a) Edit `proposal.md`: remove `templates-v*`, `channel-refs.js`, `SHIPPED_TEMPLATE_VERSIONS` and "edit the `business` spec" (In Scope Releases line, S5 row, Risks row "Frozen workspace byte-check", Rollback S5, Affected Areas row for `business/spec_NN.md`, `canonical-registry.ts:42`). Replace with release keys `skills|blueprints|innfo-mcp|innfo-console` (`scripts/release/release-keys.js`). Verify: `rg "templates-v|channel-refs|SHIPPED_TEMPLATE_VERSIONS" openspec/changes/single-console-shell/proposal.md` returns nothing. Deps: none.
- [x] T0.2 (b) Draft key. Design and runtime (`innfo-runtime.js:5200-5203`) key drafts as `innfo-console:v2:` + `meta.domainId` (+ `::scope:<hash8 of sorted model ids>` from the exporter) + runtime-appended `::view:<id>`. It is NOT `meta.modelId`. Edit `specs/console-scope/spec.md` "Scoped draft identity" (line 66): the exporter suffix derives from the sorted scoped model ids only; the view id is appended by the runtime (`innfo-console-runtime` delta, line 88). Add to the `innfo-console-feedback` delta no draft-key text (it has none); confirm with `rg "modelId" specs/innfo-console-feedback`. Deps: none.
- [x] T0.3 (c) Purpose paragraphs: record in this file (archive task A.2) that `openspec/specs/{console-architecture,console-payload-builder,console-schema-resolution,console-review-mode,innfo-console-runtime}/spec.md` Purpose text mentioning viewer / `compile_model_console` is NOT covered by deltas and must be hand-edited at archive. Verify: `rg -il "viewer|compile_model_console" openspec/specs/{...}/spec.md` lists the files to fix. Deps: none.
- [x] T0.4 (d) [DROPPED 2026-10-13] The `feedbackState` badge scenario this task added to `specs/console-review-mode/spec.md` and `specs/innfo-console-runtime/spec.md` was removed in the reconciliation: verdict badges are owned by `2026-10-13-s2c-retire-legacy-provenance` and derive from the changesets. S1.8 now covers only `source_sha256`.
- [x] T0.5 (e) Add scenario to `specs/console-export-cli/spec.md` (after line 26): "WHEN `--domain` is combined with `<ModelName>`, `--filter`, `--all` or `--stale` THEN exit code 2, no file written". Also fix the "Open Questions" item in design.md to resolved. Deps: none. Covered by S2.4.
- [x] T0.6 (f) Fix `openspec/changes/2026-10-10-blueprint-external-skills/specs/template-package-structure/spec.md:10`: replace the `assets/model_viewer.html` example with a neutral one (e.g. `assets/artifact_shell.html`-style generic asset name that survives this change). Document in `design.md` D10 and archive tasks: external-skills archives FIRST. Verify: `rg model_viewer openspec/changes/2026-10-10-blueprint-external-skills` returns nothing. Deps: none.
- [x] T0.7 (g) Supersede `openspec/backlog.md` D17 (line ~860): rewrite the cell to state that "model console" and "procedures console" terms are retired; only "domain console" (optionally scoped) remains; update S3 row (line ~888) reference. Verify: `rg "model console|procedures console" openspec/backlog.md` finds only the superseded note. Deps: none (committed in S4 with docs).
- [x] T0.8 Resolve open questions in design.md with the maintainer: `meta.sourceUrl` producer (default: runtime support only, exporter does not emit). Deps: none. Blocks S1.5 wording only.

## Phase S1: Runtime parity (additive, tests first)

- [x] S1.1 RED `iNNfo/packages/innfo-core/tests/console-identity-header.test.ts` (new): single-model title in `#innfo-domain-title`, multi-model uses `meta.title`, `.innfo-scope-label`, `#innfo-navbar-extra` Template/Version/Generated, missing parts omitted, hostile title stays text. Verify: CORE red. Deps: T0.
- [x] S1.2 GREEN `console/innfo-runtime.js` `renderNavbarIdentity(doc, meta)` replacing `renderNavbarMeta`; `scopeModelsOf()`; `console/artifact_shell.html` h1 default `iNNfo Console` + `.innfo-scope-label` CSS (tokens only). Verify: CORE green. Mutations: early return; `innerHTML` title. Deps: S1.1.
- [x] S1.3 RED `tests/console-deep-link.test.ts` (new): `#el-<mId/elId>` switches concept (`concept:<C>`), opens card, scrolls, selects explorer tab without rewriting hash; unknown id no-op; view-scoped console no-op. Deps: S1.2.
- [x] S1.4 GREEN `innfo-runtime.js`: `domId = 'el-' + element.id` (:1790), `onHash` `^#el-` branch, `focusId`, `mountElementCards` `open: el.id === focusId`. Mutations: revert `domId`; remove `concept:` switch; drop `open`. Deps: S1.3.
- [x] S1.5 RED `tests/console-source-url.test.ts` (new; move cases from `test/console-element-card.test.mjs:292-326`): allow `http(s):`, reject `javascript:`, schemeless leading whitespace/`\`/bare `//`; link built via DOM APIs. Deps: S1.2.
- [x] S1.6 GREEN `innfo-runtime.js` `safeSourceHref(url)` (verbatim viewer predicate) + navbar link. Mutation: relax to `/^[a-z]+:/i`. Deps: S1.5.
- [x] S1.7 RED+GREEN header sources: extend `console-citations-dom.test.ts` (or new file) asserting >=1 icon in `.innfo-card-head`; `console/ui-kit.js` export `CitationIcons(field, entries, {onOpen})`; `innfo-runtime.js` pass `opts.head`. Mutation: stop passing `opts.head`. Deps: S1.4.
- [x] S1.8 RED+GREEN export hash: the feedback export resolves `meta.source_sha256` from the `meta.models` entry named by `source_knowledge` (fallback to `state.sourceSha256`/`meta.sha256`), so a multi-model scoped console gets the matching hash (see `innfo-console-feedback`, T0.2); `innfo-runtime.js:4834,5194`. Verdict badges are NOT part of this change (owned by `2026-10-13-s2c-retire-legacy-provenance`). Deps: S1.2, T0.2.
- [x] S1.9 REFACTOR: dedupe helpers, run `npm run build:console` to regenerate `console/innfo-console.bundle.js`; verify bundle drift test green. Verify: `CORE` full `console-*` tests + `NODE scripts/lib/console-bundle.test.js`. Deps: S1.2-S1.8.

## Phase S2: Scoped export (single path)

- [x] S2.1 RED `scripts/export-console.test.mjs`: selection writes `artifacts/<key>_console/` write-once, never `domaiNN_console.html`; keys `<stem>` / `<firstStem>-plus<N-1>-<hash6>`; `meta.consoleScope={models,label}`; `domainId` has `::scope:<hash8>`, order-independent. Mutations: write to `domaiNN_console.html`; drop suffix. Deps: S1.
- [x] S2.2 GREEN `scripts/export-console.mjs`: delete per-model loop (:817-887), `latestConsole`, `consoleDirRel`; add scope key/label/`domainId`. Deps: S2.1.
- [x] S2.3 RED+GREEN `meta.models[]` gains `sha256` and `citationsResolvedAt` from core per-model `payload.model.meta`; `composeExport` copies them without a verdict field. Test in `export-console.test.mjs`. Deps: S2.2.
- [x] S2.4 RED+GREEN arg checks: `--domain` + selection exits 2; `--view` alone keeps `artifacts/<view>_view/`; `--view` + selection writes `artifacts/<view>-<key>_view/`; `:415` check becomes `view && domain`; no selection exits non-zero; `buildDomainHtml` receives `outDirAbs` (image rebasing test). Deps: S2.2, T0.5.
- [x] S2.5 RED+GREEN `--status`/`--stale`/`--tree`: `inspectModelStatus` scans `domaiNN_console.html` + newest of each `artifacts/*_console/`; newest `meta.generated` listing the model by `filePath`; sha256/version compare; old consoles without `meta.models` read `uncompiled`; `--stale` = one scoped console over non-fresh models. Mutation: compare against oldest console. Deps: S2.3.
- [x] S2.6 Update `test/console-export*.test.mjs`, `test/helpers/console-artifacts.mjs`, `test/testlab-coverage.test.mjs`; regenerate testlab fixtures. Verify: `NODE test/console-export*.test.mjs scripts/export-console.test.mjs test/testlab-coverage.test.mjs` (run with `--test-concurrency=1`; parallel file runs crash in this environment). Deps: S2.5.

## Phase S3: Re-point suites (split S3a helper+review, S3b rest)

- [x] S3.1 `tests/helpers/console-review-env.ts`: default shell `console/artifact_shell.html`; `CONSOLE_SOURCES` without viewer; `loadConsole` returns `{UI,Review,Console}`. Verify: CORE `console-review-*`. Deps: S1.
- [x] S3.2 Re-point the 8 `console-review-*.test.ts`: drop `Viewer.boot()`, cards by `el-<qualified id>`, `#innfo-search`; each asserts non-empty card count first; mutation check per suite recorded. Deps: S3.1. (Re-point done; the 8 suites are green. Mutation checks + S3.3-S3.5 pending.)
- [x] S3.3 Re-point `console-feedback-ui`, `console-citations-dom`, `console-renderers`, `console-ui-kit-renderers`, `console-thinning`, `console-shell`, `naming/*`, `test/console-element-card.test.mjs`; same non-empty guard and mutation check. Deps: S3.1. (Done: `console-renderers`/`console-ui-kit-renderers` deleted with the viewer; `console-citations-dom` retargeted to the runtime; the rest re-pointed to `artifact_shell.html`. Mutation checks pending.)
- [x] S3.4 Delete the `describe.skip` block `console-citations-payload.test.ts:10-31`. Deps: S3.1.
- [ ] S3.5 Verify: CORE full run; zero `render-model-viewer` / `Viewer.boot` references in tests (`rg`). Deps: S3.2-S3.4.

## Phase S4: Deletions, guards, docs

- [x] S4.1 RED `scripts/lib/console-shell-guard.test.js:108-124,168`: assert `artifact_shell.html` discovered and guard source has no shell-name branch (guard code unchanged). Deps: S3.
- [x] S4.2 Delete `workspace/assets/model_console.html`, `console/render-model-viewer.js`, `workspace/procedures/compile_model_console_NN.md`, `document_sop_console/`, `Ghostbusters_V_0-2-0_procedures_console/` (all under `iNNfo/specs/bluepriNNts/` or samples). Deps: S4.1.
- [x] S4.3 `scripts/lib/console-bundle.js:24` drop `['render-model-viewer.js','InnfoModelViewer']` (+ test); `npm run build:console`. Deps: S4.2.
- [x] S4.4 MCP: delete `tools/build-console-payload.ts` + `.spec.ts`, `test/console-golden-parity.test.ts`; edit `server.ts` (:51, :635-637, :1016-1019), `server.spec.ts:151`. Verify: MCP full run; core exports still used by `console-payload.generated.cjs`. Deps: S4.2.
- [x] S4.5 Fix references: `nn-name-invariant-guard.test.js:84`, `check-procedures-version.test.mjs:58`, `reconcile_feedback_NN.md:141`, `export-console.mjs:626` comment, `schema-resolution.ts:5`, `skills/nn-innfo/SKILL.md:360`, `needs-registry.json` legacy anchors. Do NOT edit `business/spec_NN.md` or `canonical-registry.ts`. Deps: S4.2.
- [x] S4.6 Docs: `docs/innfo/documentation/{offline-consoles,console-ui-kit,console-needs-and-visuals,innfo-mcp}.md`; `openspec/backlog.md` D17 (T0.7). Deps: S4.2.
- [ ] S4.7 Verify: `rg "model_console|render-model-viewer|build_console_payload|compile_model_console" --glob '!openspec/changes/archive/**' --glob '!iNNfo/specs/bluepriNNts/business/**' --glob '!**/canonical-registry.ts'` finds only permanent history; `node scripts/verify.js`. Deps: S4.3-S4.6.

## Phase S5: Releases (tag-driven; never hand-edit pins)

- [ ] S5.1 `npm run build:console` and the mcp bundle; regenerate vendored fixture bundles; verify drift tests. Deps: S4.
- [ ] S5.2 Release `innfo-console` (`innfo-console-v*`) via `scripts/release/run-release.js` (key from `scripts/release/release-keys.js`). Deps: S5.1.
- [ ] S5.3 Release `innfo-mcp` (`innfo-mcp-v*`, minor, breaking). Deps: S5.2.
- [ ] S5.4 Release `blueprints` (`blueprints-v*`; `workspace/` deletions only, `workspace_spec_NN.md` untouched so no version bump). Deps: S5.1.
- [ ] S5.5 Release `skills` (nn-innfo tool table). Deps: S5.3.
- [ ] S5.6 `npm run sync:versions` if the release flow requires it; commit generated output only. Deps: S5.2-S5.5.

## Phase A: Archive and final gate

- [ ] A.1 Archive `2026-10-10-blueprint-external-skills` first; then rebase deltas of this change if it touches `template-procedures-manifest-and-discovery`. Deps: T0.6.
- [ ] A.2 Archive this change: merge deltas into `openspec/specs/`; hand-edit Purpose paragraphs (T0.3) in the five living specs; `rg -i "viewer|compile_model_console" openspec/specs` clean. Deps: A.1, S5.
- [ ] A.3 Final gate: `node scripts/check-integrity.js` with bounded timeout, monitoring its log mtime; if the log is flat for 3 minutes, kill it, fall back to `node scripts/verify.js`, and state the fallback in the report (nn-dev-development 4e). Also `node scripts/verify.js` green. Deps: A.2.

## Review Workload Forecast

| Slice | Est. hand-written changed lines |
|---|---|
| T0 | ~60 (docs/specs) |
| S1 | ~450 (runtime ~200, tests ~250) |
| S2 | ~350 |
| S3 | ~600 (split S3a: helper + 8 review suites; S3b: remainder) |
| S4 | ~350 hand edits + large deletions |
| S5 | ~80 + regenerated bundles |

Decision (maintainer, 2026-10-13): NO chained PRs — one session branch, one final integration, slice-per-commit. Local tests only for the file being touched; one full `console-*` run at S1 close and S3 close; one final `code-review` + `check-integrity` at S5 close.
400-line budget risk: High (accepted; mitigated by slice commits for revert, not by PR splitting)

Suggested order: T0 -> S1 -> S2 -> S3a -> S3b -> S4 -> S5 (slice-per-commit, no PRs). Open: `meta.sourceUrl` producer (T0.8). Archive order: external-skills first.
