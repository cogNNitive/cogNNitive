# Independent diagnosis of the 2026-11-12 improvement analysis

| Field | Value |
| --- | --- |
| Author model | Claude Sonnet 5.5 (`claude-sonnet-5-5`), run inside Claude Code as a research sub-agent |
| Round | First, independent diagnosis. No cross-review and no consensus plan yet |
| Evidence date | 2026-11-14 (HEAD committer date 2026-11-14T10:43:15+01:00; report written about 11:40 UTC) |
| Evidence SHA | `f3348c162cfa2ecf2461a76a481e5903d63647ff` (`session/find-analysis`, equal to `origin/main` per `git ls-remote`) |
| Original analysed commit | `9c6bef60` (2026-11-12); 39 commits and 69 changed files separate it from HEAD |
| Inputs | `openspec/analysis/2026-11-12-improvement-analysis.md` (the 69 IDs QW-A1..H10 and R1..R11), `openspec/backlog_NN.md`, `openspec/changes/`, current code, tests and specs |
| Scales | Value, difficulty, impact, change-risk: low / medium / high. Effort: XS <=2h, S 2-8h, M 1-3d, L 4-10d, XL >10d (maintainer-days, AI-assisted, review included, CI waiting excluded) |

## 1. Scope and limitations

**Verified** means I read the cited path and line at HEAD, or ran the one command named. **Reproduced** means I ran it. **Inferred** means reasoned from code. **Unchecked** means I did not look.

Executed, all read-only:

- `git`/`rg`-style reads in the worktree; `git ls-remote --heads origin dev main`; `gh issue view`, `gh issue list`, `gh run list`, `gh api .../branches/main/protection` and `.../rulesets` against `cogNNitive/cogNNitive`.
- `node scripts/export-console.mjs . --status --no-open` run **on a copy of `test/fixtures/testlab` in the session scratchpad** (QW-E2), and `node scripts/export-console.mjs --domain --no-open` from an empty scratch directory (QW-A7). Neither wrote inside the repository; `git status` stayed clean.

Not executed: any test suite, `verify.js`, any build, any generator, `npm ci`. No shared `dist`, junction or bundle was touched. Tags are the ones present locally; I did not `git fetch`.

Not examined, so the original's claims stay as stated there and I do not endorse them: the three real domains and group G (`iNNtake_NN`, `coNNtent_NN`, `LC_programas` figures such as "3% kNNowledge", "6.6 MB change log", "253 `evidence:: unknown`"), runtime performance, and the coNNtent video engine beyond its version checks.

Independence: I did not read any `2026-11-14-independent-*` report, any other model's conversation, or the Codex/Claude origin threads. Counts below were recomputed by my own method and sometimes differ from the original; I say so where it matters.

## 2. Critical summary

1. **The diagnosis is partly right, and the artefact is already stale.** Of the 69 enumerated IDs, 5 are resolved (A1, F3, F4, F5, F7), 7 partly resolved, 4 not demonstrable by anything I could run, and 53 still current. A further piece of A2 (the stale-bundle risk) is covered by `89da00a0`. Two days of merges (#619-#636) already moved about 12 items. Treat the 12 November document as dated evidence, not a work order.
2. **The strongest findings hold up at HEAD** and are what I would act on: contradictions where a shipped artefact disagrees with its own validator or text (visual-catalog example, coNNtent version pin text, `[[Name]]` in 30 shipped procedures with 866 references, `sources::` taught by four skills, `INNFO_MODELS_DIR`, `[[Element Name]]` at `skills/nn-innfo/SKILL.md:1042`), plus a handful of real defects (QW-D10 probe, QW-E2 stale status, QW-C4/C5 silent wrong answers, QW-A6 frozen UI-smoke console, QW-A7 dead call).
3. **The "52 quick wins" count is inflated for decision purposes.** About 15 of the A-E items are comments, mojibake, display titles, optional frontmatter keys or CSP hygiene with no observable defect. They are cheap, but each blueprint edit pays the bump ceremony (`scripts/guard-template-immutability.js`), so batching or dropping matters more than the item count suggests.
4. **Three original claims are wrong or incomplete** and would mislead if copied into a backlog:
   - R2 says the core set is "hardcoded twice". The two sets differ: `scripts/blueprint-catalog.mjs:61` lists 7 names (what ships bundled); `scripts/export-console.mjs:324` lists 3 (what the console models). They answer different questions.
   - QW-A4 presents `fail-fast` as a bug. With `max-parallel: 1` and `blueprints` released first (`ci.yml:255`), stopping the remaining releases after a failed `blueprints` release may be what you want. Nobody has stated the intent.
   - QW-C6 says current documents skip the kind and language checks. True at `kinds.mjs:108,133`, but `episode.mjs:128` already refuses any pin that is not the installed version, so for every producible document the gating is simply dead. The simpler fix is to remove the version gating, not to repair it.
5. **The refactorings do not all earn their cost for one maintainer with no external users.** R3's `remove_field` and R8's reference form are justified by open issues. R1's guard relaxation and R10's overwrite warning are plausible small wins. R5, R6's package move, R7's envelope and pipeline split, R9's mass rename and R1's Level 0/1 collapse have no current defect behind them and large blast radius; I recommend postponing or dropping them. This matches the repository's own stance in `nn-dev-development` ("anything that does not serve [the two goals] is friction") and in the maintainer's no-backwards-compat preference.
6. **Release churn is real but its cost is not shown.** 111 tags since 2026-10-15, 18 of them since 2026-11-12; 100 commits touched `nn-console.bundle.js` since 2026-10-15; `main` CI failed 3 of its last 100 runs. That is annoying, not evidently harmful, and R5 would change the release model. Measure the pain before starting.
7. **There is almost nothing new to add.** I found four evidence-backed additions (section 5). Inventing more would be padding.

## 3. Traceability matrix: quick wins

Status: **C** current, **P** partly resolved, **R** resolved or obsolete, **N** not demonstrated/unchecked. Evidence: **V** verified, **Rp** reproduced, **I** inferred. Recommendation: **Keep**, **Reduce**, **Postpone**, **Drop**. Effort uses the common scale. Paths are relative to the repo root; `P:` = `iNNfo/packages/`, `BP:` = `iNNfo/specs/bluepriNNts/`.

### A. Release and CI

| ID | St | Ev | Current evidence | Rec | Effort | Note |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | R | V | `P:nn-mcp/package.json` is 0.37.1; tags `nn-mcp-v0.37.0`, `v0.37.1` exist | Drop | - | Done |
| A2 | P | V | `89da00a0` added `scripts/build-mcp-bundle.mjs --check`, registered at `scripts/lib/freshness-guards.js:22` and `scripts/verify.js:613`. `scripts/release/run-release.js:106-112` still copies the bundle unchecked | Drop | - | The gate on `main` runs before auto-tag. `run-release.js` is 197 lines against a `<200` cap (see A10), so adding a check there trips that guard |
| A3 | C | V | `scripts/release/plan-auto-tags.js:34-37` counts `!` as major for any `[a-z]+` type | Keep | XS | Pure function with a test file; a docs `!` already caused `skills-v3.0.0` |
| A4 | N | I | `ci.yml:254-255`: `max-parallel: 1`, `fail-fast` default | Postpone | XS | Decide intent first; "stop after a failed `blueprints` release" may be desirable |
| A5 | C | V | All 8 jobs `ubuntu-latest` (`ci.yml` x7, `release.yml` x1); `P:nn-mcp/vitest.config.ts:15-19` skips two suites off Windows | Reduce | S-M | First try QW-C3 + un-skip on Linux; add a Windows job only if they still flake |
| A6 | C | V | `test/ui/testlab_smoke.py:29` globs `artifacts/TestLab_coverage_TestLab_console/*_20261013T045336Z.html`, last committed 2026-10-16, while `domaiNN_console.html` is current (2026-11-14). `ci.yml:~280` filter ignores console sources | Keep | S-M | Backlog idea of 2026-10-31 (fixtures still shipping `innfo-ui.css`) is the same debt. See NI-2 |
| A7 | C | Rp | `scripts/regen.js:80` calls `export-console.mjs --domain --no-open` with no root; reproduced exit 2 (usage) and the result is ignored | Keep | XS | Delete the call; the manual flow in `nn-dev-development` section 6 stays |
| A8 | C | V | `docs/innfo/blueprints/catalog.json` is byte-identical to its source and tracked; `regen.js:68` copies it; `build-docs.mjs:48-59` regenerates it | Postpone | XS | No defect shown; untracking needs the Pages job proven to build first. Fold into any future R5 work |
| A9 | P | V | `origin` has only `main` (no `dev`); `ci.yml:8` still lists `dev` and its comment still defends it; `fc73ee88`/`f07ba598` removed two other `dev` uses | Keep | XS | |
| A10 | C | V | `scripts/verify.js:531-559`: cap of 200 lines; `skills/nn-sources/scripts/provenance.js` is absent and skipped; `run-release.js` 197, `scanner.js` 197, `skills-manager.js` 189 | Keep | XS | Also unblocks edits to those files |
| A11 | C | V | `scripts/lib/freshness-guards.js:14-26` has no address-module entry; `export-address-module.mjs:24` supports `--check` | Keep | XS | |
| A12 | C | V | Mojibake in `scripts/build-docs.mjs` output strings (lines ~16, 48, 59); `build-preflight-primitives.mjs:12` still names `skills/nn-upgrade/...` | Keep | XS | Fold into WP2; other two comments unchecked |

### B. Specs and blueprints (each edit forces a `blueprint_version` bump)

| ID | St | Ev | Current evidence | Rec | Effort | Note |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | C | V | `BP:domaiNN/spec_NN.md:45,101` `type:: model` | Keep | XS | Batch with B7/B11 |
| B2 | N | U | Not checked in depth | Drop | - | "Can only add warnings" is a cost, not a benefit; no defect cited |
| B3 | C | V | `BP:visual-catalog/spec_NN.md:222-232` example: H1-style entry, `category:: [[<Category>]]`, two `source::` lines | Keep | XS | Shipped example contradicts the validator; no sample to rename |
| B4 | C | V | `BP:business-model/spec_NN.md:63` index entry; section at :2434 | Postpone | XS | Optional vertical; bump cost exceeds benefit, do it with the next business-model change |
| B5 | C | I | `description::` lines: innovation 3, projects 3, organization 7 (by my count) | Postpone | M | Documentation completeness, no defect |
| B6 | C | V | 19 of 22 `spec_NN.md` lack `blueprint_name` | Postpone | S | Optional keys; no consumer needs them today |
| B7 | C | V | `BP:coNNtent/spec_NN.md:769` "pins `V_0-15-0`; `produce` refuses any other pin" vs :783 prompt "pin `V_0-17-0`" vs `episode.mjs:128` installed version (`blueprint_version: V_0-19-0`, :9) | Keep | XS | The section contradicts itself |
| B8 | C | V | 19 titles contain "App" | Drop | - | Display text; changes catalog `title`; breaks nothing today |
| B9 | C | V | `iNNfo/specs/vocabulary.json` `terms` lacks source, citation, evidence, change(set), provenance, address, slug, procedure | Postpone | S | Add only terms a doc or test actually needs |
| B10 | C | V | `P:nn-core/tests/changeset/changes-blueprint-text.test.ts:45` skips `review_gate`; `BP:changes/spec_NN.md` has no `review_gate`; `CHANGE_OPS` (`P:nn-core/src/changeset/types.ts:7-30`) does | Keep | M | The best-evidenced RC1 instance |
| B11 | C | V | `BP:domaiNN/spec_NN.md:~151` lists 2 directories; `P:nn-core/src/scaffold/domain.ts:13-23` creates 9 | Keep | XS | Prose only |

### C. Code

| ID | St | Ev | Current evidence | Rec | Effort | Note |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | C | V | `P:nn-core/src/console/citations.ts:3-10` and `payload-builder.ts:~10` import from `../index.js`. Cycle not executed | Keep | XS | Confirm with a cycle check before merging |
| C2 | C | V | `P:nn-mcp/src/server.ts:78` fallback `'0.32.0'` | Keep | XS | Package is 0.37.1 |
| C3 | C | V/I | `P:nn-core/src/resolver.ts:371` `matches[0]`; `getMarkdownFiles` (:252-278) does not sort | Keep | XS | Mechanism verified; link to the Linux flake is inferred |
| C4 | C | V | `P:nn-core/src/workspace/integrity/versionStatus.ts:102-107` returns 0 for unparseable. Callers: `changeset/history.ts:154-155`, `changeset/lineage/plan.ts:98`, `versionStatus.ts:255,277` | Keep | S | Behaviour change; three callers need a test each |
| C5 | C | V | `P:nn-mcp/src/tools/apply-change.ts:1685-1698`, `catch { // ignore unparseable }` | Keep | S | A broken model should block `remove_element` |
| C6 | P | V | `kinds.mjs:108,133` gate on `=== 'V_0-15-0'`; `episode.mjs:128` refuses other pins | Reduce | S-M | Remove the version gating and the legacy exemption instead of repairing it; needs a coNNtent bump and one real-domain run |
| C7 | C | V | 6 non-test files call `createHash('sha256')` directly | Postpone | S | Taste refactor, no defect |
| C8 | C | V | `apply-change.ts:106-111` local `parseVersion` accepts `.` and a missing `V_` | Reduce | S | Check the `bump_version` specs before unifying; the looseness may be deliberate |
| C9 | C | V | `reachability.ts` 347 + `spec-backup.ts` 149 lines are reached only by `tools/mutate.ts:10,22-24` re-exports and tests; `server.ts` imports none of them | Keep | S | Pure deletion, 496 lines; delete their tests too |
| C10 | C | V | `P:nn-core/src/changeset/parser.ts` validates a few keys and casts the rest | Postpone | M | No incident |
| C11 | C | V | `P:nn-mcp/src/tools/validate.ts:62-79` two ignore sets; `isExcludedPath` used only at `apply-change.ts:178`. `helpers.ts` no longer exists | Postpone | M | The original path is stale; do it when a discovery bug appears |
| C12 | P | V | `P:nn-core/src/validator/knowledge-checks.ts:375` says the ban is L1-scoped; :392-395 says version-independent and `void scope`. Other three comments unchecked | Keep | XS | Delete the dead `scope`/`l1Version` too |

### D. Skills and docs

| ID | St | Ev | Current evidence | Rec | Effort | Note |
| --- | --- | --- | --- | --- | --- | --- |
| D1 | C | V | `skills/nn-preflight/SKILL.md:84`, `skills/nn-sources/citations.md:5,18`, `skills/nn-sources/scripts/index.js:445`, `BP:workspace/procedures/*` (5 files) teach `sources::`; validator emits `SOURCES_FIELD_BANNED` (`knowledge-checks.ts:405`) | Keep | S | Highest behavioural value: agents follow these |
| D2 | C | V | `skills/nn-innfo/SKILL.md:200,408,470` vs `server.ts:65` reading only `INNFO_DOMAIN_DIR` | Keep | XS | |
| D3 | C | V | `skills/nn-innfo/SKILL.md:1042` vs :636, :966 | Keep | XS | |
| D4 | C | V | `skills/nn-innfo/SKILL.md:172,860,864` say `workspace/procedures/` | Keep | XS | |
| D5 | C | I | `skills/nn-preflight/SKILL.md:79-92`; `preflight-check.js` has no text matching tiers 4 and 7 | Keep | S | Rewrite from the script, not from memory |
| D6 | C | V | `.agents/skills/nn-console-kit/SKILL.md:4` "Preact + HTM", :81 "52 tests"; console dir has 13 top-level `.js`; `nn-runtime.js`/`ui-kit.js` use no `html\`` templates | Keep | XS | Maintainer-only |
| D7 | P | V | Only `docs/use/reviewer-guide.md:52` still says "lineage record"; the other five cited places did not match my patterns | Keep | XS | Re-grep before editing |
| D8 | P | V | `docs/update/README.md:18,74` still name `/nn-upgrade`; `docs/documentation/content/skills/nn-update.md` is clean | Keep | XS | |
| D9 | C | I | 75 "template/Template" hits in `scripts/lib/skills-commands.js`; user-facing share unchecked | Postpone | S | Strings only; forces a bundle rebuild |
| D10 | C | V | `skills/nn-preflight/scripts/domain-probe.js:28-35` lists only `kNNowledge/*.md` | Keep | S-M | Real functional gap for distributed domains; effect on the `nn` menu not reproduced |
| D11 | P | V/I | `scripts/lib/skills-commands.js:882` already reports `modified locally` for skills | Reduce | S-M | Extend the warning to blueprints and embedded skills; no hashing redesign |
| D12 | C | V | `AGENTS.md:27-28` "for all three"; `.claude/skills/` holds four stubs | Keep | XS | |

### E. Console

| ID | St | Ev | Current evidence | Rec | Effort | Note |
| --- | --- | --- | --- | --- | --- | --- |
| E1 | C | V | `BP:console/nn-runtime.js:17` `CONSOLE_VERSION = '0.1.0'`; `console/package.json` 0.37.1 | Keep | XS-S | Value also written into exported changesets (:6598-6603) |
| E2 | C | Rp | Fixture copy: three models `[fresh]`, `Domain console: domaiNN_console.html [stale]`; code at `scripts/export-console.mjs:482` compares embedded count with model count. Root cause not isolated | Keep | S | Reproduced symptom; cause inferred |
| E3 | C | V/I | `export-console.mjs:1412` writes `runtime`; `nn-runtime.js:155` reads it. "Never used" unchecked | Keep | XS | |
| E4 | C | I | CSP hashes in `artifact_shell.html:10`; not measured | Postpone | M | Hygiene, no defect |
| E5 | C | V | `export-console.mjs:469,473` compare mtimes | Reduce | S | Only matters after a fresh worktree checkout; do after E2 and prefer one hash check |

### F. Registers and settings

| ID | St | Ev | Current evidence | Rec | Effort | Note |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | C | V | `openspec/changes/console-catalog-picklist/` holds only `specs/`; code merged in `0fe11e4e` | Keep | XS | Maintainer action |
| F2 | C | V | #614 and #612 open with their full original titles | Keep | XS | Backlog items `cross-domain-export` and `conntent-blueprint-gaps` already scope them |
| F3 | R | V | Engine writes `<container>/episodes/<slug>/` (`BP:coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:136-146`); `references/folder-contract.md:59,69` rejects `assets/` layouts. #565 open; backlog `episode-layout-drift` still says open | Keep | XS | Close #565, mark the backlog item obsolete |
| F4 | R | V | `b6-remove-banned-l3-field` exists (order 22) | Drop | - | Done |
| F5 | R | V | Items for #617 (`procedure-reference-form`) and #587 (`orphan-model-lineage-guard`) exist; `number-field-changeset` marked shipped/obsolete; `console-payload-size` shipped | Drop | - | Done |
| F6 | C | V | `gh api .../protection` 404; rulesets `[]` | Postpone | XS | `main` failed 3/100 runs; optional, but it protects auto-tag |
| F7 | R | V | `git ls-remote` shows no `origin/dev` | Drop | - | Done |

### H. Small, but contract-touching (heavy lane)

| ID | St | Ev | Current evidence | Rec | Effort | Note |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | C | V | `server.ts:159,264,628` ignored `intent` | Reduce | XS | Ride the next nn-mcp minor; no solo release |
| H2 | C | V | `server.ts:924-976` silent aliases | Reduce | XS | Same |
| H3 | C | V | `server.ts:569` `check_domain` `readOnlyHint: true`; `check-workspace.ts:4,164,259` self-heals (writes) | Keep | XS | A client may auto-approve a writing tool; do soon |
| H4 | N | U | Not checked | Postpone | XS | |
| H5 | C | I | `isError` set only at `server.ts:892,1221`; failures returned as `ok:false` at :881,1230 | Reduce | S | Check what skills parse before changing |
| H6 | C | V | `P:nn-core/src/merge.ts` (184 lines): `mergeKnowledge` appears only in `index.ts:198`, `browser.ts:97` and tests. Other three exports unchecked | Keep | S | Delete with their tests |
| H7 | N | U | Not checked | Postpone | S | |
| H8 | C | V | `manifest/source.yaml:70,87` `V_0-7-0` / `V_0-3-2`; actual `changes` is `V_0-9-0` | Keep | XS | |
| H9 | C | V | `.agents/skills/nn/SKILL.md` is `V_3-4-0` vs `skills/nn` `V_3-4-3`; `.claude/skills/nn-dev-development/SKILL.md:3` still describes the retired `dev` flow | Keep | XS | |
| H10 | C | V | Four root spec files have no references (the `metrics` hits are test strings) | Postpone | XS | Published URLs are frozen by `openspec/decisions/keep-published-paths-frozen.md`; zero benefit |

**Tally of the 69 IDs.** Status: 53 C, 7 P, 5 R, 4 N. Recommendation: 39 Keep, 8 Reduce, 15 Postpone, 7 Drop.

## 4. Traceability matrix: refactorings

| ID | St | Ev | Premise at HEAD | Rec | Minimal alternative | Effort (full -> kept) |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | C | V | 20 of 22 blueprints pin `iNNfo_V_0-6-0` while 21 declare `spec_version: V_0-5-0`; guard demands a bump for any non-badge change (`scripts/guard-template-immutability.js:~314-321`) | Reduce | **R1a**: make the guard ignore prose, examples and typos. Skip stamping, tag pinning and the Level 0/1 collapse | XL -> M |
| R2 | P | V | `CHANGE_OPS` has `review_gate`, the blueprint does not (B10). The "hardcoded twice" claim is wrong (7 vs 3 names, section 2) | Reduce | B10 plus a parity test for `changes` only | L -> M |
| R3 | P | V | No `remove_field` (`types.ts:7-30`); backlog `b6`; #560 and #614 open; probe gap D10 | Reduce | Ship `remove_field` (or repair `LC_programas` by hand once); do D10 and add one distributed fixture to the probe tests; skip the consumer matrix | M -> M |
| R4 | C | V | `lineage/project.ts:347-349` transitional `sources::` reader; `skills/nn-update/scripts/apply-update-plan.js:58-70,158-168` repins and writes files without a change record; three silent loaders | Reduce | Remove the reader after R3 and the corpora fix; postpone compaction and the evidence policy | L -> S-M |
| R5 | C | V | 15 committed generated artefacts; 12 freshness guards; 100 commits on the bundle and 111 tags since 2026-10-15 (18 since 2026-11-12). But `89da00a0` shows a file guard is enough for the one unguarded bundle | Postpone | A7/A8/A11 only; the backlog `derived-artifacts-consolidation` already says "re-check the pays-a-ripple premise" | L -> XS |
| R6 | C | V | `export-console.mjs` 2,546 lines, `console-views.mjs` 651, `nn-runtime.js` 8,171 | Postpone | E1-E3 | L -> S |
| R7 | P | V | Silent loaders at `P:nn-core/src/changelog/load.ts:84-88`, `changeset/history.ts:58-68`, `P:nn-mcp/src/tools/provenance-strict.ts:99-104`; `apply-change.ts` is 2,733 lines with 37 `catch` | Reduce | Diagnostics on the loaders (additive), H3, H5. Drop the envelope major bump; postpone the pipeline split | L -> M |
| R8 | C | V | 866 `[[...]]` in 30 shipped procedure files; #617 open; the console resolver still strips `[[ ]]` (`nn-runtime.js:608`) | Reduce | Decide the form (backlog `b3f`), rewrite by script, update stepper and tests. Postpone the irreversible-step field and typed references | L -> M |
| R9 | C | I | My non-test count: 184 "workspace", 474 "template" in `nn-core/src` (method differs from the original's 288/467) | Postpone | Only deletions: C9, H6, H7 | L -> S |
| R10 | P | V/I | Manifest has no retired-skills list; this session's skill list shows both `nn-conntent` and `nn-video-script` with near-identical triggers; `skills/nn-innfo/SKILL.md` 1,045 lines, `nn-sources` 659 | Reduce | NI-3, D11-lite, fix the D-contradictions; no SKILL.md split yet | M -> S |
| R11 | C | V | 8 of 8 jobs Ubuntu; gate spread over `verify.js` (792), `pre-push-check.js` (227), `check-integrity.js` (158); `main` 3/100 failed; session branches 23 of 53 failed in the last 100 runs | Reduce | C3 + Linux un-skip experiment; Windows non-blocking job if needed; keep the three gate files | M -> S |

## 5. New improvements

Only items backed by code or repository evidence. IDs are mine.

| ID | Improvement | Evidence | Benefit | Effort | Do not do if |
| --- | --- | --- | --- | --- | --- |
| NI-1 | Reconcile the tracker with merged work: close #490 (shipped in #624, backlog `console-shell-actions` says so), close #565, mark `episode-layout-drift` obsolete, archive `console-catalog-picklist` | `gh issue list` shows #490 and #565 open; backlog lines 209-219, 256-266; F3 evidence | The tracker stops sending a future agent to fixed bugs | XS | The maintainer prefers closing on release |
| NI-2 | Retire the frozen console fixtures `test/fixtures/testlab/artifacts/*_console/` (2026-10-13 bundle, `innfo-ui.css`) and point the UI smoke at `domaiNN_console.html` | A6 evidence; backlog idea 2026-10-31 | The smoke tests the console that ships; one fixture less to regenerate | S | The smoke assertions depend on the old artefact layout and cost more than S to port |
| NI-3 | Remove the retired `nn-video-script` from the maintainer's machine now, and record "retired skills" in the installer only if a second case appears | Session skill list; no `retired` key in `manifest/source.yaml` | Ends a live trigger collision at no code cost | XS | It is still needed on that machine |
| NI-4 | Turn the accepted outcome of this review into at most 6-8 backlog work packets (section 6), not 69 IDs | Original's own rule: "each accepted item should become a backlog entry or an issue and nothing else" | Keeps `backlog_NN.md` usable | XS | - |

## 6. Provisional prioritisation (work packets)

Effort assumes a maintainer fluent in the repo with AI assistance, review and heavy-lane spec writing included, CI wait excluded. "Impact" is the positive effect; "change-risk" is the chance the change itself breaks something.

| WP | Content | Value | Difficulty | Impact (scope) | Change-risk | Effort | Depends on |
| --- | --- | --- | --- | --- | --- | --- | --- |
| WP1 | Tracker truth: F1, F2, F3, NI-1 (F6 optional) | medium | low | low (process) | none | XS (1-2h) | - |
| WP2 | CI/scripts hygiene: A3, A7, A9, A10, A11, A12 | medium | low | medium (release planner, gate) | low (A3 is logic, has tests) | S (4-8h) | A10 before any edit to `run-release.js` |
| WP3 | Skill and doc contradictions: D1-D8, D12, H9, H8 | high for agent behaviour | low | medium (skills patch release) | low (no frontmatter) | S-M (4-8h) | - |
| WP4 | Blueprint text: B1, B3, B7, B10, B11 and C6-reduced | medium | medium (bump ceremony) | medium | low-medium (blueprints and coNNtent releases) | M (1-2d) | B10 before R2 work; C6 needs a coNNtent bump |
| WP5 | Core correctness: C2, C3, C4, C5, C8-reduced, C9, C12, H6, H3 | medium | low-medium | medium | medium (C4, C5 change answers; H3 is MCP surface, heavy lane) | M (12-20h) | C3 first; C4 needs caller tests |
| WP6 | Console quick set: E1, E2, E3, then E5-reduced | medium | low-medium | medium (every domain with changesets) | low-medium (bundle regen; version value in exports) | S-M (4-10h) | - |
| WP7 | `remove_field` + repair `LC_programas` (R3a, b6, #560) | high | medium | high (unblocks a real domain) | high (contract) | M-L (2-4d) | B10 declares the op |
| WP8 | Procedure reference form (R8-reduced, #617) | medium | medium | medium (30 files, stepper) | medium | M (1-3d) | Maintainer decides the form |
| WP9 | D10 probe + one distributed fixture in its tests | medium | low | medium | low | S (3-6h) | - |
| WP10 | R11-lite: sort + un-skip experiment, Windows job only if still flaky, A5/A6/NI-2 | medium | medium | medium | low | S-M (6-14h) | WP5's C3 |

Suggested order, not a final plan: WP1, WP3, WP2 in parallel (all low risk), then WP5 and WP9, WP4 and WP6, then WP7 and WP8 as the two real heavy-lane items, WP10 last. Rough total for WP1-WP6 and WP9-WP10: 40-80 maintainer hours, about 1-2 working weeks; WP7-WP8 add 3-7 days. Estimates are ranges, not forecasts.

### Acceptance validation per action

| Action | Observable acceptance |
| --- | --- |
| A3 | A unit test: `docs(skills)!:` yields a minor or patch bump; `feat!:` still yields major |
| A7 | `node scripts/regen.js` no longer spawns `export-console` (assert in a test or by grep); regen output unchanged otherwise |
| A9/A10/A11 | `ci.yml` lists only `main`; `verify.js` has no `line-count` step; corrupting `nn-address.generated.js` makes a freshness guard fail |
| D1-D4 | `git grep -n "INNFO_MODELS_DIR\|workspace/procedures/\|\[\[Element Name\]\]"` is empty; no skill example uses `sources::`; the validator still passes on the edited procedures |
| B3/B7 | The `visual-catalog` example parses with zero validator errors (add a test that extracts and validates it); one pin rule in the coNNtent text |
| B10 | The `review_gate` exemption at `changes-blueprint-text.test.ts:45` is deleted and the test is green |
| C4/C5 | New tests: unparseable version reads as "unknown" at each of the three callers; a changeset removing an element is rejected with a stable code when another model cannot be parsed |
| C9/H6 | `git grep reachability\|spec-backup\|mergeKnowledge` returns only the deletions' own history; nn-core and nn-mcp suites green |
| D10 | A distributed fixture domain reports its models in the `nn` probe |
| E2 | `export-console <fixture> --status` reports the console `fresh`; a regression test in `test/console-*.test.mjs` |
| WP7 | Backlog `done_when` of `remove-banned-l3-field`: a model with a banned `sources::` is repaired through a changeset alone and the serializer omits the key |
| WP8 | `usage_procedures_NN.md` validates with zero errors; stepper and procedure tests agree on one form |
| R11-lite | Linux CI runs the two formerly skipped suites green for several runs, or a Windows job runs them; `WINDOWS_ONLY_SUITES` is empty |

## 7. Dependencies

- A10 -> any change to `run-release.js` (197/200 lines).
- C3 -> un-skipping the two Windows-only suites -> A5/R11-lite.
- B10 (declare `review_gate`) -> R2 parity test; B10 and WP7 both edit `BP:changes/spec_NN.md`, so bundle them in one `blueprints` release to avoid two bump cascades.
- WP7 (`remove_field`) -> removal of the transitional reader (R4) -> any `sources::` clean-up in shipped procedures.
- R1a would make WP4 cheaper, but costs about as much as WP4 itself. Do WP4 first, R1a only if more prose batches follow.
- H1, H2, H5 -> the next nn-mcp minor release (one version, one bundle).

## 8. What not to do, and why

| Do not | Why | Instead |
| --- | --- | --- |
| Treat the 69 IDs as a backlog | Twelve are already moved; many are cosmetic | NI-4: 6-8 work packets |
| R7 response envelope (major bump) | The consumers are the repo's own skills; no one is broken by three failure shapes today | H3, H5, loader diagnostics |
| R1 Level 0/1 collapse and URL moves | Needs an exception to the frozen-paths decision; no failing user | R1a only |
| R5 build-at-release rewrite | Release model change with no demonstrated harm; the bundle guard (`89da00a0`) already closes the one gap | A7, A11; revisit with measured cost |
| R6 package move; R9 mass rename; R2 `common` blueprint | Large churn across 100+ files for no observable behaviour change | Deletions (C9, H6) only |
| B2, B8, E4, C7, C10, C11 | No defect, cost in bumps or churn | Revisit when a bug points at them |
| A `fail-fast: false` flip (A4) | Intent unknown; could remove a safety stop | Decide the intent first |
| A consumer matrix in CI (R3) | New machinery for a class of bug the probe fixture and D10 already cover | One distributed fixture in existing tests |
| Close #565 or #490 without a one-line check in the PR | Both are verified fixed at HEAD, but the maintainer owns the tracker | WP1 |
| STE linting, in-place domain migrator, console UI rewrite | The original already rejected them; I agree (Preact is not the console's engine: `nn-runtime.js` and `ui-kit.js` contain no `html\`` templates) | - |

## 9. Open points I could not settle

- **Intent of release `fail-fast`** (A4) and **whether Linux is a supported platform** (the original's open question; `vitest.config.ts:10-14` says "a platform we do not target"). WP10 resolves the second empirically.
- **E2's root cause**: reproduced the `stale` result, did not isolate whether it is the extra embedded `changes` entry.
- **Whether `remove_field` or one manual repair** is the right answer for #560. Only two reports exist (#560, #614), both from the maintainer's own domain.
- **Unchecked claims**: QW-B2, B5 detail, D5 detail, D9, E3's "never used", E4, H4, H5's consumers, H7, C1's cycle, and all of group G and the domain-size figures.
