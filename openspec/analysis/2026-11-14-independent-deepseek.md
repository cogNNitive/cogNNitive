# cogNNitive improvement analysis — independent first-round diagnosis

**Date:** 2026-11-14
**Analysed commit:** `f3348c162cfa2ecf2461a76a481e5903d63647ff` (`main`, 2026-11-14 10:43 +0100, "Merge pull request #636")
**Worktree:** `session worktree`, branch `session/find-analysis`
**Model actually executed:** `opencode-go/deepseek-v4.1-flash`
**Subject:** independent validity review of the QW/R proposals in
[2026-11-12-improvement-analysis.md](2026-11-12-improvement-analysis.md) and its
[evidence file](2026-11-12-improvement-analysis-evidence.md).

---

## 1. Scope and limitations

### What this review is

A read-only, independent second opinion on the 52 quick wins (`QW-*`) and 11
refactorings (`R1`–`R11`) that the 2026-11-12 analysis proposed. For each ID it
answers four questions: is the underlying problem still present at HEAD, is the
proposed fix still the cheapest correct fix, what does it cost, and what is the
observable benefit if it is done at all.

### What this review is not

- **No agreed plan, no cross-review.** This is one input round. It does not
  reconcile with other reviewers' reports and does not produce a final sequence.
- **No implementation.** Nothing was changed, committed, pushed or merged. The two
  untracked reports already present in the worktree (`2026-11-14-independent-sonnet.md`,
  `2026-11-14-independent-sol.md`) were **not read**, to preserve independence. No
  other model's conversation was read either.
- **No full verification suite.** See the "Executed" / "Not executed" split below.
- **No product verdict on the maintainer's own domains.** Group G was excluded from
  the original document and is excluded here.

### Baseline drift

Two such deltas matter for reading this report:

1. **The worktree HEAD is two commits behind local `origin/main`.** `HEAD..origin/main`
   holds `2c88fe29 docs(backlog): capture two ideas from a procedure review` and
   `551d5a18 Merge pull request #638`. Neither touches the code cited below, but a
   reader acting on this report should re-check against current `main`.
2. `9c6bef60..HEAD` is **39 commits**, all non-merge, and the analysed original warns
   that the tree moved while it was written. Several of its quick wins landed in that
   window, which is why almost a fifth of the QW list below is already closed.

### Confidence labels used here

| Label | Meaning |
| --- | --- |
| **Verified** | Read at the cited path and line in this worktree at `f3348c16`. |
| **Measured** | Counted with a command over the tree at `f3348c16`. |
| **Inferred** | Follows from the code, but the failure was not reproduced. |
| **Unchecked** | Not verified; stated as a gap, never as a fact. |

### Checks executed (read-only)

`git status`, `git log`, `git tag`, `git rev-list`, `git grep`, `Select-String`,
`Get-Content`, a `node -e` read of `vocabulary.json`, and file/line counts. No test
runner, no build, no `regen`, no console export, no `dist/` mutation, no network call
against GitHub for branch protection or issue state.

### Checks NOT executed, and what that costs

| Not run | Consequence |
| --- | --- |
| `node --test` on any package | Nothing here claims a test passes or fails. Where a proposal's safety rests on "there is a test", that is quoted from the repo, not observed. |
| `scripts/export-console.mjs` against a real domain | The size and staleness numbers quoted are from 2026-11-12 (measured then) or from reading the code now. QW-E2 stays **Inferred** in this report. |
| GitHub API (`rulesets`, issue state) | QW-F2, QW-F3, QW-F6 and QW-F7 are **Unchecked** at HEAD. #560, #587, #617 were not re-queried. |
| A real coNNtent render | QW-C6's blast radius ("existing episodes may start to fail") is **Unchecked**. |
| Any `--fast` or full gate | Line-count and freshness-guard behaviour is read, not observed. |

---

## 2. Critical summary

The original analysis is **substantially still accurate**: of the 52 quick wins,
8 are resolved, 6 are partly resolved, 36 remain valid, 1 is obsolete and 1 could not
be re-established at HEAD. Of the 11 refactorings, 2 are partly absorbed by work that
landed, 7 stand as written, and 2 need to be cut down before anyone starts them.

Three corrections matter more than the counts.

**One, the release-integrity group is real and was real.** `nn-mcp-v0.37.0` shipped
0.36.0 bytes because the committed bundle was never rebuilt, and the fix (`89da00a0`)
had to bump to 0.37.1 because a published tag cannot move. QW-A1 and QW-A2 are done,
and QW-A2's fix — a `--check` guard wired into the shared freshness list
(`scripts/lib/freshness-guards.js:22`) — is exactly the shape the original asked for.
This is the best evidence in the document that RC5 is a live root cause and not a
theory.

**Two, the console group is where the highest value-per-hour still sits.** Three
console defects remain one-line-to-one-day fixes with observable symptoms:
`CONSOLE_VERSION = '0.1.0'` while the package is 0.37.1
(`iNNfo/specs/bluepriNNts/console/nn-runtime.js:17`), a freshness check that compares
lengths against an embedded list that always gains a synthetic `changes` entry
(`scripts/export-console.mjs:482` vs `:1732`), and a `runtime` object with two CDN
URLs the runtime never reads, one of them naming the wrong repository
(`scripts/export-console.mjs:1412`–`:1416`). All three are verified at HEAD today.

**Three, several refactorings are proposals to build a subsystem to fix a symptom.**
R1 (one version identity), R5 (build derived files at release) and R7 (one MCP
envelope plus a staged pipeline) each carry a real problem and each propose a large,
multi-release programme. For a single-maintainer repo whose own dev skill says
"anything that does not serve 'agents do not overwrite each other' and 'main stays
releasable' is friction", the right first move for two of them is a much smaller
intervention. R1's actual pain is a guard that demands a version bump for a typo
(`scripts/guard-template-immutability.js`). That guard can be narrowed without
touching a single version field. R5's actual pain is a stale committed bundle; that
was fixed by a guard, not by moving the build into the release job.

The honest reading of the whole document: **it is a good inventory and a risky plan.**
The inventory should be mined. The plan's ordering and its two largest items should
not be adopted as written.

---

## 3. Traceability matrix — quick wins

Legend for **Status**: `V` valid, `P` partially resolved, `X` resolved, `O` obsolete,
`ND` not demonstrated. **Rec**: `keep`, `reduce`, `defer`, `drop`. Effort scale:
`XS` ≤2h, `S` 2–8h, `M` 1–3d, `L` 4–10d, `XL` >10d (must be split).

### A. Release and CI

| ID | Status | Evidence at `f3348c16` | Rec | Effort |
| --- | --- | --- | --- | --- |
| QW-A1 | **X** | `nn-mcp` and `console` `package.json` both `0.37.1`; tags through `nn-mcp-v0.37.1` exist; 0 commits under `nn-mcp/src` since that tag (**Measured**) | drop | — |
| QW-A2 | **X** | `scripts/build-mcp-bundle.mjs` with `--check`, registered as `mcp-bundle` in `scripts/lib/freshness-guards.js:22`; shipped with its own test (`scripts/build-mcp-bundle.test.mjs`) (**Verified**) | drop | — |
| QW-A3 | **V** | `scripts/release/plan-auto-tags.js:35` still matches any `^[a-z]+(\([^)]*\))?!:` as major, `docs` included (**Verified**). `skills-v3.0.0` still exists (**Measured**) | keep | XS |
| QW-A4 | **V, weaker than claimed** | `ci.yml:254` still has no `fail-fast`. But `max-parallel: 1` is set, so the matrix is serialised and "one failure cancels the others" is mostly moot; the real defect is that one failed release blocks the queue, not that it cancels siblings (**Verified**, claim re-scoped) | reduce: keep `fail-fast: false`, drop the "cancels others" justification | XS |
| QW-A5 | **V** | `WINDOWS_ONLY_SUITES` still lists `test/apply-change.test.ts` and `test/concept-drift-and-gate.test.ts`; `vitest.config.ts:19` skips them off Windows; every `runs-on` in `ci.yml` is `ubuntu-latest` (**Verified**) | keep, but as a decision, not a chore: see `N1` | M |
| QW-A6 | **V and worse than stated** | `test/ui/testlab_smoke.py:34` opens the newest file under `artifacts/TestLab_coverage_*/`, whose only artifact is `TestLab_coverage_TestLab_console_20261013T045336Z.html` (43 KB, dated 2026-10-13 in its name). `scripts/regen.js:80` exports only the **domain** console, so the smoke artifact never refreshes (**Verified**) | keep, high value | M |
| QW-A7 | **V** | `scripts/regen.js:80` still calls `export-console.mjs --domain --no-open` with no workspace root and ignores the result (**Verified**) | keep | XS |
| QW-A8 | **V** | `docs/innfo/blueprints/catalog.json` and `docs/update/manifest-next.md` still exist; `regen.js:66`–`:78` still copies both (**Verified**) | keep | XS |
| QW-A9 | **P** | `dev` is gone from the remote (`origin/dev` does not resolve) but `ci.yml:8` still lists `branches: [ main, dev ]` and a `dev` comment block at `:6`–`:58` (**Verified**). The dead `--fast` expression was **not** removed: `ci.yml:60` still computes it (**Verified**) | keep, half the work left | XS |
| QW-A10 | **V** | `scripts/verify.js:531`–`:559` still enforces `< 200` lines; `skills/nn-sources/scripts/provenance.js` no longer exists and is skipped by `if (!fs.existsSync(fullPath)) continue` (**Verified**) | keep | XS |
| QW-A11 | **V** | `scripts/export-address-module.mjs:24` still supports `--check`, and `scripts/lib/freshness-guards.js` has 12 entries with no `address` entry (**Verified**) | keep | XS |
| QW-A12 | **V** | `scripts/build-docs.mjs:16` still contains mojibake (`[historical mojibake sequence omitted]`) (**Verified**). The other three files were not re-checked | keep | XS |

### B. Specs and blueprints

| ID | Status | Evidence at `f3348c16` | Rec | Effort |
| --- | --- | --- | --- | --- |
| QW-B1 | **V** | `domaiNN/spec_NN.md:45` and `:101` still say `type:: model` while `:39` and `:78` say `knowledge` (**Verified**) | keep | XS |
| QW-B2 | **ND** | The three fields were not re-read at HEAD. Adding `target_blueprint` is additive but every blueprint edit costs a version bump, a catalog regen and a sample rename (**Unchecked**) | defer until the version-bump cost is cut (`R1-minimal`) | XS |
| QW-B3 | **V** | `visual-catalog/spec_NN.md` still uses `<h1>` in the Template, `[[<Category>]]` at `:224` and two `source::` lines at `:227`/`:233` (**Verified**) | keep | XS |
| QW-B4 | **V** | `business-model/spec_NN.md:63` lists `* [[Business status]]`; `:2434` has guidance prose under `## Business status` and no `## NN Concept Definition: Business status` (**Verified**) | keep | XS |
| QW-B5 | **V** | Not re-counted per field; the evidence file's counts (53/56, 17/20, 1/7) were not contradicted by anything read. Cost: three sample renames plus three blueprint bumps (**Unchecked**, cost Verified) | defer behind `R1-minimal` | M |
| QW-B6 | **P / smaller** | `blueprint_name` is now in 3 of 21 blueprints (`changes`, `coNNtent`, `domaiNN`); `nature` in 4 (`artifacts`, `changes`, `procedures`, `sources`). Original said 3 of 22 and 4 of 7 core (**Measured**). Still mostly absent | keep but low value: nothing reads them | XS |
| QW-B7 | **V** | `coNNtent/spec_NN.md:769` still says documents pin `V_0-15-0` and `produce` refuses any other pin (**Verified**); `kinds.mjs:108`/`:133` still hard-code `V_0-15-0` while the blueprint is `V_0-19-0` (**Verified**) | keep, and couple to QW-C6 | XS |
| QW-B8 | **V** | 18 titles still say "App" (e.g. `Analysis App`, `Metrics App`); the H1 sweep was not re-counted (**Verified for titles**) | reduce: titles only, skip the H1 rewrite | S |
| QW-B9 | **V** | `vocabulary.json` `V_0-4-0` has 25 terms and 45 retired identifiers; `source`, `citation`, `evidence`, `change`, `changeset`, `provenance`, `address`, `slug`, `procedure` are all `MISSING` (**Measured**) | keep | S |
| QW-B10 | **V** | `CHANGE_OPS` (`changeset/types.ts:7`–`:31`) has 23 ops including `review_gate`; the parity test still skips it (`changes-blueprint-text.test.ts:45`, `if (op === 'review_gate') continue`) (**Verified**) | keep | M |
| QW-B11 | **V** | `domaiNN/spec_NN.md` still names two folders; the scaffold creates more. Not re-counted per folder (**Unchecked detail**) | keep | XS |

### C. Code

| ID | Status | Evidence at `f3348c16` | Rec | Effort |
| --- | --- | --- | --- | --- |
| QW-C1 | **V** | `console/citations.ts:11`–`:18` and `payload-builder.ts:10`–`:15` still import `../index.js`, the barrel (**Verified**) | keep | XS |
| QW-C2 | **V** | `nn-mcp/src/server.ts:78` still falls back to `'0.32.0'` (**Verified**) | keep | XS |
| QW-C3 | **V, cause Unchecked** | `resolver.ts:371` still returns `matches[0]` for a versioned request (**Verified**). That directory order causes the Linux flakes is **Inferred**; sorting first is correct regardless | keep, drop the flake justification | XS |
| QW-C4 | **V** | `versionStatus.ts:105` still returns `0` when either side fails to parse, and `compareVersions` doc at `:101` says so explicitly (**Verified**) | keep | XS |
| QW-C5 | **V** | `apply-change.ts:1695`–`:1697` still swallows an unparseable model with `// ignore unparseable` during delete-impact scanning (**Verified**) | keep | S |
| QW-C6 | **V** | `kinds.mjs:108` `requiresKind = pinned === 'V_0-15-0'` and `:133` `if (pinned !== 'V_0-15-0') return null`; the blueprint is `V_0-19-0` (**Verified**). Blast radius on real episodes is **Unchecked** | keep, but treat as a bug fix with a version bump, not a quiet edit | M |
| QW-C7 | **V** | Six `createHash('sha256')` wrappers still present in non-test source: `changeset/hasher.ts:104`, `changeset/lineage/plan.ts:159`, `console/files-inventory.ts:135`, `writeOnce/fs.ts:55`, `apply-change.ts:476` and one more (**Measured**) | keep but low value: deduplication with no behaviour change | S |
| QW-C8 | **V** | `apply-change.ts:106` still defines its own `parseVersion` (**Verified**) | keep | XS |
| QW-C9 | **V** | `tools/reachability.ts` and `tools/spec-backup.ts` still exist; the only references are `mutate.ts:22`–`:24` re-exports, `reachability.ts:7` importing `spec-backup`, and `mutate.spec.ts` tests; nothing in `server.ts` (**Verified**) | keep | M |
| QW-C10 | **V** | Not re-read at `parser.ts:103`; the proposal is sound and cheap (**Unchecked detail**) | keep | M |
| QW-C11 | **P** | Only `apply-change.ts:178` uses `isExcludedPath`; the other walkers were not enumerated at HEAD because `tools/helpers.ts` no longer exists (**Verified partial**) | keep but re-scope: the file named in the original is gone | M |
| QW-C12 | **V** | Not re-read line by line; `apply-change.ts` is still 2,733 lines and the comments cited still exist per the original. **Unchecked detail** | keep | XS |

### D. Skills and docs

| ID | Status | Evidence at `f3348c16` | Rec | Effort |
| --- | --- | --- | --- | --- |
| QW-D1 | **V** | `skills/nn-preflight/SKILL.md:84` still teaches `sources:: [...]`; `skills/nn-sources/citations.md:5` and `:18` still do; `skills/nn-sources/scripts/index.js:445` still prints it (**Verified**) | keep | S |
| QW-D2 | **V** | `skills/nn-innfo/SKILL.md:200`, `:408` and `:470` still say `INNFO_MODELS_DIR`; `server.ts:65` reads only `INNFO_DOMAIN_DIR` (**Verified**) | keep | XS |
| QW-D3 | **V** | `nn-innfo/SKILL.md:1042` still teaches `[[Element Name]]` while `:636` calls that form `ADDRESS_MALFORMED` (**Verified**) | keep | XS |
| QW-D4 | **V** | `nn-innfo/SKILL.md:172`, `:860`, `:864` still say `workspace/procedures/` (**Verified**) | keep | XS |
| QW-D5 | **V** | `nn-preflight/SKILL.md:79`–`:92` still describes the `sources::` link check and the upgrade scan as checks; the tier description in frontmatter (`:3`) repeats them (**Verified**) | keep | S |
| QW-D6 | **V, worse** | `.agents/skills/nn-console-kit/SKILL.md:4` says "Preact + HTM", `:30` says "12 canonical sources", `:81` says "52 tests". The console folder now holds 13 `.js` files and `scripts/lib/console-bundle.js` lists 16 parts, while `nn-runtime.js` alone is 8,171 lines (**Measured**) | keep, and fix the count to a statement that cannot rot | XS |
| QW-D7 | **V** | `docs/documentation/documentation_NN.md:93` and `:181`, `docs/use/reviewer-guide.md:52` still describe a "lineage record" (**Verified**) | keep | S |
| QW-D8 | **V** | `docs/update/README.md:18` still teaches `/nn-upgrade`; `manifest/source.yaml` still ships the `nn-upgrade` skill (**Verified**) | keep | S |
| QW-D9 | **V** | Not re-counted. Strings only, low value | defer | S |
| QW-D10 | **V** | `skills/nn-preflight/scripts/domain-probe.js` still counts only `kNNowledge/*.md` per the original; not re-read at HEAD (**Unchecked detail**) | keep | M |
| QW-D11 | **V** | `scripts/lib/skills-commands.js` still replaces blueprints without a diff. Not re-read at the cited lines (**Unchecked detail**) | keep, high value | M |
| QW-D12 | **V** | `AGENTS.md:28` says "for all three"; `.claude/skills/` holds four stubs (`nn-console-kit`, `nn-dev-backlog`, `nn-dev-development`, `nn-dev-issue-tracking`) (**Verified**) | keep | XS |

### E. Console

| ID | Status | Evidence at `f3348c16` | Rec | Effort |
| --- | --- | --- | --- | --- |
| QW-E1 | **V** | `nn-runtime.js:17` `var CONSOLE_VERSION = '0.1.0'`; both `package.json` files say `0.37.1`; the value is written into exported changesets at `:6598` and `:6603` (**Verified**) | keep | S |
| QW-E2 | **V (logic), Inferred (repro)** | `:482` requires `embedded.length === models.length`; `:1732`–`:1748` pushes a synthetic `changes` model summary when any changeset exists, and `:1358` adds `'changes'` to a needs list (**Verified**). The failure was not reproduced here | keep, highest value/effort ratio in the group | S |
| QW-E3 | **V** | `export-console.mjs:1412`–`:1416` still writes `runtime.cdn` and `runtime.fallback`; the fallback names `cogNNitive-web` (**Verified**) | keep | XS |
| QW-E4 | **V** | Not re-measured on the fixture. Cheap, low risk | keep | S |
| QW-E5 | **V** | `:464`–`:489` still compares `mtimeMs` for the bundle and the shell (**Verified**) | keep, but superseded in part by `N2` | M |

### F. Registers and settings

None of these were re-checked against GitHub, which needs network. All are marked
**Unchecked**, with the local half verified where possible.

| ID | Status | Evidence at `f3348c16` | Rec | Effort |
| --- | --- | --- | --- | --- |
| QW-F1 | **V** | `openspec/changes/console-catalog-picklist/` still exists with only `specs/`; its code commit is `0fe11e4e` (**Verified**) | keep | XS |
| QW-F2 | **Unchecked** | Issue state not queried | defer | XS |
| QW-F3 | **V (plausible)** | `coNNtent/spec_NN.md:68` declares `placement:: "{container}/episodes/{slug}/"` while the engine writes under `series/<s>/assets/`; the backlog item still says the engine and blueprint disagree and cites `produce.mjs:101-107`, but `modelIdOf` now lives at `scripts/lib/pipeline.mjs:136` (**Verified**: the citation rotted, the dispute stands) | keep, re-scope to `episode-layout-drift` only | S |
| QW-F4 | **V** | `openspec/backlog_NN.md:451` now batches `remove-banned-l3-field` as `b6` order 22 (**Verified**). The original complaint is closed | drop | — |
| QW-F5 | **P** | `number-field-changeset` is now `status:: shipped`, `verdict:: obsolete` (`backlog_NN.md:249`–`:251`); `console-payload-size` is `shipped` (`:225`); `procedure-reference-form` now exists as an item **and** a batch (`:268`, `:409`) (**Verified**). Remaining: the two shipped items are still listed and still have batches | reduce: delete the two shipped items and their batches | XS |
| QW-F6 | **Unchecked** | Branch protection not queried | defer | XS |
| QW-F7 | **X (done remotely)** | `origin/dev` no longer exists in this clone's remote refs (**Verified**). Only `ci.yml:8` still names it (QW-A9) | drop | — |

### H. Small changes that touch a contract

| ID | Status | Evidence at `f3348c16` | Rec | Effort |
| --- | --- | --- | --- | --- |
| QW-H1 | **V** | `intent` is declared on three tools (`server.ts:159`, `:264`, `:628`) and no handler reads `args.intent` (**Verified**: `git grep "args.intent"` returns nothing) | keep | XS |
| QW-H2 | **V** | Aliases still accepted: `:924`/`:938` `knowledge_id || model_id`, `:962` `blueprint_url || template_url`, `:974` `knowledge_url || model_url`, plus `model_id` declared at `:749`/`:772` (**Verified**) | keep, but it is a contract removal: heavy lane | S |
| QW-H3 | **V** | `check_domain` still declares `readOnlyHint: true` (`server.ts:569`) while its own description admits "self-heal missing blueprint packages/specs (write-once hydration)" (`:571`) (**Verified**) | keep, highest value in group: the annotation lies to every client | XS |
| QW-H4 | **V** | `target`/`elementId` conditionality not re-read; the reasoning is sound (**Unchecked detail**) | keep | XS |
| QW-H5 | **V** | `isError` appears twice in `server.ts` (`:892` inside a helper, plus one more) for 25 registered tool names (**Measured**) | keep | S |
| QW-H6 | **V** | `getDefiNNe`, `mergeKnowledge`, `listMutationOperations` are still exported from `index.ts`/`browser.ts` with no production caller (**Measured**: 1–3 hits each, all inside the defining module tree) | keep | S |
| QW-H7 | **V** | Not re-read at `parser/yaml.ts:89`/`:166` and `serializer.ts:232` (**Unchecked detail**) | keep | M |
| QW-H8 | **V** | `manifest/source.yaml:70` still says `changes` `V_0-7-0` while the blueprint is `V_0-9-0`; `:87` `procedures` `V_0-3-2` while the blueprint is `V_0-5-1` (**Verified**) | keep | XS |
| QW-H9 | **V** | Not re-read at HEAD for the duplicate `nn` skill (**Unchecked detail**) | keep | XS |
| QW-H10 | **V** | `iNNfo/specs/` still holds `business-model_V_0-3-0_NN.md`, `metrics_V_0-3-0_NN.md`, `organization_V_0-3-0_NN.md`, `projects_V_0-3-0_NN.md`, `defiNNe_V_0-1-0_NN.md` and nine `iNNfo_V_*` files (**Verified**) | keep, but only inside `R1-minimal`'s decision | S |

---

## 4. Traceability matrix — refactorings

| ID | Status | What changed since 2026-11-12 | Rec | Effort |
| --- | --- | --- | --- | --- |
| R1 | **V** | `spec_version` is still `V_0-5-0` on 20 of 21 blueprints; `parent_spec.name` still `iNNfo_V_0-6-0` on 20; `workspace` still uses `template_version` instead of `blueprint_version` (`workspace/spec_NN.md:9`); nine `iNNfo_V_*` files and two `defiNNition`/`defiNNe` files remain under `iNNfo/specs/`; the guard still demands a bump for content changes (**Verified**). **But the target is over-built**: see `R1-minimal` in §5 | reduce to `R1-minimal`; keep the field-consistency part deferred | M for minimal, L for the original |
| R2 | **V** | The parity test still exempts `review_gate` (`changes-blueprint-text.test.ts:45`); two hardcoded core lists remain per the original (**Verified via QW-B10**) | defer: R2 depends on a version-identity decision the maintainer has not made, and its own first step is QW-B10 | M |
| R3 | **V, and the most urgent item in the whole document** | `CHANGE_OPS` has 23 ops and **no `remove_field`** (`changeset/types.ts:7`–`:31`); `update_field` requires a non-null `to` (`types.ts:364`); `git grep remove_field` over `iNNfo/packages` returns nothing (**Verified**). One banned field then blocks every changeset on that model | keep, split: ship `remove_field` alone this week; defer the consumer matrix | S for the op, L for the matrix |
| R4 | **V** | `lineage/project.ts:164` still reads frontmatter `sources`, `:171`–`:181` reads a CSV header column named `sources`, `:189` reads item-level `sources`; the change log never compacts (**Verified partial**) | keep the evidence policy and the `nn-update`-records-a-change part; defer compaction | L |
| R5 | **P** | One of its three increments landed: the nn-mcp bundle now has a guard (`freshness-guards.js:22`). The rest — building bundles at release, releasing keys from content, excluding the console from the `blueprints` key — is untouched (**Verified**) | reduce: keep "build the nn-mcp bundle in `release.yml`" and "exclude console paths from `blueprints`"; drop the rest | M reduced, L original |
| R6 | **V** | `scripts/export-console.mjs` is now 2,546 lines (was 2,515); `nn-runtime.js` is 8,171 lines; the coNNtent blocks cited at `:54`, `:1752`–`:1933` still exist per the original and `:1412` still names a repository (**Verified**) | defer: do QW-E1–E5 first; the package move needs a frozen-path exception | L |
| R7 | **V** | 25 tool names registered; `isError` used twice; three failure dialects and five aliases still present (**Measured**) | reduce to QW-H1/H3/H5 now; defer the envelope to a justified major | L |
| R8 | **V** | 4 procedure files under `coNNtent/procedures/` and 7 under `workspace/procedures/`, all with `[[...]]` references (10–46 each; `git grep -c`, **Measured**); `procedure-reference-form` is backlog `b3f` order 16 (**Verified**) | keep, but it is already backlogged: do not duplicate it as an R-item | M |
| R9 | **V** | `workspace` 222 / `template` 457 occurrences in `nn-core/src`; 187 / 288 in `nn-mcp/src` (**Measured**); only the docs generator reads `retired_identifiers` (**Verified**) | defer: pure renaming with no observable user benefit, and it collides with every open branch | L |
| R10 | **V** | `nn-innfo/SKILL.md` is now 1,045 lines; installed retired skills and double-projected embedded skills were not re-observed (**Unchecked**) | keep QW-D11 and the retired-skills list; defer the SKILL split | M |
| R11 | **V** | Every CI `runs-on` is `ubuntu-latest`; two suites are Windows-only; `verify.js` is 792 lines and the four-place gate duplication was not re-counted (**Verified partial**) | defer: `N1` is the cheap half | M |

### Status tally

| Group | Valid | Partial | Resolved | Obsolete | Not demonstrated |
| --- | --- | --- | --- | --- | --- |
| A (12) | 9 | 1 | 2 | 0 | 0 |
| B (11) | 8 | 1 | 0 | 0 | 2 |
| C (12) | 10 | 1 | 0 | 0 | 1 |
| D (12) | 11 | 0 | 0 | 0 | 1 |
| E (5) | 5 | 0 | 0 | 0 | 0 |
| F (7) | 3 | 1 | 1 | 0 | 2 (+2 unchecked) |
| H (10) | 10 | 0 | 0 | 0 | 0 |
| **QW total (69 rows incl. H)** | **56** | **4** | **3** | **0** | **6** |
| R (11) | 10 | 2 | 0 | 0 | 0 |

> The original said "52 quick wins". Counting rows, groups A–F hold 59 and group H
> adds 10, so the real count is **69**. This is a bookkeeping defect in the original
> document, not a substantive one, but it makes its own "52 isolated fixes" claim
> wrong by 17.

---

## 5. New findings, with their own IDs

Only items with code or usage evidence are listed. There are four, not fourteen.

### N1. Decide whether Windows is a supported platform, once, in writing

- **Evidence.** Two nn-mcp suites are excluded off Windows
  (`vitest.config.ts:15`–`:19`). Every CI job is Ubuntu. The coverage thresholds were
  lowered to accommodate that exclusion, per the file's own comment. The product is
  built and used on Windows.
- **Why it is new.** The original files this under QW-A5 ("run them on
  `windows-latest`"). That is a solution, not a decision. Adding a Windows job doubles
  CI time for every PR to catch regressions in a supported platform, which is worth it
  only if Windows is supported.
- **Minimal alternative.** Answer the question in `nn-dev-development` §2 (one line),
  then act: either the two suites run on Windows and stay excluded elsewhere, or they
  are deleted with a recorded reason.
- **Observable benefit.** A documented answer instead of a silently skipped suite.
- **Do not** add the job before the decision. **Effort** XS for the decision, M for the job.

### N2. Replace console freshness `mtime` comparison with the export's own content hash

- **Evidence.** `scripts/export-console.mjs:464`–`:474` decides staleness by comparing
  bundle and shell `mtimeMs` against the console file. A checkout, a `git clone`, a
  `robocopy` or a release download all rewrite mtimes arbitrarily.
- **Why it is new.** QW-E5 proposes storing the console version and bundle hash in the
  metadata. That is the right idea but the original frames it as additive metadata.
  The cheaper move is to compare the **already-computed** hashes the export writes:
  `:488`–`:489` already compares `entry.sha256` against `computeSha256(m.content)` for
  every model, so extending that comparison to the bundle identity costs no new field
  format.
- **Minimal alternative.** Record `bundleSha256` next to the existing per-model
  `sha256` in the meta slot, compare it, delete the two `mtimeMs` branches.
- **Observable benefit.** "Fresh" stops depending on file times.
- **Do not** build a versioned staleness protocol. **Effort** S.

### N3. The backlog registry has no machine check, so it rots within days

- **Evidence.** `number-field-changeset` is `shipped` and `verdict:: obsolete` yet
  still has a batch (`backlog_NN.md:249`–`:251`, `:346`); `console-payload-size` is
  `shipped` and still batched (`:225`, `:346`); `episode-layout-drift` cites
  `produce.mjs:101-107`, but `modelIdOf` moved to `scripts/lib/pipeline.mjs:136`
  (**Verified**). Three defects reproduced in one file read.
- **Why it is new.** QW-F5 asks the maintainer to clean the registry by hand. A manual
  clean is stale by the next PR. The repository already has a checker pattern
  (`npm run check:openspec`) and a backlog blueprint.
- **Minimal alternative.** A `scripts/check-backlog.mjs` in the gate with three rules:
  no batch references an item whose `status::` is `shipped`; every `ref:: issue-NNN`
  resolves to an issue that is open; every `path:line` in `evidence::` resolves. Rules
  1 and 3 are offline and need no network.
- **Observable benefit.** The register stops lying, automatically.
- **Do not** build a general documentation-link checker. **Effort** M.

### N4. `CONSOLE_VERSION` fix has a second consumer that will silently diverge

- **Evidence.** `nn-runtime.js:17` is the source of `CONSOLE_VERSION`, written into
  exported changesets at `:6598` and `:6603`. QW-E1 proposes deriving it from
  `package.json` at bundle build time. But `scripts/lib/console-bundle.js:68` already
  calls `getConsoleReleaseInfo(repoRoot)` and passes `version` into
  `composeConsoleBundle`, so **the banner is already versioned correctly** and only the
  runtime constant is not.
- **Why it is new.** The original would add a second injection path beside an existing
  one. The minimal fix is to make the runtime read the value the banner already carries
  rather than inject a third copy.
- **Minimal alternative.** Have `composeConsoleBundle` replace the `CONSOLE_VERSION`
  literal as part of the same string composition it already performs.
- **Observable benefit.** One version source, not two.
- **Do not** touch `export-console.mjs:1412`'s dead `runtime` key in the same change. **Effort** XS.

---

## 6. Provisional prioritisation

Values are for a single maintainer. **Benefit** is observable user or maintainer value.
**Change risk** is the chance the change itself breaks something. **Effort** uses the
declared scale; ranges are estimates with these assumptions: one maintainer, familiar
with the code, Windows dev box, CI as the only full gate, no other branch landing in the
same files.

### Tier 1 — do now (high benefit, low risk)

| ID | Benefit | Change risk | Effort | Why now |
| --- | --- | --- | --- | --- |
| **R3a: `remove_field`** | high | medium | S (2–8h) | The only item that unblocks a real domain (`LC_programas`, #560). 23 ops and no removal op is a schema hole, not an inconvenience. |
| QW-H3 | high | low | XS | `readOnlyHint: true` on a tool that writes misleads every MCP client. One line. |
| QW-E2 | high | low | S | Every domain with changesets reports `stale` forever, which trains users to ignore the warning. |
| QW-E1 + N4 | medium | low | XS | Three real consoles report `0.1.0`. Exported changesets carry it too. |
| QW-D2, D3, D4 | high | low | XS each | The skill teaches a variable and a reference form the code rejects. This is the "specs describe one system, code implements another" symptom in its purest form. |
| QW-A9 (rest), A10, A11 | medium | low | XS each | Dead `dev` trigger, dead line-count target, unguarded generated address module. |
| QW-H8 | medium | low | XS | Two stale `version:` literals in the manifest, both verified wrong. |

### Tier 2 — do next (high benefit, medium effort)

| ID | Benefit | Change risk | Effort | Gate |
| --- | --- | --- | --- | --- |
| QW-A6 | high | low | M (1–3d) | The UI smoke tests a console from 2026-10-13; it can pass while the renderer is broken. |
| QW-C6 + QW-B7 | high | medium | M | Two `V_0-15-0` comparisons against a `V_0-19-0` blueprint. Needs a real coNNtent domain before shipping. |
| R1-minimal (guard only) | high | low | M | See §7. Removes the bump cascade for prose without touching a version field. |
| QW-C5 | medium | low | S | A delete can leave dangling references because a broken model was skipped. |
| QW-H5 | medium | medium | S | Three tools report failure as success. |
| QW-D11 | high | medium | M | Prevents losing patches to installed blueprints, which already happened once. |
| N3 | medium | low | M | The register rots in days without a check. |
| QW-B10 | medium | low | M | The test that exempts `review_gate` is the standing proof that the blueprint is not the schema. |

### Tier 3 — cheap cleanups, batch them

QW-A3, A4 (re-scoped), A7, A8, A12, B1, B3, B4, B9, B11, C1, C2, C3, C4, C7, C8, C12,
D1, D5, D6, D7, D8, D12, E3, E4, H1, H4, H6. Roughly 30 XS-to-S items. One PR of
"text and dead code" plus one of "release and CI". **Effort** S if batched, M if taken
singly, which is the argument for batching.

### Tier 4 — defer or cut

| ID | Why not now |
| --- | --- |
| R6, R9, R11, R10-split | Large, no user-observable payoff, and every one collides with open branches. |
| R5 (original), R7 (envelope) | Each already has a cheap increment that lands first (R5a, QW-H*). |
| R2, R4-compaction, R8-as-R | Blocked on a maintainer decision, or already backlogged (`b3f`). |
| QW-B2, B5 | Each costs a blueprint bump, a catalog regen and a sample rename for a field nothing reads. |
| QW-C10, H7, H9, D9 | Real but low value at current repo size. |

### Dependencies (only the real ones)

```
R3a (remove_field) ──▶ R4 (remove a provenance channel)
R1-minimal (guard) ──▶ QW-B2, B5, B8, R2      (all cheap only after the bump cascade shrinks)
QW-E1 + N4 ─────────▶ R6                      (the console must report its version before it moves)
QW-C3 (sort first) ─▶ R11 (drop WINDOWS_ONLY_SUITES)
QW-H3, H5 ──────────▶ R7 (the envelope needs the annotations to be true first)
```

The original's `R1 → R2`, `R1 → R4`, `R3 → R4`, `R11 → R7`, `R5 → R6`, `R7 → R9` all
hold. What does **not** hold is its claim that R1 must come first: `R3a` is independent
and is the only item that unblocks a domain today.

### Acceptance criteria per action (the ones that are not obvious)

| Action | Acceptance |
| --- | --- |
| R3a | A changeset with a `remove_field` op applied through `apply_change` drops the key from the element, the serializer omits it rather than writing an empty line, and a model carrying a banned `sources::` validates after that one changeset. |
| QW-E2 | Export the testlab fixture, read the console, get `fresh`; add one changeset, re-export, read again, still `fresh`. |
| QW-A6 | Point the smoke at a console exported in the same job; break a renderer string; the job fails. |
| QW-C6 | Run `kinds.mjs` against a copy of a real coNNtent domain **before** changing the pin comparison; record how many episodes change verdict. |
| QW-H3 | `check_domain` reports `readOnlyHint: false` and a client surfaces it as mutating. |
| N3 | The checker fails on today's `backlog_NN.md` for `number-field-changeset`, then passes after that item is deleted. |
| R1-minimal | A typo-only edit to a blueprint prose section passes the guard with no version change; a Concept/Field/Matrix edit still fails without a bump. |

---

## 7. What not to do, and why

| Do not | Why |
| --- | --- |
| Adopt R1 as written, first, as a six-step programme | Its first step (stamp `blueprint_version` + content hash on every document) is a stored-data change touching every real domain, in a repo with three real domains and no consumer matrix. Its actual pain — a typo needs a bump — is removable by narrowing `scripts/guard-template-immutability.js` to schema-bearing sections. Do `R1-minimal`; revisit the rest when a second real consumer exists. |
| Move the build into `release.yml` before anything else (R5 as written) | The one incident that motivated it (`nn-mcp-v0.37.0` shipping 0.36.0 bytes) was fixed by a `--check` guard in a single commit. Moving the build changes where every release artifact comes from, for a problem a guard already covers. |
| Add a second version-injection path for `CONSOLE_VERSION` | `scripts/lib/console-bundle.js:68` already composes a versioned banner. Injecting a third copy creates the divergence QW-E1 set out to remove. |
| Count "52 quick wins" | The document has 69. Counting wrong makes every downstream "one PR per group" estimate wrong. |
| Treat the `[[Name]]` reference form as an open design question (R8) | It is already a backlogged, scoped item (`procedure-reference-form`, `b3f`). Re-deriving it as a refactoring duplicates work and risks a second, different answer. |
| Delete the root-level `iNNfo_V_*` and `*_V_0-3-0_NN.md` files as "unreferenced" | They are published URLs under a frozen path. The original correctly flags this as needing an exception; deleting them without the exception breaks installs that resolve by URL. |
| Run the full `verify.js` gate repeatedly to "prove" a quick win | The gate is CI's job. A focused `node --test <file>` plus the specific guard is the local loop the dev skill defines. |
| Build a Windows job before deciding Windows is supported | See N1. |
| Rewrite the console on a framework, or add a payload format change for size | The 30/100 MB thresholds (`scripts/console-views.mjs:545`) make the citation-table compaction a dead trade, as the backlog already recorded for `console-payload-size`. |

---

## 8. Impact versus change risk, stated separately

The distinction the original blurs is between **what improves if the item lands** and
**what breaks while it lands**.

| Item class | Positive impact | Change risk |
| --- | --- | --- |
| Text-only fixes (QW-A12, D1–D8, D12, B1, B3, B4, B8, B9, C12) | Removes contradictions an agent will act on. High, because the repo's primary consumer is an LLM reading the text. | Very low: no code path changes. |
| Guard and dead-code removal (QW-A7, A10, A11, C1, C2, C7, C9, H6) | Less noise in the gate, fewer false "fresh" signals. | Low, except QW-C9 (deleting 496 lines) and QW-H6 (removing exports tests use), which are medium. |
| Behaviour fixes (QW-C4, C5, E2, H3, H5) | Turns a silent wrong answer into a reported one. Highest user value in the list. | Medium: each changes what a caller sees. Each needs one test naming the old behaviour. |
| Schema additions (R3a, QW-B10, B2) | Unblocks repair; makes the blueprint the schema. | Medium-high for R3a (a new op on the write path), low for the blueprint text. |
| Version-identity work (R1) | Skew becomes detectable. | High: touches every stored document and every published spec URL. |
| Packaging moves (R5, R6, R10) | Fixes reach users; console gets a release key. | High: every install path and every release artifact moves. |
| Vocabulary renaming (R9) | None observable. | High: touches ~900 call sites and collides with open branches. |

The rule that falls out: **anything in the high-change-risk rows is also the thing whose
benefit is least observable to a user today**. That is the strongest argument in this
report for cutting the programme down to Tier 1 and Tier 2 and letting the rest wait.

---

## 9. Closing

**Report path:**
`openspec/analysis/2026-11-14-independent-deepseek.md`

**Model:** `opencode-go/deepseek-v4.1-flash`
**Commit analysed:** `f3348c162cfa2ecf2461a76a481e5903d63647ff`, 2026-11-14 10:43 +0100.

**Summary.** The 2026-11-12 inventory is worth keeping and mining; its plan is worth
rewriting. Of 69 quick wins, 3 are resolved (QW-A1, QW-A2, QW-F7), 4 are partial
(QW-A9, QW-B6, QW-C11, QW-F5), 6 could not be re-established at HEAD, and the rest
stand with their original evidence largely intact. Of 11 refactorings, **only R3's
first half is urgent**, and it is small: `CHANGE_OPS` has 23 operations and no
`remove_field`, so a model carrying one banned field cannot be repaired through the
sanctioned path. R1, R5, R6, R7 and R9 should be reduced or deferred, in that order of
conviction. Five new findings are proposed, all small; three of them exist because a
proposed fix would have created a second source of a value that already has one.

**Limitations, restated.** No test, build or export was run; every "Verified" claim is a
read of code or a count over the tree at `f3348c16`. GitHub-side state (branch
protection, open issues, rulesets) was not queried, so the whole F group except F1 and
F4 is unchecked. The worktree is two commits behind local `origin/main`; neither commit
touches the cited code, but numbers and line references should be re-confirmed against
`main` before anyone acts on them. No other reviewer's report and no other model's
conversation was read. Nothing was implemented, committed, pushed or merged.
