# Apply Progress — coNNtent bluepriNNt Redesign

Tracker branch: `feat/conntent-redesign`. Chained PRs target the previous PR branch.
Full task map: `tasks.md`. Verifications: `verifications.md`.

> Progress is recorded before and after each slice (handoff rule 6). Checkboxes mirror
> `tasks.md`; each PR also records its base branch, PR number, and diff-stat.

## Phase 0: Open verifications (PR V)

- [ ] V.1 FSA on `file://` — **BLOCKED on maintainer browser run** (Chrome/Edge, native folder picker).
- [ ] V.2 CSP media on `file://` — **BLOCKED on maintainer browser run**.
- [ ] V.3 `hyperframes transcribe` word timings — **BLOCKED on consent to install whisper.cpp** (not on PATH).
- [ ] V.4 Chrome overlay after hotfix — **BLOCKED on render + browser inspection**.
- [x] V.5 Registry licenses and pins — **DECIDED**: vendor from `heygen-com/hyperframes`
      (Apache-2.0) pinned to an exact upstream commit; ship per-item `LICENSE` and
      offline-vendored CDN deps; network-clean `index.html`.
- [ ] V.6 Decision checkpoint — **PENDING** V.1/V.2/V.3/V.4.

**Status:** V.5 recorded. V.1/V.2/V.4 need the maintainer's Chrome/Edge; V.3 needs
whisper.cpp consent. No PR 2e, 3b-3, or 4a may start before its verification is recorded.
Slices 1a–1c (Phase 1) do not depend on a recorded verification and may proceed.

## Slice 1 — Structure (PRs 1a–1c)

### PR 1a — layout contract. **SPLIT into two chained PRs** (each < 400 lines, repo rule).

#### PR 1a-layout (`feature/conntent-redesign-v1a-layout`, base: tracker) — DONE, green
- [x] 1a.1 RED `T/layout.test.mjs` — LAYOUT_LEGACY per legacy path; clean tree passes.
- [x] 1a.2 GREEN `E/lib/layout.mjs` `assertLayout(root)` — 6 tests green.
- Diff vs tracker: `layout.mjs` + `layout.test.mjs`, 239 insertions, **under budget**.

#### PR 1a-chain (`feature/conntent-redesign-v1a`, base: v1a-layout) — DONE, green
- [x] 1a.3 RED `T/export-console-episodes.test.mjs` — assets episode reported, episodes/ discovered.
- [x] 1a.4 GREEN `scripts/export-console.mjs` (silent LEGACY_EPISODE skip → `assertLayout` warning),
      data module `EPISODE_DIRS=['episodes']` only, `E/produce.mjs modelIdOf` on `episodes/`.
- [x] 1a.5 RED `T/placement.test.mjs` — placement `{container}/episodes/{slug}/`.
- [x] 1a.6 GREEN `BP/spec_NN.md` Video placement → `episodes/` + `blueprint_version` → `V_0-16-0`,
      derived artifacts regenerated (catalog.json, field-registry).
- [x] 1a.7 Data module `EPISODE_DIRS` narrowed to `['episodes']` (dropped `assets`).
- [x] 1a.8 RED+GREEN `T/production-hierarchy.test.mjs` — domaiNN→Series→Video; no Subject concept.
- Diff vs v1a-layout: 288 insertions, **under budget**.

**Status:** tracker `feat/conntent-redesign` verde y empujado (HEAD ccec1e5a, verify:fast OK tras cada commit; nn-core changeset 165/165). En esta pasada:
- **Slice 3a-i.1+3a-i.2 (parcial)**: `review_gate` añadido a `CHANGE_OPS`; `ChangeItem` con `gate`/`verdict`/`reviewed_hash`/`plan_hash`/`rawKeys`; frontmatter `author_kind`/`origin`/`reviewer`; `reviewGateProblems()` (shape + keys no declaradas + verdict enum + hash hex64); parser lee las keys y exige los 3 markers cuando hay review_gate; hasher sella verdict keys + provenance (PROPOSAL_KEYS + computeProposalSha(frontmatter)); tests `review-gate.test.ts` 8/8 y `hasher.test.ts` actualizado. Mirror `nn-core.generated.cjs` y console-payload regenerados.
- **Slice 2 COMPLETO** (2a, 2b, 2c, 2d, 2e) — ver abajo.
- (Antes) 1a, 1b, 1c.1-1c.5+1c.7.

**Pendiente:** 3b-1..5 (incluye whisper + renders reales), 4a-4d (consola, navegador), 5a-5b (procedures), Phase 7 (living specs, botijos-today, verify.js full, archive). 1c.6/1c.8 dependientes de 3b (rewire spendGuard callers a cascade+catalog). Permisos ya concedidos: whisper.cpp, gasto proveedor, navegador (V.1/V.2/V.3/V.4/V.5). Fusión a dev/main al final con verify.js verde.

## Slice 2 — Cascade (PRs 2a–2e)

- [x] 2a COMPLETO (resolver único con source-trace, registry scope/levels, contract test, avatar_resolution render cascade).
- [x] 2b COMPLETO (lenguaje/voz, capability video rechazada, campos captions/thumbnail/review_gates, parity estimator/compiler).
- [x] 2c COMPLETO (frame folder).
- [x] 2d COMPLETO (Character folder + node + override warning + missing-character-voice).
- [x] 2e COMPLETO (portfolio folder form, slots contracts, hermetic thumbnail, V.5 fallback, manifest).

## Slice 3a — nn-core `review_gate` (PR 3a-i, 3a-ii)

- [x] 3a-i.1 + 3a-i.2 (op parse/validate/seal + provenance markers).
- [x] 3a-i.3 + 3a-i.4 (blueprint `gates` frontmatter; `parseGateDeclarations`, `gateDeclarationProblems`; GATE_UNDECLARED / GATE_TARGET_INVALID; `gates:` in coNNtent spec_NN.md, blueprint_version → V_0-17-0).
- [x] 3a-i.5 + 3a-i.6 (`reviewGateProvenanceProblems`: GATE_NOT_HUMAN / GATE_REVIEWER_REQUIRED, Q9 default pseudonym; apply engine treats `review_gate` as non-mutating, skips evidence, seals provenance; `review-gate-apply.test.ts` 10/10; nn-core built).
- [x] 3a-ii.1..3 (server handlers refuse `review_gate` with GATE_VERDICT_REFUSED for propose_changeset and bare-intent apply_change; changeset files still apply; `parseFrontmatter` exported through the coNNtent core mirror).
- [x] 3a-ii.4 code-side only; living-spec text lands in 7.1/8.2.
- [x] 3a-ii.5 risk R1 recorded in the `changeset-review-gate` delta spec notes.
- Note: `nn-mcp/test/apply-change.test.ts` is red at tracker HEAD before this slice (its fixture keeps `sources::`, banned on L3 since b998756d); unrelated to review_gate.

### Known pre-existing reds (not caused by Slice 3; block the final full gate)

- `nn-core` full suite: `corpus-address-scan` (1), `corpus-concept-fields-scan` (1),
  `roundtrip-fidelity` (2), `shipped-workspace` (1) — all against `test/_samples_nn`
  corpus/sample content, none touching coNNtent spec code.
- `nn-mcp` `test/apply-change.test.ts` (13) — fixture keeps `sources::`, banned on L3.
- Fixed here: `conntent-storage.test.ts` (pinned V_0-15-2 and `assets/`), `metaschema-selfdescribe`
  (`thumbnail_formats` used `type:: list`; now `select` + `multiple:: true`).

## Slice 3b — Pipeline and review (PRs 3b-1..3b-5)

- [x] 3b-1.1 + 3b-1.2 `lib/canonical.mjs`, `lib/review-hash.mjs` (`scriptSubject`/`previewSubject`/`reviewHash`), plan slices + `episodePlanHash`; `review-hash.test.mjs`.
- [x] 3b-1.3 + 3b-1.4 `lib/gates.mjs` (`readAppliedVerdicts`, `evaluateGate`, `gateState`, `STALE_APPROVAL_MESSAGE`); applied-human-console-only, default reviewer ignored, preview needs `plan_hash`, fixed gate order; `gates.test.mjs`.
- [x] 3b-1.6 + 3b-1.7 lifecycle: `EPISODE_STATUSES` = idea/draft/approved/produced/failed_qa/delivered/archived, only archived refused, `reconcileStatus`; blueprint `status` options + prompt examples; `lifecycle.test.mjs`.
- [x] 3b-1.8 an explicit empty list now wins in the cascade (`review_gates: []` is autopilot); `cascade.test.mjs` case.
- [x] 3b-1.5 re-open cause: `.cognnitive/video/reviews/<series>__<episode>.json`, `reopenCause` (narration / layer / param with source level, `unknown` when the record is absent); `gate-snapshots.test.mjs`.
- [ ] 3b-1.9 REFACTOR: delete `pendingReviews`, `--approve` and `script_review` consumers with the `produce` rewrite (3b-2), then `verify.js --only=conntent`.
- [x] 3b-2.3 + 3b-2.4 (contract) `lib/spend-gate.mjs`: unset budget with a non-zero plan → exit 11; over budget with preview off (or pre-preview subtotal over) → exactly one episode `budget` gate carrying `plan_hash`; preview on otherwise asks at preview; no `--approve`. `spend-gate.test.mjs`.
- [x] 3b-2.1 script gate (part) `produce` hashes the lowered scenes (`scriptSubjectsForEpisode`) and reads applied human verdicts only; `review::` approves nothing.
- [x] 3b-2.3 + 3b-2.4 `lib/spend-gate.mjs` wired: unset budget exit 11 when the plan costs something, inserted `budget` gate exit 10 with `plan_hash`, no `--approve`.
- [x] 3b-2.9 `produce` applies pending human console changesets on start (via the same apply engine).
- [x] 3b-1.9 deleted `pendingReviews` and `readComments`; the 3 `--approve` tests are rewritten.
- [x] 3b-2.1 script + preview gates per scene: `review-subject.mjs` / `preview-subject.mjs`; cheap spend (TTS/images/animatic) before preview, avatars after; `produce.test` 27/27.
- [x] 3b-2.6/.7 animatic: `lib/animatic.mjs`, 640 px / 15 fps, `<slug>_animatic_<W>x<H>.mp4`.
- [x] 3b-2.1 exit codes: `EXIT_QA = 12` for QA failures.
- [x] 3b-2.8 pending: E2E cold cache with fake providers.
- [x] 3b-5.1..3b-5.3 delivery: `lib/delivery.mjs`, v1/v2 rule, link-or-copy, no-op, `status:: delivered` + `delivered_version`.
- [x] 3b-5.4 + 3b-5.5 thumbnails: `lib/thumbnails.mjs`, declared sizes, Video title, first-frame base, no badge; included in the delivery.
- [x] 3b-5.6 `<slug>_description.md` after QA, included in the delivery.
- [ ] 3b-5.7/.8 reconcile the engine renderer description with HyperFrames; E2E reaches `delivered v1` and a rerun no-op.
- [ ] 3b-2.2 extraction of `pipeline.mjs` (behaviour lives in `produce.mjs` today).
- [ ] 3b-3 captions (live tier) and 3b-4 `qa.mjs` (live tier + V.4 calibration).
- Slice gate: `verify.js --only=conntent` green; `verify:fast` green.

## Pre-existing reds — cleared

- [x] corpus/address/concept/roundtrip/shipped-workspace: sample drift (typed references `@slug`, bare `template`, slug order).
- [x] `nn-mcp` fixture: removed the banned `sources::`.
- [x] Product bug fixed: `ElementNode.rawLeading` preserves HTML comments between an element heading and its first field (the `<!-- nn:auto -->` ownership marker), so a reconciled manifest no longer loses it. nn-core full suite 2576/2576.
- [ ] `src/workspace/reconcileManifest.ts` still emits `template:: [[x]]` / `blueprint:: [[x]]` in typed fields (its unit test pins it). Deferred to after 3b.

## Delivery protocol revision (2026-11-09)

Per the maintainer's direction, the unit of work is a PR slice, not a sub-task (see
`tasks.md` "Delivery protocol"): one RED per module with table-driven cases, targeted
runner in the inner loop (seconds), one `verify.js --only=<area>` per slice, one
`verify:fast` per PR, one commit per module, one push per PR. Full `verify.js` only at
7.3 and merge. Measured: the 3b-1 modules ran their own suites in <1 s each; the scoped
gate passed in ~60 s.

## Slice 4 — Console (PRs 4a–4d)

- [x] 4a.1 + 4a.2 CSP: `img-src 'self' file: data: blob: https:`, `media-src 'self' file: blob:`; `test/console-csp.test.mjs` 2/2 (V.2 decided on Chrome 156).
- [x] 4a.3/4a.4 `consoleScopeMeta` (view/models/readOnly/label), payload narrowing, read-only controls, per-scope draft-store key; `console-scope-models.test` 5/5.
- [x] 4a.5/4a.6 `nn-fsa.js`: workspace-matched folder, handle in IndexedDB, query→request permission, `wx` changeset write, download fallback; `console-direct-write.test` 5/5.
- [x] 4a.7 verdict draft → `review_gate` with `author_kind: human`, `origin: console`, named reviewer (default refused); preview carries the scene slice `plan_hash`, budget the episode plan hash; `console-verdict-export.test` 6/6.
- [x] 4a.8/4a.9 `resolveConsoleModulePath`/`devCheckoutRoot` moved to `CORE/src/console/locate-writer.ts`, exported by nn-core and the coNNtent mirror, imported by nn-mcp; mirrors and bundle regenerated.
- [x] 4b.1/4b.2 `assets/console-view-conntent.data.mjs`: Domain → Series → Episode, pending inbox with causes, every cascade field with value + source, scene script/preview hashes, deliveries; calls the engine modules only. `console-conntent-data.test` 5/5.
- [x] 4b.3 `writeConsole` scope `{models, readOnly, outFile}` (+ `view` in the same object); `export-console.test` 62/62.
- [x] 4c.1 + 4c.2 unified `conntent` view `assets/console-view-conntent.js` registered as Pipeline: Pending home, then Domain, Series and Episode sections (review gates, fields with source, status, deliveries with superseded marked); no Deliver button, no orphan cleanup. `console-conntent-view.test` 5/5.
- [x] 4c.5 deleted `console-view-episode-review.*` and `console-view-series.*` and their tests; `export-console-episodes` reads the conntent data module. Console gate green.
- [ ] 4c.3/4c.4/4c.6 approval flow in the view, regeneration after every engine exit, size assertion with 50 episodes.
- [ ] 4d delivery view (read-only, scoped to one episode, `writeConsole` outFile) and the portfolio picker.
- [ ] 4b.4 stale-translation flag and 4b.5 superseded-delivery display (view-level, with 4c/4d).

## Slice 5 — Procedures (PRs 5a–5b)

- [x] 5a.1-5a.5 `usage_procedures_NN.md`: six procedures, `tool::` per step, setup closes with a proposed changeset, Create a Series dry-run, no Deliver procedure; `procedures.test.mjs` 19/19; usage and version guards green.
- [x] 5b.1 + 5b.2 `lib/detect-state.mjs` (`detectState`) and the SKILL.md entry point; `detect-state.test` 7/7. SKILL.md no longer mentions `--approve`, `video-guard.json` or the retired renderer.
- [ ] 5b.3 is moot: `nn-video-script` no longer exists in the repo (removed before this change); the entry point refuses a legacy layout instead. 5b.4 (U1-U7 simulation) needs the live tier.

## Phase 7 — Living specs, release, verification, archive

- [ ] Not started. Requires all slices plus botijos-today recreation and full `verify.js`.