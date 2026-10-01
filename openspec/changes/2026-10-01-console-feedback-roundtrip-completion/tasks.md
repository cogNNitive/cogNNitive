# Tasks: Console feedback round-trip completion

Change A of 3 (this -> `2026-10-01-console-ui-kit` -> `2026-10-01-console-review-ux`). Strict TDD: every slice starts with RED tests, proven able to fail before GREEN. Paths: `CONSOLE` = `iNNfo/specs/bluepriNNts/console`, `CORE` = `iNNfo/packages/innfo-core`, `MCP` = `iNNfo/packages/innfo-mcp`, `BP` = `iNNfo/specs/bluepriNNts`. Skills to load before PRs: `work-unit-commits`, `chained-pr`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,600 incl. deletions, excluding the generated bundle, cjs mirror and registry (A1 350, A2 400, A3 300, A4 400, A5 400, A6 350 + 333 pure deletions, release ~80) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | A1 -> A2 -> A3 -> A4 -> A5 -> A6a -> A6b (-> release prep); A2, A4, A5 split at the marked points if the measured diff exceeds 400 |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (recommended: feature-branch-chain) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

Recommendation: `feature-branch-chain`. Tracker branch (draft, no-merge) = `feat/console-feedback-roundtrip-completion`; A1 targets the tracker, each later PR targets the previous PR branch; only the tracker merges to `dev`/`main`. The released tags need a merge commit on `main` anyway, and B and C chain after this tracker.

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| A1 | Schema, three validators, shared corpus, nn-trannsform heading | PR 1 (base: tracker) | ~350. Independent of A2-A4 |
| A2 | Core builder, citations, slots, ledger rules, mirror `--check` | PR 2 (base: PR 1) | ~400. Split A2a builder/citations/slot (~250) and A2b ledger rules + mirror drift (~150) |
| A3 | CLI loud failure, fs resolver, root ledger, asset entry | PR 3 (base: PR 2) | ~300. Needs gate 0.3 |
| A4 | MCP payload tool, dedup, thin compile procedure, golden test | PR 4 (base: PR 3) | ~400. Split A4a dedup + resolver wrapper (~150) and A4b tool + procedure + golden (~250) |
| A5 | Bundle: injected UI, export gate, select removal, shells, guard, docs | PR 5 (base: PR 4) | ~400. Needs only A1, but stays linear (single writer). Split A5a runtime + DOM tests (~250) and A5b shells/registry/guard/docs (~150 + deletions) |
| A6a | Ledger tools, reconcile procedure | PR 6 (base: PR 5) | ~260 |
| A6b | Delete both `apply_feedback_NN.md`, repoint references, version bumps, skill text | PR 7 (base: PR 6) | ~100 added + 333 pure deletions. Split is the default; if the maintainer prefers one A6 PR it needs `size:exception` |
| R | Release prep and tags | tracker / `dev` | ~80 excl. generated. Runs once for the A+B+C batch (gate 0.7) |

Conventions for every slice: work-unit commits (tests + code + docs of one behavior together; the regenerated bundle/mirror/registry rides with its source in the same commit), conventional commits, no AI attribution. New relative imports in `CORE` carry `.js`.

**Standard gate (G)**, run at the end of every slice: rebuild innfo-core (`npm --workspace=@cognnitive/innfo-core run build`) before any `innfo-mcp` test; `npm run lint`; `npm run typecheck`; `npm run test`; `node scripts/verify.js`; `node scripts/check-integrity.js`. Re-run preflight-adjacent suites with empty `USERPROFILE` and `HOME`. Every stub or transport mock introduced by a test must be proven red (revert the code, see it fail, restore). Never `git add -A`, `add .`, `commit -a`, `stash` or `clean`; stage explicit paths only (shared tree).

## Phase 0: Pre-apply gates (manual; record each answer in apply-progress)

- [x] 0.1 Run the `nn-dev-development` concurrency scan and branch-first consent. Confirm the foreign dirty files (`docs/innfo/cdn/manifest.json`, `docs/skills/documentation/skills/nn-innfo.md`, `scripts/lib/docs-facts.mjs`, video-engine files, the unified-pipeline archive move) are not touched by any slice. Record HEAD: `fc925f8a3fd493642d48fae9a2781aeb5640837d`.
- [x] 0.2 Confirm chain strategy with the user (`feature-branch-chain` recommended) and the tracker branch name. Confirm the TDD seams in the Testing Strategy table of `design.md` (tdd skill: no test at an unconfirmed seam).
- [x] 0.3 Baseline: rebuild innfo-core, run G once on HEAD and list pre-existing reds, so slices are not blamed for them.
- [ ] 0.4 Gate (before A3): can the CLI read the blueprint copy stored in the domaiNN (Tier 1 `specs/bluepriNNts/<base>/<version>/` plus the includes chain) for field -> schema resolution in about 150 lines of core? If yes, A3 ports it. If not, A3 derives the schema and prints a stderr `WARNING` naming `parent_spec`; the `precio_source`-via-CLI scenario is deferred and the `console-field-citations` amendment in this change already scopes it to the tool path.
- [ ] 0.5 Gate (before A5b): coordinate the CDN-path fix (`templates/console` -> `bluepriNNts/console` in the shell script tags) with the in-flight nomenclature rename change (143 tasks, owned by another agent). If it already rewrote those lines, drop task A5.14; if not, do it on the same lines and leave everything else to it.
- [ ] 0.6 Gate (before R): does `innfo-mcp.bundle.js` need a rebuild? The bundle must embed the new tools (A4, A6a), so it does. Confirm `docs/innfo/cdn/innfo-mcp-v0.12.0.bundle.js` is untouched by `git diff` after every rebuild; only a new `innfo-mcp-v0.13.0.bundle.js` may appear.
- [ ] 0.7 Gate (before R): release batch. Default is one batch A+B+C (proposal question 3). Until C ships, `model_console` can export but cannot create drafts (amendment am.1: draft creation arrives with C), so releasing A alone ships an export button with nothing to export. Recommend A+B+C together; otherwise document the gap in `reviewer-guide.md`. The tag number depends on it (0.7.0 if batched; B's design says 0.8.0 if A shipped 0.7.0 alone).
- [ ] 0.8 Check whether B has already fixed the stale `templates-v*` text in `.agents/skills/nn-dev-release/SKILL.md` (:68, :149, :199, :218-219). Outcome decides task A6.12.

## Phase 1: A1 - Schema, validators, corpus, nn-trannsform (PR 1, ~350)

- [x] A1.1 RED: add `ajv@^8` to root `package.json` devDependencies (explicit; today transitive only), update the lockfile, confirm Node 20 compat with `.npmrc` `engine-strict=true` (`npm ls ajv`).
- [x] A1.2 RED: corpus `test/fixtures/feedback/{valid,invalid}/*.json` (alias `knowledge`, `session_label`, item `status`, top-level `field`, `kind: rewrite`, valid with `target.field` + `base_hash`, valid without `base_hash`) and `test/feedback-validators-parity.test.mjs`: ajv(schema), bundle `validateFeedback`, nn-trannsform `validateFeedbackJson` each agree with every label. Prove red on HEAD (status/alias accepted).
- [x] A1.3 RED: nn-trannsform test (locate the existing suite with `fd`): normalized output contains `### fb-001` and `- **Kind**: correction`; the slug-mirror heading slug equals `fb-001`. Prove red by restoring the old `### fb-001 (kind, status)` heading.
- [x] A1.4 RED: `BP/metrics/samples/feedback/*.json` are in the valid corpus (they still carry alias/status, so red).
- [x] A1.5 GREEN: `CONSOLE/feedback.schema.json`: drop item `status`; explicit `false` properties (meta `knowledge`, `knowledge_version`, `session_label`, `source_model*`; item `status`, `layer`, `severity`, `target_hash`, `stale`, top-level `field`); add item `base_hash` (`^[0-9a-f]{16}$`) and meta `source_sha256`; leave `$id`.
- [x] A1.6 GREEN: `CONSOLE/innfo-runtime.js` `validateFeedback` and `buildExportDoc` (no `status`; forbidden keys rejected; `base_hash` pattern if present); rebuild `innfo-console.bundle.js` in the same commit.
- [x] A1.7 GREEN: `skills/nn-trannsform/scripts/lib/scanner-converters.js` (:336-414) heading + Kind bullet + `validateFeedbackJson`; `skills/nn-trannsform/SKILL.md` (:205-207 -> `reconcile_feedback`).
- [x] A1.8 GREEN: drop alias/status from `BP/metrics/samples/feedback/*.json`.
- [x] A1.9 Prove red: revert A1.5, A1.6 and A1.7 one at a time; the matching parity/heading test MUST fail. Restore.
- [x] A1.10 REFACTOR: one forbidden-key constant per validator (no cross-package import); no behavior change.
- [x] A1.11 Run G.
- [x] A1.12 Commits: `fix(console): align feedback schema and validators`, `fix(nn-trannsform): normalize feedback anchors as fb-001`.

## Phase 2: A2 - Core builder, citations, ledger rules, mirror (PR 2, ~400; split A2a / A2b)

A2a (builder, citations, slots, ~250)
- [x] A2.1 RED: extend `CORE/tests/console-payload.test.ts` with literals: id `problems-paranormal-infestation` and `-1` duplicate; `modelId` literal; hash stable on version-only edit, changed on field edit; per-element `relations` (intra-model only, none on `model`); matrix `rows`/`cols`; schema slot arrays; `meta.template`; no resolver -> no `citations`. Prove red on the HEAD builder.
- [x] A2.2 RED: `CORE/tests/console-citations.test.ts`: per-field map `el.citations: {field: entries without field}` plus `meta.citationsResolvedAt`; schema-typed `type:: citation` field (`precio_source`) via `citationFieldsFor`; `groupCitationsByField`.
- [x] A2.3 RED: `CORE/tests/console-slot.test.ts`: `serializeConsoleSlot` output has no literal `<` for a `</script>` excerpt (literal expected string); `buildConsoleSchemaSlot` array shape; sha256 literal via the portable `validator/crypto.ts`.
- [x] A2.4 GREEN: `CORE/src/console/slot.ts` (`serializeConsoleSlot`, `buildConsoleSchemaSlot`) and citation additions in `citations.ts` (`groupCitationsByField`, `citationFieldsFor`).
- [x] A2.5 GREEN: `CORE/src/console/payload-builder.ts`: `schema?` and `resolver?` options, `relations`, `meta.template`, `rows`/`cols`, citation map, `computeSha256` from `validator/crypto.ts`; export from `console/index.ts` (`.js` specifiers).

A2b (ledger rules, mirror drift, ~150)
- [x] A2.6 RED: `CORE/tests/feedback-ledger.test.ts` literals: latest-wins, `pending` reopens `rejected`, stale via `base_hash`, stale via version fallback (no `base_hash`), `orphaned`, entry validation incl. `confirm_stale`, `FEEDBACK_LEDGER_FILENAME`.
- [x] A2.7 RED: `scripts/build-console-payload.test.mjs` (real process): `--check` exits 1 against a stale `--out` and names the file. Prove red by corrupting one byte.
- [x] A2.8 GREEN: `CORE/src/console/feedback-ledger.ts` (`evaluateFeedbackItems`, `validateFeedbackVerdictEntry`, `FEEDBACK_LEDGER_FILENAME`, `confirm_stale`).
- [x] A2.9 GREEN: `scripts/build-console-payload.mjs --check` (build in memory with `write:false`, `absWorkingDir: repoRoot`, compare bytes, exit 1 naming the file); `scripts/verify.js` step 7b-bis next to the slug-mirror check; regenerate `CONSOLE/console-payload.generated.cjs`.
- [x] A2.10 Measure the mirror with an esbuild metafile (barrel is 311 KB). Narrow the entry import only if it needs no code moves (about 20 lines); otherwise record the size and defer.
- [x] A2.11 REFACTOR: confirm one `computeSha256`; no new relative import without `.js`.
- [x] A2.12 Run G; commits `feat(core): per-element relations, citation map and array schema slots`, `feat(core): evaluate feedback staleness and drift-check the mirror`.

## Phase 3: A3 - CLI (PR 3, ~300; after gate 0.4)

- [x] A3.1 RED: CLI tests (real process, extend `test/console-export.test.mjs`): missing mirror -> exit != 0 naming the path, no file written; root `feedback-ledger.jsonl` read and `sources/import/feedback/ledger.jsonl` ignored; `el.citations.sources` present; slot text has no literal `<`; no `fallbackBuildPayload` symbol. Prove red by restoring the fallback.
- [x] A3.2 RED: `CORE/tests/fs-source-resolver.test.ts`: ancestor `sources/` walk, containment (escape refused), literal results. No transport stubs.
- [x] A3.3 RED: standalone R-EXP-02: a temp dir with only exporter, shell, bundle, mirror succeeds; without the mirror it fails loudly.
- [x] A3.4 RED: schema input per gate 0.4 (Tier-1 blueprint -> array schema slot, or derived schema plus stderr `WARNING` naming `parent_spec`).
- [x] A3.5 GREEN: `CORE/src/console/fs-source-resolver.ts` (`createFsSourceResolver(rootDir)`, moved lookup algorithm, node entry only; `browser.ts` untouched); regenerate the mirror.
- [x] A3.6 GREEN: `scripts/export-console.mjs`: require mirror from `consoleDir` (repo fallback kept), exit 1 naming the path on load error, delete `fallbackBuildPayload` (:85-142) and ledger candidate paths (:458-460), inject the resolver (:481), use `serializeConsoleSlot` in `injectSlots` (:315), Tier-1 schema per 0.4.
- [x] A3.7 GREEN: `manifest/source.yaml` `console_assets` entry `innfo-console-payload` -> `console/console-payload.generated.cjs`, `ref_key: innfo-console`; check `validate-manifest` and `console-release-info` accept it.
- [x] A3.8 REFACTOR: remove dead helpers left by the fallback deletion.
- [x] A3.9 Run G; commit `fix(console): export CLI uses the shared builder and fails loudly`.

## Phase 4: A4 - MCP tool, dedup, thin procedure (PR 4, ~400; split A4a / A4b)

A4a (dedup, ~150)
- [ ] A4.1 RED: grep test finds exactly one `function classifyOrigin` and one `extractExcerpt` definition across `iNNfo/packages`; `MCP/src/tools/resolve-sources.spec.ts` stays UNCHANGED and green.
- [ ] A4.2 GREEN: `MCP/src/tools/resolve-sources.ts`: delete :179-386, import core `resolveCitation`/`capExcerpt`/..., re-export `EXCERPT_CHAR_CAP`; `createWorkspaceSourceResolver` becomes a wrapper over `createFsSourceResolver` adding miss-time `suggestions`.

A4b (tool, procedure, golden, ~250)
- [ ] A4.3 RED: `MCP/src/tools/build-console-payload.spec.ts`: returns `{schemaSlot, modelSlot, outputPath, schemaSource, warnings}`; `outputPath` literal `export/<stem>_console/<stem>_console.html`; `<` escaped; unknown model errors; `MCP/src/server.spec.ts` tool list includes it.
- [ ] A4.4 RED: golden test: MCP slot strings equal the CLI-embedded slot text (real CLI process; `meta.generated` and `meta.citationsResolvedAt` normalized) on a temp fixture domaiNN with sources, a ledger and a Tier-1 blueprint; a procedure-style console at `outputPath` reports `fresh` in `--status`. Prove red with the CLI minus its resolver.
- [ ] A4.5 RED: scan `BP/workspace/procedures/compile_model_console_NN.md`: no hand-built JSON contract (check the exact heading literals at apply time), it calls `build_console_payload`.
- [ ] A4.6 GREEN: `MCP/src/tools/build-console-payload.ts` (schema via `resolveBlueprintWithCache`, ledger via `FEEDBACK_LEDGER_FILENAME`, read-only) registered in `MCP/src/server.ts`; `MCP/src/tools/validate.ts` dedup if it imports the removed helpers.
- [ ] A4.7 GREEN: thin `compile_model_console_NN.md` (call tool, paste both slots verbatim at `outputPath`) with its `model_version` bump in the same commit; if the editor `SHIPPED_TEMPLATE_VERSIONS` test demands it, register there (recurring gap).
- [ ] A4.8 Regenerate docs-facts via its script only if its output changes, without staging the foreign `scripts/lib/docs-facts.mjs` edits.
- [ ] A4.9 REFACTOR: no leftover unused exports in `resolve-sources.ts`.
- [ ] A4.10 Run G (core rebuilt first); commits `refactor(mcp): reuse core citation logic`, `feat(mcp): build_console_payload tool and thin compile procedure`.

## Phase 5: A5 - Bundle UI, export gate, shells, guard, docs (PR 5, ~400; split A5a / A5b)

A5a (runtime and DOM, ~250)
- [ ] A5.1 RED: `CORE/tests/console-feedback-ui.test.ts` with `@vitest-environment jsdom` (happy-dom lets `javascript:` through): unchanged `model_console.html` + bundle evaluated twice -> one `[data-innfo-feedback-root]`, one `#innfo-feedback-open`, `showModal` once per click; seeded draft exports `target.field` and `base_hash`; invalid meta -> `createObjectURL` never called and errors listed in `[data-innfo="errors"]`; undeclared `feedback-export` injects nothing; stepper `#innfo-export-modal` coexists; viewer renders an icon from builder output. Prove red by removing the idempotency guard and the validation gate.
- [ ] A5.2 RED: rewrite `test/console-review.test.mjs`: `draftToItem` shape (`target{element_id,concept,element,field?}`, `comment`, `base_hash`, no `status`), export passes `validateFeedback`; `buildReviewDoc`, `validateReviewDoc`, `serializeReviewDoc`, `buildReviewFilename`, `parseReviewFilename`, `REVIEW_FILENAME_PATTERN`, `updateDraftStatus`, `.innfo-review-status-select` absent.
- [ ] A5.3 GREEN: `CONSOLE/innfo-runtime.js`: `ensureFeedbackUi(doc)` (reads `needs[]` from the DOM; one root with `#innfo-feedback-banner`/`-open`/`-modal`; one `<style data-innfo-feedback>`; `data-innfo-bound`), `autoBoot` sets `data-innfo-console-booted` on `<html>`, `addDraft` stores `base_hash` from the element hash, `draftToItem`, `buildExportDoc` -> `validateFeedback` -> download with errors listed on failure; delete the A15 names and the status `<select>` (:2248).
- [ ] A5.4 Rebuild `innfo-console.bundle.js` in the same commit; offline scan: no `fetch(` or `type=module` added.

A5b (shells, registry, guard, docs, ~150 + deletions)
- [ ] A5.5 RED: guard tests in `scripts/lib/console-shell-guard.test.js`: `model_console.html` passes through the registry rule alone; the guard source contains no `model_console.html` literal; a shell declaring `feedback-export` with no markup passes. Prove red by re-adding anchors to `needs-registry.json`.
- [ ] A5.6 GREEN: `CONSOLE/needs-registry.json` `feedback-export: []`; delete the exemption at `scripts/lib/console-shell-guard.js` :215-217.
- [ ] A5.7 GREEN: delete `#innfo-banner`/`#innfo-export-*` markup and CSS from `CONSOLE/artifact_shell.html` and `BP/metrics/assets/timeline.html`; update `BP/metrics/scripts/verify.harness.js:516`.
- [ ] A5.8 GREEN: `docs/innfo/documentation/reviewer-guide.md` and `templates.md`: drop `console-review-v1`, describe the conformant export, the `### fb-001` format, and (per gate 0.7) the draft-creation gap until C.
- [ ] A5.9 Confirm via `guard-template-immutability` that asset-only edits need no `blueprint_version` bump.
- [ ] A5.14 CDN path (per gate 0.5): `templates/console` -> `bluepriNNts/console` in the script tags of `artifact_shell.html`, `timeline.html`, `model_console.html`; do NOT change the pin (it moves at release, the guard requires pin == manifest version).
- [ ] A5.10 REFACTOR: remove CSS left unused by the markup deletion.
- [ ] A5.11 Run G; commits `feat(console): bundle-injected feedback UI with validated export`, `refactor(console): drop shell feedback anchors and guard exemption`.

## Phase 6: A6a - Ledger tools and reconcile procedure (PR 6, ~260)

- [ ] A6.1 RED: `MCP` tests for `record_feedback_verdict` and `evaluate_feedback_items` on a real temp dir (no transport stubs): N lines stay byte-identical after an append; invalid entry -> file unchanged; `applied` over `stale` refused, then `confirm_stale: true` succeeds and is persisted; `applied` over orphan refused; `applied` after a fresh evaluation is accepted; evaluate is idempotent; refusal when the last byte is not `\n`; two parallel appends yield two intact lines; feedback source hashes unchanged. Prove red by writing without the queue and without validation.
- [ ] A6.2 RED: scan `BP/workspace/procedures/reconcile_feedback_NN.md`: no `sources/import/feedback/ledger.jsonl`; `evaluate_feedback_items` precedes `apply_change`; `validate_model` precedes `record_feedback_verdict`; abort path records no `applied` entry.
- [ ] A6.3 GREEN: `MCP/src/tools/feedback-verdict.ts` (one validated LF line via `appendFile(..., {flag:'a'})` behind a per-path promise queue; derives `source.sha256`, `model_id`, `model_version`, `element_id`, `target_hash` = item `base_hash`), registered in `MCP/src/server.ts`; `server.spec.ts` tool list.
- [ ] A6.4 GREEN: `reconcile_feedback_NN.md`: root ledger path (:24, :108, :175), step order (evaluate -> apply -> validate -> record), tools named; `model_version`/`knowledge_version` bump in the same commit.
- [ ] A6.5 REFACTOR: share the ledger path join with the payload tool.
- [ ] A6.6 Run G; commit `feat(mcp): validated feedback ledger tools and reconcile order`.

## Phase 7: A6b - Deletions and references (PR 7, ~100 + 333 deletions)

- [ ] A6.7 RED: update `CORE/tests/metrics-console-feedback.test.ts` (:43, :110-112) to expect `reconcile_feedback`; add a repo-scan test: zero `apply_feedback` outside `openspec/changes/archive/` and the kept fixtures (`CORE/tests/{fixtures/simulacro-refactorizacion,legacy/fixtures}/**`, `procedures/procedures/export/document_sop_console/*`), zero `console-review-v1`, zero `session_label` and `(?<!source_)knowledge_version` in the console dir, schema, validators, reconcile procedure and nn-trannsform.
- [ ] A6.8 GREEN: delete `BP/business/procedures/apply_feedback_NN.md` and `BP/metrics/procedures/apply_feedback_NN.md` (pure deletion; `size:exception` for the deletion lines if the maintainer rejects the split).
- [ ] A6.9 GREEN: repoint `BP/metrics/procedures/create_timeline_NN.md` (:123 prose, :145 link), `docs/innfo/documentation/lifecycle-walkthrough.md:136`, `docs/research/cognnitive-value-proposition.md` (:111, :202, :278, :420), any `spec_NN.md` hit found by `rg apply_feedback`.
- [ ] A6.10 GREEN: bump `blueprint_version` of business and metrics (procedure removed, minor) and the version of edited `create_timeline_NN.md`, in the same commit (template-immutability guard); register in editor `SHIPPED_TEMPLATE_VERSIONS` if its test demands.
- [ ] A6.11 `rg apply_feedback` and `rg "console-review-v1"` outside the allowed set return nothing; `canonical-registry.ts` and `innfo-mcp.bundle.js` have no `apply_feedback` hits (regenerated in R).
- [ ] A6.12 If gate 0.8 says not yet fixed: `templates-v*` -> `blueprints-v*` in `.agents/skills/nn-dev-release/SKILL.md` (maintainer-only, no `skills-v*` tag).
- [ ] A6.13 Run G; commits `chore(blueprints): remove apply_feedback procedures`, `docs: repoint apply_feedback references to reconcile_feedback`.

## Phase 8: R - Release prep (once for the batch; real tags, verify unused at release time)

- [ ] R.1 `git tag -l` confirms `innfo-mcp-v0.13.0`, `innfo-console-v0.7.0`, `blueprints-v0.20.0`, `skills-v2.9.0` do not exist (latest today: 0.12.0, 0.6.0, 0.19.1, 2.8.1). If the batch includes B and C, use the numbers B's design D14 prescribes.
- [ ] R.2 `MCP/package.json` -> `0.13.0`; `node scripts/sync-versions.mjs`; raise the nn-innfo `mcp.min_version` to `0.13.0` (procedures now need the new tools); rebuild innfo-core, then `innfo-mcp.bundle.js`; verify only a new `innfo-mcp-v0.13.0.bundle.js` appears (gate 0.6).
- [ ] R.3 Bump all four `console_assets` to `0.7.0` BEFORE `node scripts/build-console-bundle.mjs`; regenerate the mirror; re-pin the shells to `@innfo-console-v0.7.0`. Files at the `innfo-console-v0.6.0` tag stay immutable.
- [ ] R.4 `channels.stable.refs` blueprints -> `0.20.0` (via `sync-versions`/`channel-refs`, never by hand); `node scripts/generate-canonical-registry.mjs`.
- [ ] R.5 `nn-trannsform` -> `V_3-5-0`; skills -> `2.9.0`.
- [ ] R.6 Gates: `verify.js`, `check-integrity.js`, `sync-versions.mjs --check`, `--release` rehearsal in `git worktree add --detach <tmp> <sha>`.
- [ ] R.7 After `git push origin dev:main` (merge commit), tag `innfo-mcp-v0.13.0`, `innfo-console-v0.7.0`, `blueprints-v0.20.0`, `skills-v2.9.0` on `origin/main`; run `verify.js --release`.

## Handoff to B and C

- B: slice d1 (shell token migration) waits for A5 to merge, because it re-skins A's injected `innfo-feedback-*` UI. A's CSS lives in the bundle string (`<style data-innfo-feedback>` in `innfo-runtime.js`), so d1 must also edit the runtime CSS; B's open question on CSS location is answered by A5.3. A's contract hooks (`[data-innfo-feedback-root]`, `#innfo-feedback-{banner,open,modal}`, `[data-innfo=...]`, `.innfo-feedback-*`) are frozen for B and C.
- C: relies on `meta.modelId`, per-element `hash`, `meta.feedbackState`, `base_hash` required on console exports, and removal of the status `<select>`, all delivered here. C owns the draft store v2 and `window.prompt` replacement; until C ships, `model_console` exports but cannot create drafts. Recommendation: release A, B and C together.
- C's `innfo-console-feedback` delta says the names `knowledge`, `session_label` and `source_model*` "MUST NOT appear"; with A's explicit `false` properties the schema does mention them, so C's wording should read "MUST NOT be accepted".
