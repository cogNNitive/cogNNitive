# Tasks: Complete iNNfo V_0-2-0 Adoption

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~2,400 total — iNNfo ~2,150 + actioNN ~250 |
| 400-line budget risk | High (raw) / Low–Medium (reviewable — ~78% verbatim copy) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (specs) → PR 2 (source+tests) → PR 3 (docs) → PR 4 (actioNN) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Per-slice estimate

| PR | Repo | Slices | Raw lines | Reviewable delta | Exception |
|---|---|---|---|---|---|
| 1 | iNNfo | B + C | ~1,871 added | ~45 (13+7+7+12+3+3) | `size:exception` required — pure additions, verbatim copies, nothing references them yet, revert = delete 6 files |
| 2 | iNNfo | A + D | ~250 | ~250 | No |
| 3 | iNNfo | E | ~150 | ~150 | No |
| 4 | actioNN | F | ~250 | ~30 | No |

### Suggested Work Units

| Unit | Goal | PR | Base branch | Depends on |
|---|---|---|---|---|
| 1 | 4 `_V_0-2-0_` template files + 2 samples + 2 `status:` flips | PR 1 | feat/business-template-decomposition (tracker) | — |
| 2 | `constants.ts`, `samples.ts` map, sample URLs, `version.ts` + tests | PR 2 | PR 1 branch | PR 1 (URLs must resolve on disk) |
| 3 | Docs + CHANGELOG | PR 3 | PR 2 branch | PR 2 |
| 4 | `actioNN` bundled-template sync + skill docs | PR 4 | actioNN main | PR 1 merged to iNNfo main |

Dependency order is hard (not preference): 1→2 (PR 2's `shipped-template-versions` test reads PR 1 files from disk), 2→3 (PR 3 asserts migration complete + rebases the staged `specifications.md`), 1→4 (`actioNN` canonical URLs resolve against iNNfo `main`). If a child PR diff shows an ancestor's files, rebase until clean.

## Phase 0: Pre-flight hard gates (before any edit)

- [x] 0.1 A1 CONFIRMED by orchestrator: `git cat-file -e main:...` shows neither `analysis_V_0-1-0_NN.md` nor `business-model_V_0-1-0_NN.md` exists on `main`; `git log --oneline main..HEAD` = `7a32716`, `eabc7e6`; `analysis` history is the single commit `eabc7e6`. Both branch-new / never published → their `spec_version: V_0-2-0` + `_V_0-1-0_` filename is valid per R-SV-03. Allow-list rows 6-7 hold. No escalation.
- [x] 0.2 Baseline captured: `check:spec-urls` green; `--check-urls --with-skills` green (23 skill files scanned). `--version V_0-1-0 --by-type` reviewed against the allow-list.
- [x] 0.3 Confirmed: `package.json`, `.github/workflows/ci.yml`, `scripts/check-spec-version.mjs`, `CONTRIBUTING.md`, `.agents/skills/nn-dev-spec-version-propagator/SKILL.md` carry only the orchestrator's prior unrelated tooling edits; PR 1 does not touch them.

## Phase 1: PR 1 — specs/ template files, samples, status flips (iNNfo, `size:exception`)

Markdown only — NOT TDD-gated. Satisfies R-SV-09, R-SV-10, R-LSR-05.

- [x] 1.1 `specs/iNNfo_V_0-2-0_NN.md` `status: "Draft"` → `"Stable"` (R-SV-09). `defiNNe` not bumped.
- [x] 1.2 `specs/iNNfo_V_0-1-0_NN.md` — **NO edit** (reverted after `sdd-verify` C1). The delta spec's own R-SV-09 scenario 3 requires the superseded L1 file to stay byte-identical. The "no longer the adopted default" signal is carried by `DEFAULT_INNFO_VERSION` + `iNNfo_V_0-2-0` being `Stable` + the docs — not by mutating the immutable file. `git diff specs/iNNfo_V_0-1-0_NN.md` is now empty.
- [x] 1.3 `specs/templates/blank/blank_V_0-2-0_NN.md` created — verbatim body copy; FM + parent-chain examples + meta-template wording re-pointed. Residual `V_0-1-0`: 0. `git diff` vs sibling = R1 lines only.
- [x] 1.4 `specs/templates/cogNNitive/cogNNitive_V_0-2-0_NN.md` created — copy; FM + one parent-chain example re-pointed. Keeps 6 illustrative L3 `model_version`/`artifact_version` residuals (allow-list row 15).
- [x] 1.5 `specs/templates/innovation/innovation_V_0-2-0_NN.md` created — copy; FM + parent-chain example re-pointed. Residual: 0.
- [x] 1.6 `specs/templates/procedures/procedures_V_0-2-0_NN.md` created — copy; FM + 2 parent-chain examples + canonical-sample path (→ `CodeReviewProcess_V_0-2-0_procedures_NN.md`) re-pointed. Residual: 0.
- [x] 1.7 `specs/templates/innovation/samples/DeLoreanTimeTravel_V_0-2-0_innovation_NN.md` created — copy; `parent_spec.name`/`parent_spec.url`/`model_version` → V_0-2-0 (3 lines).
- [x] 1.8 `specs/templates/procedures/samples/CodeReviewProcess_V_0-2-0_procedures_NN.md` created — copy; same 3 lines.
- [x] 1.9 Allow-list row 15 added to `proposal.md` for `cogNNitive_V_0-2-0_NN.md`'s 6 legitimate residuals (R-SV-11).
- [x] 1.10 `npm run check:spec-urls` AND `check-spec-version.mjs --check-urls --with-skills` literally green (R-LSR-05).
- [x] 1.11 `git status specs/` shows only the 2 intended L1 status edits as modifications; all `_V_0-1-0_` template/sample siblings untouched (R-SV-02). Each new file's diff vs its source = R1 lines only. `prettier --check` green on all 8 touched/new files.
- [x] 1.12 Regression guard ran during Phase 2 task 2.12. Result: the branch was ALREADY not-green before Phase 2 — `lint` (14 errors in `innfo-core/resolver.ts` + `innfo-mcp/tools/spec.ts`), `typecheck` (3 errors in `SearchResultsView.vue` + `recursiveSerializer.ts`), `format:check` (266 files), and `innfo-editor` test suite (7 pre-existing failures in golden roundtrip + recursiveSerializer + crlf-fidelity). None of these are attributable to PR 1 or PR 2. See task 2.12 for the full breakdown.

## Phase 2: PR 2 — constants, samples map, sample URLs, version.ts (iNNfo, strict TDD)

Base = PR 1 branch. `strict_tdd: true` — RED assertion first for every code edit. Test runner: `npm run test`. Satisfies R-SV-09, R-SV-10.

- [x] 2.1 RED — created `apps/innfo-editor/tests/unit/constants.test.ts` (4 assertions). Ran → 4/4 failed (`V_0-1-0` received, `V_0-2-0` expected).
- [x] 2.2 GREEN — edited `constants.ts:13` and `:19` → `'V_0-2-0'` (both stay scalar). Re-ran 2.1 → 4/4 pass.
- [x] 2.3 RED — created `apps/innfo-editor/tests/unit/shipped-template-versions.test.ts` (2 assertions: map value === max on-disk `template_version`; every on-disk versioned slug is a map key). Ran → 2/2 failed.
- [x] 2.4 GREEN — edited `apps/innfo-editor/src/config/samples.ts` `SHIPPED_TEMPLATE_VERSIONS` → 9 slugs per O3 (`analysis`/`business-model` = `V_0-1-0`; `blank`/`business`/`cogNNitive`/`innovation`/`organization`/`procedures`/`projects` = `V_0-2-0`; `workspace_spec` excluded). Re-ran 2.3 → 2/2 pass.
- [x] 2.5 RED — added case to `useTemplateVersionNotice.test.ts` (`templateName='procedures_V_0-1-0'`, no handle → `notice.value?.latest === 'V_0-2-0'`). Verified RED by temporarily reverting `samples.ts` to baseline map: new case failed (`expected null not to be null`), other 18 cases passed.
- [x] 2.6 GREEN — new `procedures_V_0-1-0` badge-fires case passes after 2.4. The 5 fixture regressions (2 in `useTemplateVersionNotice.test.ts`, 3 in `ModelInfoPanel-templateBadge.test.ts`) resolved per the **design.md O5 amendment**: re-pointed the stale `business` fixtures to `analysis` (the template that stays `V_0-1-0` in the shipped map), isolating the workspace-scan path. `useTemplateVersionNotice.ts` / `ModelInfoPanel.vue` code unchanged. Re-ran both files → 22/22 pass.
- [x] 2.7 RED — created `apps/innfo-editor/tests/unit/sample-urls.test.ts` (3 assertions: extraction finds >=9 URLs; every URL is `_V_0-2-0_`; every referenced path exists under `specs/templates/`). Ran → `_V_0-2-0_` assertion failed with all 10 `_V_0-1-0_` URLs listed; other 2 passed.
- [x] 2.8 GREEN — re-pointed all 10 starter-sample URLs `_V_0-1-0_` → `_V_0-2-0_` (business/procedures/organization) in `HomeView.vue` (62,71,79,176), `SetupWizard.vue` (53,62,70), `useWorkspaceScaffolding.ts` (248,253,258). Re-ran 2.7 → 3/3 pass. (No `projects` starter-sample URL exists in these 3 files; `HomeView.vue:566` `https://example.com/...V_0-1-0...` placeholder is illustrative, not a `SAMPLE_BASE` URL — left as-is per D3 line scope.)
- [x] 2.9 Edited `apps/innfo-editor/src/utils/version.ts` comment-only: replaced all 5 dangling section refs (`§8` L2; `§8.1` L8/L40/L~77; `§8.2` L~95) with `iNNfo V_0-2-0 — "Identity & Naming"` (real heading, L273 of `iNNfo_V_0-2-0_NN.md`). Kept the `e.g. V_0-1-0` format examples at L6 and L33 (`formatVersionString` comment). Orchestrator said `§8.1 (2×)` but 3 dangling `§8.1` refs existed — fixed all 3 to match the stated goal ("the section refs are dangling").
- [x] 2.10 Audit-only complete → `openspec/changes/complete-innfo-v0-2-0-adoption/v0-1-0-source-audit.md`. 23 sites / 20 files reviewed. 0 fixes in PR 2 (design only sanctioned the sample-URL edits, done in 2.8). 18 KEEP (illustrative/historical/defensive/semantically-correct). 5 KEEP-for-PR-2 + FOLLOW-UP flagged (genuine current-default assumptions, out of this change's scope): `innfo-core/parser/serializer.ts:28`, `innfo-mcp/tools/mutate.ts:849/853/854` (+ doc mirror `server.ts:213`), `innfo-editor/views/StandaloneProcedureView.vue:71-77`, `SetupWizard.vue:217`, `FilePreviewModal.vue:181`. Highest-priority follow-up: `create_model` scaffolds new models to the now-Deprecated L1 spec.
- [x] 2.11 Golden verified — `recursiveParser.models.golden` (7/7 pass) + `crlf-fidelity.golden` (2/2 pass). `git status --porcelain apps/innfo-editor/tests/golden/` is EMPTY → zero snapshot diff on `recursiveParser.models.golden.test.ts.snap`. Not run with `-u`. (D4 confirmed: no fixture / parser change in scope.)
- [x] 2.12 DONE (with documented pre-existing exceptions) — PR 2 introduces zero new lint/type/format violations and zero new test failures. The 5 test regressions from task 2.4 are RESOLVED via the O5 amendment (fixtures re-pointed to `analysis`); `useTemplateVersionNotice` + `ModelInfoPanel-templateBadge` = 22/22 pass. Full `innfo-editor` suite back to the branch's pre-existing baseline: **7 failed / 522 passed** — the 7 are `tests/golden/roundtrip.models.golden.test.ts` ×4, `tests/unit/recursiveSerializer.test.ts` ×2, `tests/golden/crlf-fidelity.golden.test.ts` ×1, all pre-existing on `feat/business-template-decomposition` and unrelated to version identity (legacy `_F.md` round-trip + CRLF). `innfo-core` 230/230, `innfo-mcp` 130/130. Details on the pre-existing lint/typecheck/format state below — all confirmed present at HEAD before this change, all OUT OF SCOPE.
  - `npm run lint` → RED: 14 PRE-EXISTING errors — `packages/innfo-core/src/resolver.ts` (11 × `no-empty`/`no-require-imports`), `packages/innfo-mcp/src/tools/spec.ts` (3 × `no-empty`). Neither file is in PR 2's changeset. PR 2 adds 0 lint errors.
  - `npm run typecheck` → RED: 3 PRE-EXISTING errors — `apps/innfo-editor/src/components/editor/SearchResultsView.vue` (2 × TS2339 `activeModelRootId`), `src/model/recursiveSerializer.ts` (1 × TS2353 `widgetType`). Not in PR 2's changeset. PR 2 adds 0 type errors.
  - `npm run format:check` → RED: 266 PRE-EXISTING unformatted files repo-wide (verified: `git show HEAD:` versions of `constants.ts`/`samples.ts`/`version.ts`/`HomeView.vue` already fail prettier). PR 2's 3 NEW test files are prettier-clean. PR 2 adds 0 format violations.
  - `npm run test`: `innfo-core` 230/230 GREEN, `innfo-mcp` 130/130 GREEN. `innfo-editor` = 12 failed / 517 passed. Baseline (Phase-1-only, PR 2 edits git-stashed) = 7 failed: `tests/golden/roundtrip.models.golden.test.ts` ×4, `tests/unit/recursiveSerializer.test.ts` ×2, `tests/golden/crlf-fidelity.golden.test.ts` ×1 — all PRE-EXISTING, unrelated to version identity.
  - **5 NEW regressions from task 2.4** (`SHIPPED_TEMPLATE_VERSIONS` now maps `business`/`organization`/`procedures`/`projects` → `V_0-2-0`): `tests/unit/useTemplateVersionNotice.test.ts` ×2 (`sets notice when the workspace scan finds a newer template version` expects `latest==='V_0-1-2'`; `leaves notice null when the model already pins the newest known version` expects `null`), `tests/component/ModelInfoPanel-templateBadge.test.ts` ×3. All 5 hardcode `business_V_0-1-x` / `organization` fixtures and assert map behaviour from when `business` was `V_0-1-0`/absent. `useTemplateVersionNotice.ts` + `ModelInfoPanel.vue` are CORRECT per D3 — the fixtures are now factually stale. Design O5 listed both files as "run, do not rewrite" / "add a case" and never analysed the `business`→`V_0-2-0` map CHANGE (only the `analysis`/`blank`/`cogNNitive`/`innovation` ADDITIONS as inert + `procedures` as intended). STOP-and-report per orchestrator instruction; the 5 tests were NOT rewritten. Needs a design amendment to O5 (update the stale fixtures — e.g. re-point to a slug absent from the shipped map, or bump fixture versions) before this gate can pass.

## Phase 2b: scaffolding/serialization default propagation (post-verify, user-requested "todo lo pendiente")

Folds into PR 2. Covers 4 of the 5 `v0-1-0-source-audit.md` follow-up sites.

- [x] 2b.1 RED — `packages/innfo-mcp/test/mutate-repair.test.ts` ×2 + `test/includes-and-scaffold.test.ts` ×1: `spec_version: "V_0-1-0"` → `"V_0-2-0"`. Ran → 3 fail.
- [x] 2b.2 GREEN — `packages/innfo-mcp/src/tools/mutate.ts` `create_model` frontmatter: `spec_version` → `"V_0-2-0"`, `spec_url` → `.../iNNfo_V_0-2-0_NN.md`. `server.ts:213` doc string updated. Re-ran → mcp **130/130**, core **230/230**.
- [x] 2b.3 `apps/innfo-editor/src/views/StandaloneProcedureView.vue` embedded `canonicalSampleMarkdown` → V_0-2-0 + `procedures_V_0-2-0`.
- [x] 2b.4 `apps/innfo-editor/src/components/layout/SetupWizard.vue` blank-scaffold frontmatter `spec_version: 'V_0-1-5'` → `'V_0-2-0'`, `template.version` → `'V_0-2-0'`.
- [x] 2b.5 `apps/innfo-editor/src/components/editor/FilePreviewModal.vue:181` UI copy `iNNfo V_0-1-0` → `iNNfo V_0-2-0`. Editor suite still **7 fail / 522 pass** (pre-existing baseline, zero new).
- [ ] 2b.6 DEFERRED — `packages/innfo-core/src/parser/serializer.ts:28` `spec_version` serialize fallback. Engine behaviour, out of design scope, entangled with the 7 pre-existing `recursiveSerializer`/golden failures. Own follow-up change.

## Phase 3: PR 3 — docs + CHANGELOG (iNNfo)

Base = PR 2 branch. NOT TDD-gated.

- [x] 3.1 Re-read the on-disk `docs/documentation/specifications.md` (with the orchestrator's staged Traceability section + "In flight" blockquote) before editing; rebased onto it.
- [x] 3.2 `specifications.md`: L1 table → `iNNfo_V_0-2-0` (Stable/adopted) + `V_0-1-0` (Deprecated) with a `status` vocabulary note; L2 table → 9 templates at their real `template_version` (`business` composite, `analysis`/`business-model` new at V_0-1-0, rest V_0-2-0); L3 table → `_V_0-2-0_` samples + StartupValidation. "In flight" blockquote replaced with a "V_0-2-0 adopted (2026-09-01)" note covering the 3 rule changes.
- [x] 3.3 `usage.md` example `spec_version` → V_0-2-0; `relationships.md` L1 ref → `iNNfo_V_0-2-0_NN.md`; `innfo-editor.md` ×2 (`procedures_V_0-2-0`, `CodeReviewProcess_V_0-2-0` URL); `apps/innfo-editor/src/ai-guide/procedure_NN.md` frontmatter `spec_version`/`spec_url`/`parent_spec` → V_0-2-0 (kept `model_version`). LEFT: `docs/repair-guide.md` (illustrative JSON with fictional model ids), `docs/changesets/{innfo-repo,format-repo}.md` (historical `_FORMAT.md` migration records). `ecosystem.md` had 0 version-string hits.
- [x] 3.4 `CHANGELOG.md` "Unreleased (2026-09-01)": added `model` type-enum, template decomposition (`business` → `business-model` + `analysis`), 4 new `_V_0-2-0_` template files + 2 samples, the adoption (status flip + `DEFAULT_INNFO_VERSION`), `SHIPPED_TEMPLATE_VERSIONS`/sample-URL edits, tooling (`check:spec-*`, `--with-skills`, CI `spec-integrity`); documented the `status` vocabulary. Corrected the 2026-08-19 "`cogNNitive` deleted" claim (kept, now has a `_V_0-2-0_` file).
- [x] 3.5 `prettier --check` green on all 6 Phase 3 files; `check:spec-urls` + `--with-skills` green; no code changed → `npm run test` unaffected (editor suite still at the pre-existing 7-fail baseline).

## Phase 4: PR 4 — actioNN repo sync (separate repo — merges AFTER PR 1 on iNNfo main)

NOT TDD-gated. Satisfies R-SV-12.

- [x] 4.1 `actioNN/skills/nn-innfo/templates/workspace_spec_NN.md` overwritten byte-for-byte from canonical `iNNfo/specs/templates/workspace_spec_NN.md` (`spec_version: V_0-2-0`, `parent_spec: iNNfo_V_0-2-0`). Replaces the invalid legacy `spec_version: V_1-0-0` / `# NN concept:` file. `diff -q` = identical.
- [x] 4.2 `actioNN/skills/nn-innfo/SKILL.md`: §2 canonical-URL block → `iNNfo_V_0-2-0_NN.md` + `business_V_0-2-0` / `procedures_V_0-2-0` / `organization_V_0-2-0`; prose "iNNfo V_0-1-0 specification" (lines 19, 33, 38), "Resumen de Niveles iNNfo (V_0-2-0)" (204), "Meta-plantilla Estricta V_0-2-0" (539) → V_0-2-0. Frontmatter `version:` (line 3, the skill's own version) NOT touched. First-revision filename patterns (`<Plantilla>_V_0-1-0_spec_NN.md`, `{ModelName}_V_0-1-0_{Template}_NN.md`, arch-example model filenames, the `*_procedures_V_0-1-0_NN.md` discovery glob) left — they are "new file starts at V_0-1-0" conventions, not L1 spec references.
- [x] 4.3 `actioNN/skills/nn-router/SKILL.md` lines 61-62 → `procedures_V_0-2-0_NN.md`, "Meta-template V_0-2-0".
- [x] 4.4 `diff -q` bundled vs canonical = identical (R-SV-12). `node scripts/check-spec-version.mjs --check-urls --with-skills` from iNNfo = green, 23 skill files scanned.
- [ ] 4.5 FOLLOW-UP (out of scope — separate skill not in this change's Phase 4 list): `actioNN/skills/nn-trannsform/SKILL.md` (lines 191, 197, 323) and `actioNN/skills/nn-trannsform/scripts/provenance.js:20` still name `iNNfo V_0-1-0` / hardcode `iNNfo_V_0-1-0_NN.md`. The URL still resolves (not a `check:spec-urls` failure) but `provenance.js` stamps the now-Deprecated L1 into every transformed doc's frontmatter. Same class as the Phase 2 audit's `create_model` finding. File alongside 5.1.

## Phase 5: Post-merge follow-up (NOT implemented now — file at archive)

- [ ] 5.1 File a coordinated ticket: bump `eNNvironment/docs/use/manifest.md` pins for `workspace_spec_NN` and `projects` (`path` + `version` + `commit`) using this change's merge sha.
