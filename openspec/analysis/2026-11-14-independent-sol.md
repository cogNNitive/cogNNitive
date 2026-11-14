# Independent improvement diagnosis — gpt-6.1-sol

Date: **2026-11-14**, Europe/Berlin. Actual executed model: **gpt-6.1-sol**, through the Codex harness in T3 Code.

Reviewed HEAD: **f3348c162cfa2ecf2461a76a481e5903d63647ff**, commit date `2026-11-14T10:43:15+01:00`. Worktree: `session worktree`; branch `session/find-analysis`.

This is an independent first-round diagnosis, not a cross-review, implementation authorization or agreed delivery plan.

## Scope and limits

I read both original November 12 analysis documents, the current backlog, the sole active change (`console-catalog-picklist`), and current code, tests and published specifications associated with the proposals. Archived OpenSpec text was not used as authority. The operative evidence is current implementation/tests, published specifications under `iNNfo/specs/`, and repository development instructions.

I read positions 8 and 9 of the prior [Codex assessment](t3-thread://v2/d16c9b46-3efa-4698-ba5b-ba74bf138abd/import:codex:01a1d138-3692-7140-a756-4ee02773d27c) in full and only the opening request/metadata of the [Claude origin](t3-thread://v2/d16c9b46-3efa-4698-ba5b-ba74bf138abd/import:claudeAgent:2655c921-5396-46ce-82f3-cef625ef1904). Neither is a current verification result. I did not read other models' new independent reports or conversations. No subagents were used.

Evidence labels: **V** = verified in current source/configuration/text; **R** = directly reproduced here; **I** = inferred effect requiring acceptance validation; **U** = unchecked/not demonstrated. Static evidence of a branch is not automatically proof of a production failure.

All citations below use current worktree lines. Prefixes: `CORE` = `iNNfo/packages/nn-core`; `MCP` = `iNNfo/packages/nn-mcp`; `BP` = `iNNfo/specs/bluepriNNts`; `ENGINE` = `BP/coNNtent/skills/nn-conntent`. Paths otherwise start at the worktree root.

Checks run: git status/HEAD/date, targeted searches and UTF-8 reads, small file inventories, `node scripts/build-mcp-bundle.mjs --check`, and in-memory calls to `validateSceneKinds`/`validateLanguage`. The first inline Node attempt failed on PowerShell quoting; the corrected stdin invocation succeeded. No full suite, build, regeneration, browser, render, installation, release dispatch or shared junction mutation was run. Private domaiNN data, current remote issue bodies, branch protection and published release status were not audited. No fetch was run; local remote-tracking refs cannot establish current remote state. The only intended write is this report.

The supplied original enumerates **69 QW IDs** (A12+B11+C12+D12+E5+F7+H10) and **11 R IDs**. Its “52 quick wins” describes A–E only. Group G has no assessable IDs in the supplied copy. Every assessable ID is retained below.

## Critical assessment

The inventory contains useful concrete contradictions. It does not establish that seven causes explain almost every defect, or that a version-identity migration must precede most useful work. The strongest candidates are bypassed validation, incomplete destructive impact scans, misleading MCP failure/side-effect reporting, contradictory authoring guidance, the missing review_gate declaration, and installer protection for local edits. Each has an observable outcome without a system-wide migration.

Some historical premises have changed: MCP is **0.37.1** (`MCP/package.json:3`); a bundle version guard exists and passes (`scripts/lib/freshness-guards.js:22`); #617/#587 have backlog entries and field removal has a batch (`openspec/backlog_NN.md:243,268,280`); size degradation is shipped (`:221`); episode identity recognizes `episodes/` (`ENGINE/scripts/lib/pipeline.mjs:136`). These need reconciliation, not reimplementation.

Important corrections:

- **R:** The same empty Scene at V_0-15-0 produces missing-kind and missing-language diagnostics; at V_0-19-0 it produces `[]` and `null`. This proves the missing-field bypass. An explicitly supplied unknown kind still fails (`ENGINE/scripts/lib/kinds.mjs:108,120,133`); saying all kind validation is disabled overstates it.
- **V:** `compareVersions` returns zero for malformed input, but the full status calculation also uses gapKind and falls back to unlisted (`CORE/src/workspace/integrity/versionStatus.ts:102,276`). “User sees current” remains unproven.
- **V:** MCP bundle checking compares announced version and rejects split imports, not source correspondence (`scripts/build-mcp-bundle.mjs:62,76`). A matching version is weaker than freshness.
- **V/I:** target_blueprint constrains a referenced document's parent (`CORE/src/validator/references.ts:253`). Artifact models may use different bluepriNNts; the domaiNN inventory points at Level 2; source_model describes a sidecar. Blanket constraints are not automatically safe.
- **V:** An explicit breaking marker is honored regardless of commit type (`scripts/release/plan-auto-tags.js:34`). Ignoring docs/skill breaking markers can hide actual contract changes.
- **V:** Preflight already runs catalog upgrades and distributed-aware audit (`skills/nn-preflight/scripts/preflight-check.js:1264,1302`). Its old Tier 2 instructions remain wrong; “upgrade scan absent” does not hold.
- **V:** The iNNfo canonical Definition form includes description (`iNNfo/specs/iNNfo_V_0-7-0_NN.md:389`). Reusing it cannot make all prose version-free; agent-facing prose can itself change behavior.
- **I/U:** Small crypto wrappers and walkers with different query semantics are not automatically harmful duplication. No fresh latency measurement supports wholesale consolidation or log compaction.

## QW traceability matrix

States: **current**, **partially resolved**, **resolved**, **obsolete**, **not demonstrated**. Dispositions: **keep**, **reduce**, **postpone**, **discard**. Resolved refers to the local gap, not proof of remote publication. P codes identify scoped actions and acceptance criteria below. A dash means no implementation justified now.

### A — Release and CI

| ID | State / confidence | Disposition; minimum useful scope | Current evidence / action |
|---|---|---|---|
| QW-A1 | obsolete V; publication U | Discard literal 0.36.1 request; establish an actual unpublished fix before another bump. | `MCP/package.json:3` is 0.37.1; — |
| QW-A2 | partially resolved V/R | Reduce: existing version guard passes. Enforce it at the release boundary; demonstrate same-version stale code before adding stronger freshness. | `scripts/lib/freshness-guards.js:22`; `scripts/build-mcp-bundle.mjs:62`; `scripts/release/run-release.js:106`; P6 |
| QW-A3 | current implementation V; defect U | Discard commit-type allowlist. Correct accidental breaking classification rather than ignoring explicit markers. | `scripts/release/plan-auto-tags.js:34`; — |
| QW-A4 | current V; cancellation effect I | Keep fail-fast:false and failure-isolation check. max-parallel:1 does not disable fail-fast. | `.github/workflows/ci.yml:254`; P6 |
| QW-A5 | current V | Keep Windows execution of both excluded suites; non-blocking only as temporary bootstrap. | `MCP/vitest.config.ts:9,15,39`; `.github/workflows/ci.yml:26`; P7 |
| QW-A6 | current V | Keep same-checkout console export and console-source path triggers for smoke. | `test/ui/testlab_smoke.py:34`; `.github/workflows/ci.yml:281,299`; P7 |
| QW-A7 | current V | Keep removal of ignored export or supply fixture root and check exit status. Prefer removal until current-export test owns it. | `scripts/regen.js:79`; P8 |
| QW-A8 | current V; byte identity not remeasured | Reduce: remove tracked build copies after direct-consumer check. Site catalog now computes release tags rather than merely copying bytes. | `scripts/regen.js:66`; `scripts/build-docs.mjs:45,56,66`; P8 |
| QW-A9 | partially demonstrated V/U | Remove unreachable session-push expression; postpone dev-trigger deletion until live consumers checked. | `.github/workflows/ci.yml:8,57,60`; P8 |
| QW-A10 | current V | Keep removal of arbitrary cap/dead target. Line count is not a correctness criterion. | `scripts/verify.js:531,541,548`; P8 |
| QW-A11 | current V | Keep existing address --check while artifact remains committed. Bundle check only sees generated input. | `scripts/lib/freshness-guards.js:13`; `scripts/lib/console-bundle.js:15`; `scripts/export-address-module.mjs:24,56`; P8 |
| QW-A12 | current V; low impact | Keep opportunistically, without release redesign. | `scripts/build-docs.mjs:16`; `scripts/build-preflight-primitives.mjs:12`; `scripts/stage-mcp-bundle.mjs:9`; `scripts/verify.js:298`; P9 |

### B — Published bluepriNNts and vocabulary

| ID | State / confidence | Disposition; minimum useful scope | Current evidence / action |
|---|---|---|---|
| QW-B1 | current V | Keep canonical spelling when revising domaiNN; include table. Accepted alias does not demand standalone migration. | `BP/domaiNN/spec_NN.md:45,101,148`; P9 |
| QW-B2 | not demonstrated V/I | Reduce to defining each actual target contract. Do not add all three arbitrary constraints. | `BP/artifacts/spec_NN.md:62`; `BP/sources/spec_NN.md:103`; `BP/domaiNN/spec_NN.md:99`; `CORE/src/validator/references.ts:253`; P10 |
| QW-B3 | current V | Keep valid example: H2 elements, frozen slugs/addresses, evidence through a change. Remove banned source fields; headings alone insufficient. | `BP/visual-catalog/spec_NN.md:222,224,227,229,233`; `CORE/src/validator/knowledge-checks.ts:403`; P3/P9 |
| QW-B4 | current V | Keep removing dangling index entry unless a real consumer needs a concept. Guidance is not its definition. | `BP/business-model/spec_NN.md:63,2434`; P9 |
| QW-B5 | current V; counts rechecked | Reduce to useful descriptions. Still missing: innovation 53/56, projects 17/20, organization 1/7. Avoid filler. | First missing: `BP/innovation/spec_NN.md:67`, `BP/projects/spec_NN.md:98`, `BP/organization/spec_NN.md:91`; P9 |
| QW-B6 | current V; benefit I | Postpone blanket optional metadata completion; add only for an identified consumer. | `BP/blank/spec_NN.md:2`; `BP/sidecar/spec_NN.md:2`; domaiNN already names itself at `BP/domaiNN/spec_NN.md:9`; P10 |
| QW-B7 | current V | Keep with predicate repair; explain compatibility instead of another short-lived version literal. | `BP/coNNtent/spec_NN.md:768`; actual declaration `:9`; P1 |
| QW-B8 | current V; compatibility I | Reduce to display terminology in files already revised. Avoid title-only release/sample cascade. | `BP/analysis/spec_NN.md:9`; `BP/procedures/spec_NN.md:9`; P9 |
| QW-B9 | current V; scope I | Keep terms that resolve real ambiguity, without new grammar. Exact proposed keys absent; lineage/artifacts already exist. | `iNNfo/specs/vocabulary.json:1`, terms inventory inspected; P9 |
| QW-B10 | current V | Keep review_gate declaration, allowed keys/evidence exception and exact op parity. Audit frontmatter keys separately. | `CORE/src/changeset/types.ts:30,92,174,515`; `BP/changes/spec_NN.md:40,170`; `CORE/tests/changeset/changes-blueprint-text.test.ts:45`; P4 |
| QW-B11 | current V | Keep concise folder guidance; distinguish required conventions from optional workflow folders. | `BP/domaiNN/spec_NN.md:151`; `CORE/src/scaffold/domain.ts:13`; P9 |

### C — Core, MCP and engine

| ID | State / confidence | Disposition; minimum useful scope | Current evidence / action |
|---|---|---|---|
| QW-C1 | current V; consequence I | Keep direct leaf imports. Do not claim only runtime cycle without fresh graph analysis; type-only imports differ. | `CORE/src/console/citations.ts:4,11`; `CORE/src/console/payload-builder.ts:5,10`; P8 |
| QW-C2 | current V | Keep truthful fallback or fail on missing injection; preserve supported test/source startup. | `MCP/src/server.ts:71,78`; `MCP/vitest.config.ts:22`; P4 |
| QW-C3 | current V; flake cause U | Reduce: define duplicate pinned-match precedence, then deterministic order. Alphabetical first need not be semantically correct. | `CORE/src/resolver.ts:365,371`; P7 |
| QW-C4 | current helper V; output claim unproven | Reduce to malformed-version caller tests and explicit unknown semantics; audit exported helper callers. | `CORE/src/workspace/integrity/versionStatus.ts:102,254,276`; P10 |
| QW-C5 | current V; dangling-delete outcome I | Keep fail closed for destructive impact analysis, naming unreadable candidate. Avoid global optional-asset blockers. | `MCP/src/tools/apply-change.ts:1684,1695`; P2 |
| QW-C6 | current V/R | Keep compatibility-aware required-kind/language rule. Replacing 0.15 with 0.19 repeats defect at next bump. Unknown supplied kind already fails. | `ENGINE/scripts/lib/kinds.mjs:107,120,132`; P1 |
| QW-C7 | wrappers current V; harm U | Postpone. Shared helper only if meaningful policy duplication is removed without browser/Node coupling. | `CORE/src/writeOnce/fs.ts:54`; `CORE/src/console/files-inventory.ts:135`; `CORE/src/changeset/hasher.ts:104`; `CORE/src/changeset/lineage/plan.ts:159`; `MCP/src/tools/resolver-node.ts:180`; — |
| QW-C8 | current V; equivalence false | Reduce: define grammar first. Core searches for token; apply uses anchored, more permissive delimiters. Neither is drop-in equivalent. | `MCP/src/tools/apply-change.ts:105`; `CORE/src/workspace/integrity/versionStatus.ts:77`; P10 |
| QW-C9 | current V, internal caller search | Keep deletion of unexposed prune/backup chain and tests serving only it after export-boundary check. | `MCP/src/tools/mutate.ts:22`; `reachability.ts:7,298`; `spec-backup.ts`; `MCP/package.json:11`; P8 |
| QW-C10 | current V; failure/exploit U | Reduce to runtime validation of consumed optional fields/op shapes. Typed construction alone does not validate; several proposal branches already do. | `CORE/src/changeset/parser.ts:78,103`; `MCP/src/tools/propose-changeset.ts:595,628`; P2 |
| QW-C11 | partially resolved V | Reduce to shared semantics for the same query. Core already shares candidate predicate. Preserve intentional spec-inclusive/exclusive scans. | Original MCP helpers path absent; `CORE/src/helpers.ts:45`; `MCP/src/tools/validate.ts:62,72`; `spec.ts:117`; `workspace-sync.ts:36`; P10 |
| QW-C12 | current V | Keep when touching paths; e.g. locate-writer comment order contradicts code trying dev before installed. | `CORE/src/console/locate-writer.ts:45,56`; `CORE/src/changeset/lineage/types.ts:4`; `CORE/src/validator/knowledge-checks.ts:374,393`; P9 |

### D — Skills and documentation

| ID | State / confidence | Disposition; minimum useful scope | Current evidence / action |
|---|---|---|---|
| QW-D1 | current V | Keep evidence-bearing changeset guidance in live skills/CLI. Label or retire frozen workspace procedures if still executed/distributed. | `skills/nn-preflight/SKILL.md:84`; `skills/nn-sources/citations.md:5,18`; `skills/nn-sources/scripts/index.js:445`; `BP/workspace/procedures/import_and_structure_tabular_data_procedures_NN.md:102`; P3 |
| QW-D2 | current V | Keep all three stale environment-variable mentions, not just two. | `skills/nn-innfo/SKILL.md:200,408,470`; actual `MCP/src/server.ts:65`; P3 |
| QW-D3 | current V | Keep canonical typed-address example. Prose wikilinks remain separately legal. | `skills/nn-innfo/SKILL.md:1042`; `iNNfo/specs/iNNfo_V_0-7-0_NN.md:122,125`; P3 |
| QW-D4 | current V | Keep root procedures/ discovery in all three mentions. | `skills/nn-innfo/SKILL.md:172,860,864`; `CORE/src/scaffold/domain.ts:21`; P3 |
| QW-D5 | partially resolved V | Reduce to stale layout/Tier 2 claims. Keep upgrades/distributed audit that exist. Frontmatter-description edit changes a contract, unlike body-only prose. | `skills/nn-preflight/SKILL.md:3,79,83,92`; runner `:1264,1302`; P3 |
| QW-D6 | partially valid V | Reduce inaccurate inventories/mandatory rendering rules. Do not claim no Preact: vendor Preact/HTM remain bundled. | `.agents/skills/nn-console-kit/SKILL.md:20,31,38`; `scripts/lib/console-bundle.js:13` has 14 entries; P9 |
| QW-D7 | current V | Keep coherent lifecycle explanation across pages, not just one definition. Tutorial also describes persisted projected sections. | `docs/documentation/content/reference/glossary.md:29`; `concepts/mental-model.md:47`; `tutorials/domain-from-scratch.md:97`; `docs/documentation/documentation_NN.md:93,181`; `docs/use/reviewer-guide.md:52`; P3 |
| QW-D8 | partially valid V | Reduce to README/obsolete flow text. Canonical nn-update page already uses new name; retain explicit deprecated alias explanation. | `docs/update/README.md:18,74`; `docs/documentation/content/skills/nn-update.md:3,7`; P9 |
| QW-D9 | current V | Keep display strings opportunistically; do not rename stored keys/APIs mechanically. | `scripts/lib/skills-commands.js:1590`; P9 |
| QW-D10 | current V | Keep distributed-aware count via existing audit discovery, excluding changes/sidecars/specs. | `skills/nn-preflight/scripts/domain-probe.js:28`; `preflight-check.js:1302`; P5 |
| QW-D11 | current V | Keep protection before package/projected-skill replacement. Embedded hashes already recorded; consent path selects manifest skills only. Reuse state structure. | `scripts/lib/skills-commands.js:575,589,604,609,1566`; P5 |
| QW-D12 | not demonstrated as phrased V | Discard count change: AGENTS describes three maintainer nn-dev stubs; three exist, plus console-kit. Clarify only if actual misrouting. | `AGENTS.md:22,28`; `.claude/skills/` inventory; — |

### E — Console

| ID | State / confidence | Disposition; minimum useful scope | Current evidence / action |
|---|---|---|---|
| QW-E1 | current V | Keep build-time identity from package; affects changeset provenance as well as UI. | `BP/console/nn-runtime.js:17`; `scripts/lib/console-bundle.js:39,54`; P4 |
| QW-E2 | current V; fixture reproduction not repeated | Keep filtering synthetic <changes> identity, not every real model named changes. | `scripts/export-console.mjs:482,1733`; P4 |
| QW-E3 | current V; dead-use claim static | Keep deletion after complete config consumer search and fixture adjustment; no replacement discovery channel. | `scripts/export-console.mjs:1412`; `BP/console/nn-runtime.js:155`; P8 |
| QW-E4 | partially demonstrated V/I | Reduce: remove unreachable fallback after standalone verification; regenerate CSP from actual scripts. “Four unused” not remeasured on fresh export. Security-sensitive scope. | `BP/console/artifact_shell.html:10,432,435`; `scripts/console-views.mjs:503`; P8 |
| QW-E5 | current V | Keep content identity if freshness guides regeneration; include shell identity, not just bundle. | `scripts/export-console.mjs:459,464`; P4 |

### F — Registers/settings

| ID | State / confidence | Disposition; minimum useful scope | Current evidence / action |
|---|---|---|---|
| QW-F1 | active delta current V; completeness I | Keep retiring after mapping requirements to implementation/tests. Merge date alone not proof. | `openspec/changes/console-catalog-picklist/specs/`; only non-archive active directory; P11 |
| QW-F2 | not demonstrated U | Postpone live edits pending current issue bodies/fix comparison. Backlog still records distinct gaps. | `openspec/backlog_NN.md:292,304`; P11 |
| QW-F3 | partially resolved V/U | Reduce to stale-backlog reconciliation and whole-engine check. Episode-id derivation already fixed; placement alone cannot close whole issue. | `BP/coNNtent/spec_NN.md:68`; `ENGINE/scripts/lib/pipeline.mjs:136`; `ENGINE/references/folder-contract.md:59`; backlog `:256`; P11 |
| QW-F4 | resolved V | Discard further scheduling: batch b6 exists. Repair itself remains open (R3). | `openspec/backlog_NN.md:243,451`; — |
| QW-F5 | partially resolved V | Reduce to residual stale evidence. #617/#587 entries exist; number-field is shipped/obsolete; size shipped. coNNtent-procedures still invokes absent archived spec and old inventory. | `openspec/backlog_NN.md:189,221,245,268,280`; P11 |
| QW-F6 | not demonstrated U | Postpone policy change pending live protection/check names and bypass/recovery decision. | `.github/workflows/ci.yml:25` defines checks, not protection; P11 |
| QW-F7 | not demonstrated U | Postpone remote deletion until tips, PR bases and consumers checked. | `.github/workflows/ci.yml:6,8` still references dev; P11 |

### H — Contract changes

| ID | State / confidence | Disposition; minimum useful scope | Current evidence / action |
|---|---|---|---|
| QW-H1 | current V | Reduce to documented no-op/deprecation unless removal has value. No major release solely for ignored optional parameter. | `MCP/src/server.ts:159,264,628`; P12 |
| QW-H2 | partially valid V | Reduce to inventory/deprecation. Some model_id aliases explicitly declared; blanket “undeclared” inaccurate. | `MCP/src/server.ts:749,772,924,962,974,1059`; P12 |
| QW-H3 | current V/I | Keep truthful annotations for actual writing paths, audit each tool. | `MCP/src/server.ts:569`; `MCP/src/tools/check-workspace.ts:259`; P4 |
| QW-H4 | current V | Keep conditional schema AND handler validation. Removing required alone still fails in handler; retain model identity used by resolution. | `MCP/src/server.ts:727,1149`; `MCP/src/tools/resolve-sources.ts:49,135`; P4 |
| QW-H5 | current, uneven V | Keep outcome-to-isError mapping. Warning/partial success is not total failure; some handlers already correct. | `MCP/src/server.ts:1005,1032,1042,1085,1120`; P4 |
| QW-H6 | public exports current V; external use U | Postpone public deletion. In-repo unused is not globally unused; private chain C9 differs. | `CORE/src/index.ts:49,115,178,198`; `CORE/src/browser.ts:81,97,143`; — |
| QW-H7 | compatibility current V; removal value U | Reduce: stop obsolete widget writes after round-trip check; reader removal needs supported-input policy. | `CORE/src/parser/yaml.ts:70,88`; `CORE/src/parser/serializer.ts:232`; P12 |
| QW-H8 | current V | Keep removal of misleading manifest literals if redundant; no new version registry. | `manifest/source.yaml:70,87`; `BP/changes/spec_NN.md:9`; `BP/procedures/spec_NN.md:8`; P9 |
| QW-H9 | current V | Keep stub-description fix; establish routing precedence before deleting duplicate project nn entry point. | `.agents/skills/nn/SKILL.md:5` 3.4.0 vs `skills/nn/SKILL.md:5` 3.4.3; `.claude/skills/nn-dev-development/SKILL.md:3`; P9 |
| QW-H10 | files current V; external nonuse U | Postpone published-path deletion. Negligible runtime cost; no internal references does not mean no URL consumers. | `iNNfo/specs/business-model_V_0-3-0_NN.md` and three siblings; `scripts/release/release-keys.js:16`; — |

## R traceability and minimum alternatives

| ID | State / confidence | Disposition and minimum alternative; benefit and stop condition |
|---|---|---|
| R1 | current inconsistencies V; universal migration need U | **Reduce.** Fix version semantics, malformed diagnostics and cold-cache pinned retrieval first (P10). `BP/analysis/spec_NN.md:2,6` disagrees; `CORE/src/parser/serializer.ts:157` defaults grammar. Preserve compatibility paths. No mandatory new Level 3 hash/field, historical-file deletion or changed immutability policy until consumers/backfill and a concrete failure require it. Not prerequisite for B10/diagnostics. |
| R2 | operation mismatch current V; broad payoff U | **Reduce.** Exact changes-op parity first (P4); decide catalog ownership separately. `scripts/blueprint-catalog.mjs:61` core set and exporter's presentation subset have different jobs. Common-tags bluepriNNt creates a public dependency/release coupling to save a few lines. Do not create it without actual divergence bugs. |
| R3 | repair gap current V; private domain still blocked U | **Keep bounded.** One sanctioned key-removal mechanism (P2); CHANGE_OPS at `CORE/src/changeset/types.ts:7` has no remove_field and no demonstrated set_fields removal. Prove removal, serialization, validation and audit record. Reuse compact/distributed fixtures for affected consumers (P7); no exhaustive compatibility platform or legacy migrator. |
| R4 | channels/direct updater write current V; scaling urgency U | **Reduce.** Record repins and report skipped history first (P2/P10): `skills/nn-update/scripts/apply-update-plan.js:58,158`; `CORE/src/lineage/project.ts:304,347,362,461`. Preserve sidecar upstream semantics until decided; repair before reader removal. Defer compaction, evidence policy and stale-proposal lifecycle until usage justifies them. Existing fold does not prove preservation of evidence, identity changes, deletion and review verdicts. Measure first; rebuildable index is smaller if slow. |
| R5 | partially resolved V; full migration benefit I | **Reduce/postpone remainder.** P6 closes release boundary, P8 removes obvious no-op/copies. Version guard exists. Distribution clones another repo and stamps catalog (`scripts/release/run-release.js:94,104,116`); “build into tagged tree” needs precise immutable-artifact design, never tag rewriting. Keep raw-tag inputs until replacement installer validated. Automatic versioning of every package not necessary. |
| R6 | coupling current V; move payoff U | **Reduce.** Identity/freshness first (P4). Moving exporter is not behavioral repair. Extract one domain block behind existing views only if both consumers become simpler. Size degradation shipped; historical 7 MB figures do not justify payload format migration. Defer package move until install/distribution smoke proves recurring operational benefit. |
| R7 | outcomes/skips current V; full split benefit I | **Reduce.** Fix isError, annotations, conditional arguments and skipped-file diagnostics while preserving payloads (P2/P4). `CORE/src/changelog/load.ts:87`; `changeset/history.ts:61,67` omit failures. Split apply only at a seam needed by tested fix, preserving lock/rollback order. No universal major envelope or naming migration absent consumer need. |
| R8 | reference conflict current V; extra schema need U | **Keep core/reduce extras.** Align producers, reference resolver/renderer and protocol (P3). Runtime strips wikilinks/searches labels (`BP/console/nn-runtime.js:606,616`); procedure example still teaches them (`BP/procedures/spec_NN.md:219`). Inventory: 30 procedure files, 866 wikilink occurrences across ALL text, not invalid typed-field count. Migrate parsed fields, preserve prose. Defer hazard field/typed catalogs absent concrete workflow need. |
| R9 | legacy names current V; blanket harm U | **Postpone/reduce.** Correct user guidance/delete private orphan code (P3/P8); no mass internal rename, expiry bureaucracy or published-path deletion. Consolidate guards only with equivalent exclusions/diagnostics and actual maintenance savings. Do not turn documentation-only vocabulary into a universal compiler. |
| R10 | overwrite/projection/menu drift current V; link payoff U | **Reduce.** Protection first (P5). Manifest menu differs (`manifest/source.yaml:9`; `skills/nn/SKILL.md:47`). Offer owned retired-install removal after inventory. Split references where routing is reliable, not to meet arbitrary 300-line cap. Windows linking/permissions introduce lifecycle risk; disk duplication alone does not justify it. |
| R11 | partially resolved V; old failure rates U | **Reduce.** Windows suites/current-export smoke first (P7). Vitest source alias already at `MCP/vitest.config.ts:27`. Docs checks still consume dist (`.github/workflows/ci.yml:50`); alias solves only some consumers. Share registry only for truly duplicated checks. Do not remove Linux exclusions assuming sort fixes them; no coverage reduction to conceal failures. |

## Additional finding

**SOL-N1 — Tool side-effect documentation contradicts current read_lineage.** V: `docs/documentation/content/reference/mcp-tools.md:55` lists read_lineage as mutating; registry/handler present it as read-only (`MCP/src/server.ts:669,1140`) and lineage is computed (`CORE/src/lineage/project.ts:248`). The same documentation claims Level 3 mutations become recorded changesets, contradicted by the updater direct-write path above. This can mislead tool choice and overstate audit guarantees.

Minimum: correct classification and qualify the write-path claim; include in P3. Acceptance: examples match registry and traced effects. Value low, difficulty low, positive impact/scope low, change risk low, **XS 0.5–2h**. Do not build a new effect system or envelope for this. Updater repair remains R4, not a duplicate new project.

No evidence justifies additional architecture projects. All-or-nothing evidence hashes (`MCP/src/tools/apply-change.ts:465`) and artifact inventory filtering (`CORE/src/lineage/project.ts:408`) already appear as original inferences; they are investigation cases, not new discoveries or proven production failures.

## Provisional priority and effort

Common scales: value, difficulty, positive impact, scope and change risk = **low / medium / high**. Positive impact is benefit when correct; risk is chance/consequence of breaking behavior. Effort: **XS ≤2h; S 2–8h; M 1–3d; L 4–10d; XL >10d (split/rethink)**. Day ≈6 focused maintainer hours. Ranges include focused checks and distribution/generated implications, exclude external review/release waits and private-data cleanup. Assume codebase familiarity and working environment. Groups are outcomes, not necessarily PRs; overlapping effort must not be summed mechanically.

| Action / priority | Coverage | Value | Difficulty | Positive impact / scope | Change risk | Effort |
|---|---|---|---|---|---|---|
| P1 early: required episode fields | C6/B7 | high | medium | high / low | medium | S–M 4–12h |
| P2 early: safe delete, input validation, field repair, history diagnostics | C5/C10/R3/R7 minimum | high | high | high / high | high | M–L 2–5d; split four slices |
| P3 early: consistent guidance and paired procedure references | D1–D5/D7, B3, R8 core, SOL-N1 | high | medium | high / medium | medium; reference conversion high | prose S 3–8h; references M–L 2–4d |
| P4 early independent fixes: truthful MCP and console identity/freshness | B10/C2/E1/E2/E5/H3–H5; R2/R7 minimum | high | medium | high / medium | medium | each S–M 2–12h; combined M–L 2–4d, split |
| P5 early: preserve installs; accurate probe | D10/D11/R10 minimum | high | medium | high / medium | medium | M 1–3d; two changes |
| P6 early: release boundary/failure isolation | A2/A4/R5 minimum | high | medium | high / medium | medium | S–M 4–12h |
| P7 enabling: Windows/current-export coverage and resolver precedence | A5/A6/C3/R3/R11 minimum | high | medium | high / medium | medium | M 1–3d; real platform defect may add 1–3d after diagnosis |
| P8 opportunistic: no-op/private dead code/small build gaps | A7–A11/C1/C9/E3/E4 | medium | medium | medium / medium | medium; CSP/distribution higher | each XS–S 0.5–8h; combined M–L 2–4d, split CSP |
| P9 when touching files: examples/terminology/inventory | A12/B1/B4/B5/B8/B9/B11/C12/D6/D8/D9/H8/H9 | medium | low | medium / medium | low; published changes medium | XS–S 0.5–8h per coherent area |
| P10 investigate first: version/discovery/upstream contracts | B2/B6/C4/C8/C11/R1/R4 minimum | medium | medium | medium / medium | medium | S–M 4–18h; updater repair afterward M 1–3d |
| P11 reconcile after live check | F1–F3/F5–F7 | medium | low | low / low | low text; medium settings/deletion | XS–S 1–4h; no remote mutations here |
| P12 defer compatibility retirement | H1/H2/H7 | low | medium | low / high | high | investigate S 2–8h; removal M 1–3d plus policy decision |

Full R1/R4/R5/R6/R7/R9/R10 bundles can readily become L/XL once installed consumers, migration and compatibility are included. Do not approve as units. R2/R3/R8/R11 have useful M-sized cores; optional expansions should be split/dropped. The original suggestion that each contract QW takes an hour is not defensible once acceptance and release work are included.

## Dependencies, acceptance and conditions for not doing

| Action | Dependency and smallest acceptance check | Stop condition / avoid expansion |
|---|---|---|
| P1 | Inspect compatibility policy/representative episode. Missing kind/language tested at 0.15/current/next supported version; explicit unknown kind and legacy exemption covered. Embedded-skill fix requires owner version bump (`scripts/guard-template-immutability.js:327`). | If omission intentionally legal in newer versions, clarify policy instead of enforcing old requirement. No engine redesign. |
| P2 | Unreadable delete candidate names file and causes zero writes; valid unreferenced delete succeeds. Sanctioned removal omits key, preserves other data, validates and records change; conflicts/rollback tested. Malformed consumed input rejected before mutation. Corrupt history reports incompleteness without hiding valid records. | No global optional-asset blocker, no apply rewrite before repro; define removal contract first. |
| P3 | Guidance matches API/validator. Procedure fixture with duplicate display names and slug parent/next/input/output validates and renders/executes correctly. Preserve prose wikilinks and HEAD Markdown/code rendering. Update CLI/docs together. | No STE lint, hazard schema, bracket-wide regex migration or global text linter. Accurate pages untouched. |
| P4 | Exact op parity with no review_gate exemption, evidence exception tested. Actual failures yield isError, side effects honestly annotated; target-only resolution reaches resolver. Second unchanged export is fresh despite synthetic changes. Bundle/shell content change with old mtime makes stale; runtime version matches package. | No universal envelope, indiscriminate partial-success failure, or all reads marked mutating. |
| P5 | Temporary install fixture: modified package/projected skill survives default update or requires informed replacement; unchanged update atomic. Distributed-only probe counts actual models, excludes sidecars/changes/specs. | Existing hashes/copies sufficient: no linking redesign or user-home-wide scan. |
| P6 | Stale/missing/wrong-version bundle refused immediately before staging, including manual recovery; normal release bytes preserved. Assert fail-fast disabled. Stronger source freshness needs explicit same-version stale-code case. | Reuse guaranteed immutable-SHA gate if equivalent. No duplicate artifact platform; no live publishing during diagnosis. |
| P7 | Windows job actually selects both suites; console-source edit triggers smoke loading same-checkout output. Conflicting pinned matches created opposite order resolve by documented precedence. Inventory dist consumers before trusting source alias globally. | Keep Linux exclusions until root cause known. No full-render multi-platform matrix without stable deterministic fixture. |
| P8 | Private deletion has no production registration/caller and correct export boundary. Site build retains generated copies. Regen stops ignoring failed operations. Address-source change fails check. Offline console executes intended scripts without fallback and valid generated CSP. | Keep committed distribution inputs until compatible consumers exist. No abstraction replacing harmless small wrappers. |
| P9 | Relevant docs/spec validation and required version/catalog/sample parity. Examples executable; pointer resolves canonical skill. | No factual-count churn, filler descriptions, new concept solely for link, or title-only release cascade. |
| P10 | Define grammar/caller cases before shared parser; malformed version never current. Cold-cache pinned retrieval returns requested content or explicit unavailable. Same discovery query agrees, deliberate query differences retained. Decide sidecar upstream ownership. Updater leaves applied history and consistent rollback. | No mandatory hash fields/published-file deletion without failure requiring them; no universal walker across different queries. |
| P11 | Read live issue bodies, delta requirements, branch tips/PR bases/protection API. One source-of-truth entry per finding, close verified subcases only. | Unavailable state stays explicitly unverified. Deleted openspec/specs never restored as authority. |
| P12 | Inventory declared/accepted aliases and supported input formats; explicit retirement decision and round-trip cases before deletion. | Absence of in-repo users alone insufficient. No breaking release purely for tidiness. |

Essential dependencies: **repair before rejection/removal**; preserve provenance before retiring readers; procedure producers and consumers change together; protect installed edits before projection/package migration; destructive-path regression coverage before transaction refactor. R1 does not block B10, engine predicate repair, truthful errors, installer protection or Windows execution. R5 does not block console identity fixes. Consolidating all gates is not prerequisite to fixing one handler.

## What not to do

- Do not delete published Level 0/1/2 paths because Git retains them: raw URLs, cached chains and external consumers are separate contracts.
- Do not collapse version identities/change immutability as prerequisite to concrete repairs; prove retrieval/diagnostic failures first.
- Do not ignore explicit breaking markers by commit type.
- Do not compact/archive history to improve a byte ratio; measure actual latency and preserve audit semantics. Rebuildable index is smaller if needed.
- Do not globally ban unknown without operation-specific rationale and actionable alternative. File evidence, decisions, reviewer verdicts and engine metadata differ.
- Do not invent a catalog writer or delete a catalog merely because it is hand-maintained; settle ownership first.
- Do not mass-rename internals, enforce arbitrary line caps or introduce common bluepriNNts for cosmetic uniformity.
- Do not move/rewrite console to repair identity/freshness. Shipped size budgets weaken payload migration case.
- Do not mistake version-only guard, historical HTML smoke or permanently non-blocking Windows job for current behavior coverage.
- Do not carry historical remote statistics/private-domain failures into a current plan without rechecking. No problem-count quota or modernization program is warranted.

This report recommends independently verifiable repairs followed by reassessment. Large refactorings remain hypotheses to reduce, defer or reject, not commitments.
