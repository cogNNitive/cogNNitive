# Cross-review (Sonnet) of the three first-round reports

Model actually executed: Claude Sonnet 5.5 (`claude-sonnet-5-5`), Claude Code, no sub-agents. Baseline `f3348c162cfa2ecf2461a76a481e5903d63647ff`, worktree `cogNNitive-find-analysis` (HEAD verified equal). `origin/main` is 2 commits ahead (`2c88fe29`, `551d5a18`); `git diff --stat f3348c16 origin/main` touches only `openspec/backlog_NN.md` (+6), so no cited code moved. Read: process doc, all three first-round reports, original analysis. Did not read any cross-review. Labels: **V** read at path:line, **R** run here, **I** inferred, **U** unchecked. Paths: `BP`=`iNNfo/specs/bluepriNNts`, `CORE`=`iNNfo/packages/nn-core/src`, `MCP`=`iNNfo/packages/nn-mcp/src`, `ENG`=`BP/coNNtent/skills/nn-conntent/scripts`. "QW-D1" means the quick win; "D01" the register entry.

Commands run (all read-only; no suite, build, generator or install): `git rev-parse HEAD`, `git log/tag/show` on release history, `git diff --stat`, `grep`/`sed` reads, `node plan-auto-tags.js` `bumpFor` on five synthetic messages, and one in-memory `node` call of `kinds.mjs` `validateSceneKinds`/`validateLanguage` (script in the session scratchpad, outside the repo). One first attempt hung on a shell mistake of mine and was stopped; no output from it was used. `git status` shows only the four untracked analysis files plus this one.

## Withdrawn or corrected from my own first report

1. **QW-A3 "Keep, `docs!` must not be major": withdrawn** (D01).
2. **QW-C6 "remove the version gating and the legacy exemption": withdrawn** (D04). Replaced by a predicate repair.
3. **QW-C4 "silent wrong answers": downgraded to Reduce** (D06). I over-read the helper.
4. **R1a "make the guard ignore prose": withdrawn, now Postpone** (D07).
5. **WP7 "depends on B10": corrected** (D03). Not a prerequisite; it is a shared-file batching option.
6. **QW-D12 "Keep": withdrawn, now Drop.** `AGENTS.md:27-28` says "for all three" about `nn-dev-development`, `nn-dev-issue-tracking`, `nn-dev-backlog`; `.claude/skills/` holds those three plus `nn-console-kit`. Sol was right; DeepSeek and I were wrong.
7. **QW-F3 "engine writes `<container>/episodes/<slug>/`": weakened.** `ENG/lib/pipeline.mjs:136-146` is `modelIdOf` (a reader) and `ENG/lib/layout.mjs:63-97` rejects `assets/` layouts; I did not see a writer. State: id derivation and layout checker agree on `episodes/`; whole-engine agreement is **U**. Closing #565 on my evidence alone is not justified.
8. **QW-A5 "try QW-C3 plus a Linux un-skip first": withdrawn as a first move.** `MCP/vitest.config.ts:9-14` documents Linux as a deliberately untargeted platform (issue #122) and sorting does not prove the flake cause. See D08.

## D01 — QW-A3 `!` semantics (focus). Disposition: **reject the allowlist; defer any change to a policy decision**

- Claim assessed: Sonnet "count `!` as major only for feat/fix/refactor/perf" vs Sol "an explicit marker is honored regardless of type". Code: `scripts/release/plan-auto-tags.js:34-37` (`/^[a-z]+(\([^)]*\))?!:/` or `BREAKING CHANGE:` footer). **R:** `bumpFor` returns `major` for `docs(skills)!:`, `chore!:`, `fix(x)!:`, `refactor(session)!:` and a docs commit with a `BREAKING CHANGE:` footer. The test (`plan-auto-tags.test.js:12-13`) pins only `feat!` and the footer.
- Published contract: header comment `plan-auto-tags.js:9-10` and `nn-dev-development` section 5 say "breaking → major". Conventional Commits allows `!` on any type. Desired policy is therefore *already stated*; there is no bug in the classifier.
- Actual incident (V): `d0ec2a06 docs(skills)!:` (2026-11-10) → `skills-v3.0.0`. It touched `skills/nn-preflight/reference/skill-locations.md` (one line, inside the `skills` key) while its breaking content was the removal of two maintainer-only skills under `.agents/` and `.claude/` (not shipped). So the defect is a **scope mismatch**: the planner reads a commit's marker against every key whose path it touches (`readRepoState`, `plan-auto-tags.js:106-112`), not against the content that is breaking. A type allowlist would not have helped a `refactor(x)!:`-typed commit, and would hide a real `docs!` in `iNNfo/specs` (blueprint prose is normative: `blueprints` ships on any commit touching it).
- Hazard Sol did not name (V/I): `bump()` is `major+1.0.0`. `blueprints` is at 0.62.2 and has never been a 1.x tag (tag scan: majors seen `0.18.0` only). The next `!` commit touching `iNNfo/specs` would tag `blueprints-v1.0.0`. Whether any resolver assumes 0.x is **U**.
- Minimum safe action: none in code now. Process rule in `nn-dev-development` §5 ("do not use `!` unless a shipped contract breaks; the marker bumps every key the commit touches") or split such commits by key. Optional later: restrict `!` to commits whose touched files are in a key's `repoPaths` minus docs-only paths, with a decision on 0.x majors first.
- Acceptance if code is ever changed: `bumpFor` tests for `docs!` touching only non-shipped paths = patch; `feat!` on `skills/` still major; footer form unchanged. Not run.
- Uncertainty: maintainer intent for `!` on non-shipping edits; 0.x major policy.

## D02 — QW-A2/R5 guard scope (focus Sol). Disposition: **accept Sol: guard proves identity only; no new mechanism now**

- `scripts/build-mcp-bundle.mjs:62-100` checks (a) not code-split, (b) an announced `name:"nn-mcp",version:"…"` exists, (c) it equals `package.json`. It never compares bundle bytes to source. V.
- Release consumers: `.github/workflows/ci.yml` `auto-tag` has `needs: [verify, site, quality, spec-integrity]` (V, line ~223), and `verify.js:613` runs `mcp-bundle`. `run-release.js:106-112` copies the bundle unchecked, but only after that gate. nn-mcp ships only when `package.json` has an untagged version (`plan-auto-tags.js:84-87`), so a same-version stale bundle requires: source edited after the bump-and-rebuild, no new bump, then a release at that version. Possible inside one PR; no instance exists. **Same-version stale case not demonstrated** (the process doc asks for it before a mechanism).
- Action: none. Correct my wording only: "A2 resolved" overstated; "A2 sufficient for the observed incident" is the defensible claim. DeepSeek's "resolved" and Sol's "partial" differ only on this word.
- Uncertainty: whether `pre-commit` regen rebuilds the bundle on `nn-mcp/src` edits (skill §3 says it does when code is staged; not run).

## D03 — R3/B10 field repair (focus Sol). Disposition: **accept Sol's separation; keep a bounded `remove_field`; B10 is independent**

- Observed gap (V): `CHANGE_OPS` (`CORE/changeset/types.ts:7-30`) has 23 ops, no `remove_field`; `SetFieldsEntry.to` is a string (`types.ts:361-366`) and `set_fields` requires a non-empty JSON object (`types.ts:417-443`); no op writes an empty/removal value. Validator emits `SOURCES_FIELD_BANNED` as an error for any L3 `sources::`/`source::` field (`CORE/validator/knowledge-checks.ts:~403-407`). `apply_change` validates the whole model (backlog `remove-banned-l3-field` evidence), so one banned field blocks all later changesets on that model. Backlog item `done_when` allows either a new op or "an explicit removal value on update_field" (`openspec/backlog_NN.md:241`), so the smallest form is not settled.
- Correction to my WP7: B10 (declare `review_gate` in `BP/changes/spec_NN.md` and delete the `:45` exemption) is **not a prerequisite**. The real coupling is the other way: the parity test (`changes-blueprint-text.test.ts:41-47`) requires every `CHANGE_OPS` entry except `review_gate` to appear in the blueprint `options::` list, so adding `remove_field` *forces* a `changes` blueprint edit and bump anyway. Batch B10 into that edit; it saves a second bump, it is not a dependency.
- Minimum action: one removal mechanism (op or explicit removal value), with serializer omitting the key, validation, audit record, rollback test. Acceptance (not run): a fixture model with a banned `sources::` repaired by one changeset; parity test green without exemption; one existing `update_field` test unchanged. Heavy lane (public op set).
- Uncertainty: op vs removal value; whether a one-off manual repair of `LC_programas` is cheaper (two reports only, both the maintainer's, issues #560/#614 not re-queried).

## D04 — QW-C6 (focus DeepSeek). Disposition: **reduce to a predicate repair; do not delete the gating**

- **R (this session):** `validateSceneKinds`/`validateLanguage` on a Scene with no `kind` and no language: pin `V_0-15-0` → `["missing-kind"]` / `"missing-language"`; `V_0-19-0` → `[]` / `null`; unpinned → `[]` / `null`; `V_0-14-0` → `[]` / `null`. An explicit unknown kind at `V_0-19-0` → `["unknown-kind"]`. So: **bypassed** = missing kind and missing language at any pin other than 0-15-0; **still running** = unknown-kind check for supplied values, and `assertProducible` (`ENG/lib/episode.mjs:128`) rejecting any pin ≠ installed (`blueprint_version: "V_0-19-0"`, `BP/coNNtent/spec_NN.md:9`). Sol's nuance holds; "all kind validation disabled" (original) is wrong.
- Correction of my first report: I called the gate "dead for every producible document" and proposed removing it plus the legacy exemption. True for `produce` (`pipeline.mjs:304` runs `assertProducible` first), but `lowerKnowledgeModel` (`ENG/scene-compiler.mjs:453-458`) is also imported by `asset-cost-estimator.mjs:15`, `synthesize-avatar.mjs:37`, `lib/compile.mjs:21`, `lib/review-subject.mjs:10`. Whether those paths pass through `assertProducible` is **U**; deleting the exemption could break legacy (unpinned) corpora the doc comment (`kinds.mjs:101-103`) promises keep compiling.
- Minimum action: `requiresKind = Boolean(pinned)` semantics (pinned = new-contract document; unpinned = legacy exempt) in both predicates, same bump. Acceptance (not run): the four probes above give `missing-*` for 0-15-0, 0-19-0 and 0-14-0 only if the policy says pre-0-15 pins are also bound (maintainer decision), unpinned stays exempt. Needs a `coNNtent` blueprint/skill bump and one run against a real coNNtent domain (not available to me).

## D05 — QW-E1/E2 (focus DeepSeek). Disposition: **E1 and E2 accept, smallest form; E5 reduce; no hashing subsystem**

- E1: banner and runtime identity are separate. Banner is already versioned (`scripts/lib/console-bundle.js:39-55`, `getConsoleReleaseInfo`); the runtime constant is a literal `'0.1.0'` (`BP/console/nn-runtime.js:17`) written into exported changesets (`:6598`, `:6603` `viewer: 'nn-console@' + CONSOLE_VERSION`, persisted provenance) and exported at `:8098`. `grep` shows no other source consumer. DeepSeek's N4 is the same defect as E1 (the original already said "derive at bundle build"); **N4 duplicates E1** and is a good implementation note: replace the literal inside `composeConsoleBundle`, no new injection path. Effect: new changesets record the real version; older ones keep `0.1.0`. Acceptance (not run): built bundle contains `CONSOLE_VERSION = '<package version>'`; `build-console-bundle.mjs --check` green after regen.
- E2: `export-console.mjs:482` requires `embedded.length === models.length`; `:1732-1748` appends a synthetic `<changes>` summary whenever changesets exist. Mechanism static (V), symptom reproduced by Sonnet earlier on a scratch fixture copy (I did not repeat it). Minimum: exclude the synthetic entry from the count (and from the per-model loop, which already tolerates it). Acceptance: second export of an unchanged fixture is `fresh`; one added changeset keeps it `fresh`.
- E5 (mtime, `:464-477`): only matters after checkout/copy; do after E2. **N2 duplicates E5.** Prefer comparing an identity already written, not new hashing.
- Uncertainty: E2 root cause is mechanism-level, not isolated by experiment.

## D06 — QW-C4/C5/R7 (focus Sol). Disposition: **C5 keep as diagnostic first; C4 reduce; R7 minimum only**

- C4 (V): `compareVersions` returns 0 for unparseable (`CORE/workspace/integrity/versionStatus.ts:101-107`) but the status path never yields `current` from it: `gapKind` returns `null`, so `status` falls to `unlisted` (`:276-281`). `changeset/history.ts:154-155`: malformed base gives `>= 0` → `stale: true` (fail-closed). `changeset/lineage/plan.ts:96-98` `isActionable` silently drops a malformed pin (already excluded as `unknown` upstream per its doc). No demonstrated wrong user-visible answer → my "silent wrong answers" is withdrawn. Action: one test per caller naming the malformed case; no grammar change (C8's `parseVersion` has different grammar; unify only after defining it).
- C5 (V): `MCP/tools/apply-change.ts:1684-1698` swallows `loadKnowledge` failure during `remove_element` impact scan, so deletion proceeds blind to that file. Whether unparseable files include harmless non-models is **U**. Minimum: collect unreadable files and return them named (warning); blocking is a second decision (Sol: block, naming the file; I accept as an option, not as default, because one junk file would then block every delete).
- R7: loader diagnostics and `isError` mapping are additive and independent; envelope/pipeline split stays out. `isError` appears at `server.ts:892` and `:1221` only (V, matches both peers; "three tools report failure as success" in DeepSeek is **I**).

## D07 — R1/R4/R6/R8–R11 (focus Sonnet). Disposition per item

- **R1**: Postpone everything except fixing real inconsistencies. `scripts/guard-template-immutability.js:300-317` forces a bump on any non-badge change; that preserves "same version = same bytes" for pins and write-once files. Counts since 2026-10-15 (R): 106 commits touched `BP/*/spec_NN.md`, 79 of them changed a version line, 35 `blueprints-v*` tags. That shows the guard is applied, not that prose bumps hurt: typo-only share unmeasured, and pre-commit regen automates the catalog. R1a (mine) and DeepSeek's `R1-minimal` both need a prose/schema classifier; Sol's point that agent-facing prose changes behavior is correct. Withdrawn. Trigger to revisit: a counted pile of prose-only bumps.
- **R2**: reduce to B10 + parity (D03). "Hardcoded twice" is wrong (`scripts/blueprint-catalog.mjs:61` 7 names vs `export-console.mjs:324` 3; all three reports agree).
- **R3**: keep bounded (D03). **R4**: reduce; reader removal only after R3 and corpora rebuild (`CORE/lineage/project.ts:347-349`); updater repin writes without a change record (`skills/nn-update/scripts/apply-update-plan.js:58-70,158-168`, reported by two of three; I re-read neither line range this round, **I**).
- **R5**: postpone; **R6**: postpone (package move needs a frozen-path exception, no defect); **R9**: postpone, deletions only (C9/H6 via D08 note below); **R10**: reduce to D11-lite protection; split of `SKILL.md` only where routing is reliable; **R11**: reduce, see D08 Windows.
- **R8**: keep core, but it is *already* backlog `procedure-reference-form`/`b3f` (`openspec/backlog_NN.md:268-280`, evidence `done_when` requires validator, stepper and procedure tests to agree). Not a new R-item. Runtime strips `[[ ]]` and `|`/`:` labels in `nn-runtime.js:606-616`. The 866 figure counts all `[[…]]` in 30 files, not invalid typed fields (Sol correct); migrate parsed fields, keep prose. Maintainer must choose the form first.
- **Compatibility rule**: published paths/stored data are not removed for lack of local refs (H10, root `iNNfo_V_*`/`*_V_0-3-0_NN.md`): all three agree.
- QW-H6 public exports: Sol's postpone is safer than Sonnet's "delete with tests" (in-repo-unused is not externally unused); QW-C9 (private chain) stays deletable after an export-boundary check.

## D08 — New proposals. Dispositions

| Proposal | Origin | Disposition |
| --- | --- | --- |
| Windows policy (N1) | DeepSeek | **Duplicate of QW-A5**, and already answered: `MCP/vitest.config.ts:8-14` says Windows is the platform, Linux "not targeted", tracked #122. Real gap: CI runs those two suites nowhere (all 8 jobs `ubuntu-latest`). Smallest: a non-blocking Windows step running only those two files, **or** an explicit accepted-gap line. Not a decision request. |
| Backlog checker (N3) | DeepSeek | **Reject (YAGNI)**. Manual reconciliation of the 3 stale items is XS; a script is a new gate. Reduce to a one-off cleanup (QW-F5/F3). |
| Content hashing (N2) | DeepSeek | **Duplicates E5**; see D05. |
| Local skill removal (NI-3) | Sonnet | Machine cleanup, not a repo change; keep out of the plan's repo items. Retired-skills list in the installer: only if a second case appears. |
| Tracker cleanup (NI-1) | Sonnet | **Duplicates F1/F3/F5**; maintainer-owned; closing #490/#565 needs one checked line each (see correction 7). |
| NI-2 (retire frozen console fixture) | Sonnet | **Duplicates A6**; merge. |
| SOL-N1 (`read_lineage` documented as mutating) | Sol | **Verified new, small**: `docs/documentation/content/reference/mcp-tools.md:55` vs `MCP/server.ts:668-675` (`readOnlyHint: true`, "Never writes files"). Merge into the QW-D docs batch; the "recorded changeset" sentence on the same line is the R4 updater issue, not a second item. |

## D09 — counts and status

- **Counts (R, recomputed from the original's table rows):** A 12, B 11, C 12, D 12, E 5 = **52**; F 7; H 10; G 0 listed (original line 191: "left out"). Total **69** IDs plus R1–R11. The original text (`2026-11-12-improvement-analysis.md:80-82`) says "52 quick wins in five groups, plus two lists … and ten small changes", so it is **not** self-contradictory. DeepSeek's "wrong by 17 / bookkeeping defect" is mistaken; my own "52 is inflated" referred to substance (cosmetic items), not arithmetic.
- **Per-report internal consistency:** Sonnet tally 53 C / 7 P / 5 R / 4 N and 39 Keep / 8 Reduce / 15 Postpone / 7 Drop both re-add from my matrix rows (V). DeepSeek is internally inconsistent: §2 says "8 resolved, 6 partly, 36 valid, 1 obsolete" of 52, its table says 56/4/3/0/6 of 69, its rows show 3 X, 4 P, 1 ND, 2 Unchecked; closing says "five new findings" but lists N1-N4; R tally 10+2=12 ≠ 11. Treat DeepSeek's headline numbers as unreliable and use row-level evidence.
- **Row disagreements to resolve by evidence, not vote:** A2 (Sonnet P/Drop, DeepSeek X, Sol P) → D02. F3 (Sonnet R, DeepSeek "engine writes assets/" V, Sol P): DeepSeek's claim is contradicted by `modelIdOf` and `layout.mjs`, but my "engine writes episodes/" is also unproven → treat as P. F5 (Sonnet R, DeepSeek P, Sol P) → P (residual stale entries). F4 resolved (all agree). D12 → Drop (correction 6). C6, A3, C4 → D01/D04/D06.
- **Remote facts:** none of #490/#560/#565/#614/#617 state, branch protection or `origin/dev` was queried by me; Sonnet's first report timestamped its `gh` reads on 2026-11-14, DeepSeek and Sol did not query. Local `git ls-remote`-style facts are not independently re-verified here. All F-group closings remain "unverified remote" until the maintainer or a live check confirms.

## Candidate first batch (not authorization; max 5, text-only or one-file)

1. QW-D2/D3/D4 (`skills/nn-innfo/SKILL.md:200,408,470,1042,172,860,864`): all three reports verified; skill patch release only.
2. QW-A7 (`scripts/regen.js:80` dead call; Sonnet reproduced exit 2).
3. QW-E1 (+N4 form) and QW-E2 as one console slice, with their two acceptance checks.
4. SOL-N1 doc fix plus QW-D7/D8 residual strings (re-grep before editing; D7 only `reviewer-guide.md:52` per Sonnet).
5. QW-A10/A11 (cap and address-module freshness entry), XS each.

Held out: QW-H3 (annotation change is an MCP tool-surface edit, heavy lane per `nn-dev-development` §2, though tiny); D03 `remove_field`; D04 predicate; D06 C5.

## Blockers to selecting the first batch

- None technical for items 1-5; I did not run their acceptance checks.
- Open maintainer decisions: `!` policy and 0.x major handling (D01); removal form for D03; whether pre-0.15 pins are bound by kind/language rules (D04); C5 warn vs block (D06); procedure reference form (D07/R8).
- Unverified by anyone: coNNtent blast radius on a real domain; whether other `lowerKnowledgeModel` callers bypass `assertProducible`; remote issue/protection state.

Path: `openspec/analysis/2026-11-14-cross-review-sonnet.md`. Model: Claude Sonnet 5.5 (`claude-sonnet-5-5`). Baseline: `f3348c162cfa2ecf2461a76a481e5903d63647ff`.
