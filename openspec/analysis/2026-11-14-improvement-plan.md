# Improvement plan: targeted repairs before architectural change

Date: 2026-11-14. Decision baseline: `f3348c162cfa2ecf2461a76a481e5903d63647ff`.

Start with five bounded repairs: prevent destructive changes when impact coverage is incomplete, correct console runtime identity, fix synthetic-entry freshness, document and test the existing field-clear operation, and correct actionable authoring guidance. Do not add `remove_field`, weaken immutability, change explicit breaking-marker semantics, or relocate packages to deliver these repairs.

This is the coordinator's evidence-based consolidation after three independent diagnoses and three cross-reviews. All three models reviewed the shared material; they have NOT each approved this final synthesis. Remaining objections are recorded below. The user authorized the review and plan, not product implementation or merge.

## Evidence and reading order

1. This plan is the recommendation and decision record.
2. [Process and questions](2026-11-14-review-process.md) defines the approved method and D01-D09.
3. Cross-reviews: [Sonnet](2026-11-14-cross-review-sonnet.md), [Sol](2026-11-14-cross-review-sol.md), [DeepSeek Flash](2026-11-14-cross-review-deepseek.md).
4. First-round reports: [Sonnet](2026-11-14-independent-sonnet.md), [Sol](2026-11-14-independent-sol.md), [DeepSeek Flash](2026-11-14-independent-deepseek.md). Their superseded recommendations remain historical evidence.
5. Original [analysis](2026-11-12-improvement-analysis.md) and [evidence](2026-11-12-improvement-analysis-evidence.md).

Baseline is deliberately fixed. Reviewers observed a later local origin/main differing only in backlog text; this is not a live remote-state guarantee. Recheck the affected code and backlog against the implementation branch before acting, not by repeating the whole audit. Remote issue closures, release status, branch protection and private domaiNN incidents are unverified in this consolidation.

Evidence confidence: high = demonstrated behavior plus identified path, or a direct contract/source contradiction; medium = static evidence with incomplete caller/compatibility coverage; low = inference or unchecked external state. Agreement alone never raises confidence. The coordinator read the cross-reviews and directly checked the field-clear mutation, existing apply tests, deletion catch and breaking classifier; it did not rerun the reviewers' scratch experiments or a suite.

## Resolved decisions and retained objections

| Register | Decision | Evidence / dissent and consequence |
| --- | --- | --- |
| D01 | Reject QW-A3's commit-type allowlist. Preserve explicit `!`/breaking-footer semantics. | `scripts/release/plan-auto-tags.js:34` and all three cross-review examples yield major. Sonnet identifies a possible per-release-key scope mismatch in a historical commit; do not infer a classifier defect or introduce 0.x policy changes from that. Split unrelated breaking and prose edits when authoring commits. |
| D02 | Bundle identity guard is useful but does not establish source freshness. Retain it; separate a publication-boundary check from a source-correspondence solution. | Sol C1 changes actual source at the same version and the guard still passes. This is a reproduced blind spot, not proof of another bad production release. Peers' 'resolved' claims are superseded; design the smallest reliable source check only in the next queue. |
| D03 | Reject a new `remove_field` operation. Reuse `update_field` with `to: ''`; retain correct `from` and proposal sealing. | `nn-core/src/mutate.ts:930` removes fields/rawFields; `nn-mcp/test/apply-change.test.ts:402,429` already covers clear/conflict. Sol C2 round-tripped and applied a banned-field repair. All first-round reports and two cross-reviews missed this path. B10 declares an existing op and is independent of repair. Do not close a private incident from a synthetic fixture alone. |
| D04 | Repair version-literal gating, but leave legacy compatibility unresolved until caller coverage establishes the boundary. | Missing kind/language is bypassed at the live pin; explicit unknown kind still fails (Sonnet/DeepSeek/Sol experiments). Replacing one literal repeats the defect. Preserve the unpinned exemption provisionally; before coding, inspect all compiler callers and reconcile normative requirements. Do not choose whether old pins gain new requirements by vote. This action is outside the first batch. |
| D05 | Correct runtime identity in existing composition; exclude only the synthetic `<changes>` summary from model freshness. | Runtime constant at `console/nn-runtime.js:17` differs from package; UI model banner and release-comment banner are different consumers. DeepSeek's fixture cycle demonstrates false stale from model-count mismatch (`export-console.mjs:482,1736`). Its proposed hashing subsystem is withdrawn. Do not discard real changes documents or claim E2 proves E5's asset-freshness case. |
| D06 | A discovered unreadable candidate prevents destructive approval when its references cannot be checked. Improve diagnostics narrowly; preserve existing non-destructive behavior. | Sol C3 injected EACCES for a referencing peer: deletion still applied. Catch at `nn-mcp/src/tools/apply-change.ts:1695` omits it. Sonnet prefers warning first because junk files might block all deletion; coordinator rejects warning-and-delete where coverage is unknown. Bound discovery to actual candidates and report paths; no target write before this decision. Malformed adopted version already becomes unlisted (Sol C4); no comparator redesign. |
| D07 | Reduce concrete repairs; defer version/packaging/renaming programmes. | Prose can be normative, published URLs can have external users, and absence of local refs is insufficient for public deletion. Procedure references are existing backlog work; migrate parsed fields and producer/consumer behavior together, not every wiki-like prose occurrence. |
| D08 | Merge duplicate findings; reject speculative gates/hashing/platform-policy projects. | DS N1 -> A5/R11, N2 -> E5, N4 -> E1; DS N3 -> manual F5 cleanup. Sonnet NI-1 -> F1/F3/F5, NI-2 -> A6, NI-4 -> this process. NI-3 is a separately authorized machine cleanup, not permission to uninstall. SOL-N1 is a small tool-effects documentation correction. |
| D09 | Use original row IDs, not unreliable headline totals, to retain coverage. | A-E = 52; F adds 7 and H adds 10, giving 69 QW IDs and 11 R IDs. G was omitted. Original 52 is correct for A-E; DS's arithmetic accusation and inconsistent tallies are withdrawn. No consolidated 'N resolved' count is asserted from unequal verification. |

No additional model round is needed to settle D03: a successful real apply path and existing regression outweigh inferred absence from operation names. D04 and release-policy questions remain explicit rather than silently becoming prerequisites to unrelated repairs.

## Ready first batch: five actions

Each row is a separate reviewable action, not necessarily a separate release. Value is benefit if delivered; risk concerns the change itself. Difficulty and impact are auxiliary, not score multipliers. Confidence describes the problem evidence, not a promise the proposed implementation will pass.

| Action / origin | Smallest adequate change and observable benefit | Value | Effort | Change risk | Confidence | Difficulty / positive impact |
| --- | --- | --- | --- | --- | --- | --- |
| P01 Safe destructive coverage (C5, R7 minimum) | Carry unreadable candidate paths into the pre-persistence destructive decision and refuse affected deletion. Users retain data when inbound references cannot be evaluated. | high | S-M, 6-12h | medium | high | medium / destructive apply users |
| P02 Console runtime identity (E1, DS-N4, R6 minimum) | Substitute runtime version from the release info already used during bundle composition. Exported changesets identify the actual console release. | medium | S, 2-4h | low-medium | high | low / console exports and provenance |
| P03 Console false-stale status (E2, R6 minimum) | Exclude the synthetic summary identity from real-model comparison; preserve all real model/hash checks. An unchanged export reports fresh. | medium | S, 2-6h | low-medium | high | low-medium / console freshness users |
| P04 Existing field-clear repair (R3, local b6 reconciliation) | Document `to: ''`, add a banned-field-specific apply regression if missing, and correct the local backlog's missing-op premise. Repair works through the existing audited path without a new public op. | high | S, 3-6h | low | high | low / agents repairing invalid documents |
| P05 Actionable guidance (D2/D3/D4, SOL-N1) | Correct environment-variable/path/reference examples and the read_lineage effects sentence to match current consumers. Agents stop following contradictory instructions. Do not mass-convert procedures. | medium-high | S, 3-6h | low | high | low / authoring and tool-use instructions |

Estimates assume one maintainer familiar with the repo, with AI assistance. Include focused regression/review and normal spec/generated-output obligations; exclude CI waiting. XS <=2h, S 2-8h, M 1-3 days, L 4-10 days, XL >10 days requires splitting/reduction. Ranges crossing bands are explicit. P02/P03 share composition/fixture setup: do not sum the high ends as an effort forecast. Re-estimate from the implementation diff, not model vote totals.

### Acceptance, dependencies and rollback boundaries

| Action | Acceptance to execute during implementation | Dependencies / rollback |
| --- | --- | --- |
| P01 | Readable inbound reference rejects deletion; discovered unreadable peer yields a path-specific diagnostic and no destructive target write; multi-change partition/conflict handling stays correct; an unrelated non-destructive edit is not blocked by irrelevant unreadability. Test read-error branch and preserve useful warnings. | No R1/R3/R5 prerequisite. Changes stay in impact completeness/pre-persistence handling and focused regression. Follow the heavy lane if error/public outcome contract changes. Revert that slice independently; doing so reopens known safety risk. |
| P02 | Composed runtime export and exported changeset identity equal console package release version; shell release URL still correct; UI model-version display unchanged; generated bundle freshness passes. | Existing composeConsoleBundle release-info value is the source. Rollback composition substitution and regenerated outputs together. No package relocation. |
| P03 | Fixture with changesets: export -> fresh; unchanged re-export -> fresh; real model edit -> stale; real changes documents remain included. Retain asset checks and distinguish E5 from this regression. | Can share test setup/release with P02 but no semantic dependency. Rollback filtering and its regression; no stored-format migration. |
| P04 | A sealed, serialized/parsing round-trip `update_field` with `to: ''` removes banned `sources::`, preserves other fields and becomes valid; wrong `from` conflicts without writes; null/undefined remain different from empty string. Do not duplicate generic clear tests. | Existing mutation/apply path only. No B10 or new op prerequisite. Guidance/regression/backlog text roll back independently; no private incident closure. |
| P05 | Check actual variable, procedure path and accepted reference forms at touched consumers; edited examples are consistent; read_lineage documentation matches read-only handler. Review prose where syntax literals are explanatory rather than executable. | Scope to guidance, no frontmatter trigger/API change. Rollback those prose edits independently. Full procedure-reference migration remains N04. |

Select P01 first because its failure loses a safety guarantee. P02-P05 have no ordering dependency on it. Implement and review slices serially unless isolated worktrees are explicitly chosen. Stop after this batch and reassess observed defects; do not automatically implement the entire inventory.

## Next queue: reduced measures with entry conditions

These are candidate actions, not an approved architectural programme. Verify cited source and choose only when ready batch results or concrete requirements justify starting.

| Action / origins | Minimum / acceptance and entry condition | Value; effort; risk; confidence |
| --- | --- | --- |
| N01 Accurate tool effects/outcomes (H3/H5, R7) | Correct check_domain's self-healing annotation; map genuine apply/regeneration failures without losing partial success or completed mutation facts. Check per-handler behavior and client-facing contract; no universal envelope. Start with explicit contract/regression and heavy-lane delta as applicable. | high; S-M 1-3d split annotation/outcome slices; medium; medium-high |
| N02 Live-pin validation/text (C6/B7) | Trace compiler entry paths; choose legacy boundary from current contract; use a durable predicate, not replacement version literal. Missing current-pin fields fail, explicit invalid kind still fails, supported legacy behavior is covered. Reconcile published instructions/version obligations. | high; S-M 1-2d; medium; high problem / medium compatibility |
| N03 Existing op declaration (B10, R2 minimum) | Describe existing review_gate with reviewer/evidence rules, remove parity-test exemption and run focused check. Independent from P04; no new op. | medium; S-M 1-2d; low-medium; high |
| N04 Procedure references (R8, existing b3f) | Agree one current form, convert only typed reference fields, update validator/stepper/console consumers together; prose references preserved. Start with one end-to-end fixture. | medium-high; M 1-3d; medium; medium-high |
| N05 Installed-edit protection (D11, R10 minimum) | Temporary install fixture proves locally modified embedded skills/blueprints survive default update or require explicit informed replacement. Check every projection path; reuse existing content tracking. | high; M 1-3d; medium; medium |
| N06 Distributed probe (D10, R3 remainder) | Use existing discovery suited to this query; fixture containing only distributed instances is counted, sidecars/specs/changes excluded. No universal walker redesign. | medium; S 3-8h; low-medium; medium |
| N07 Release guard boundary/source closure (A2, R5 minimum) | Reject missing/mismatched/split bundle immediately before staging, including manual recovery. Separately choose smallest deterministic source/input check; unchanged source passes and same-version source edit fails. Test reproducibility/input closure before proposing digest/build metadata. | medium-high; S boundary 2-6h; M source-check 1-3d provisional; medium; high blind spot / medium mechanism |
| N08 Current-code CI coverage (A5/A6, R11 minimum, Sonnet NI-2, DS-N1) | Run Windows-only suites on documented supported platform and make UI smoke load same-checkout console output triggered by relevant edits. Keep them separate slices. A non-blocking diagnostic run is temporary, with a defined promotion/removal decision. No Linux un-skip as unexplained cure. | medium; M 1-3d; low-medium; high coverage gap |
| N09 Harmless maintenance (A7/A10/A11, C2, selected D5/D6/D7/D8/H8/H9) | Remove ignored failing regen call; add existing address --check guard; remove arbitrary line cap if it blocks useful edits; correct demonstrated fallbacks/instructions. Each requires existing mechanism and concrete acceptance; no new gate framework, literal-count churn or indiscriminate deletions. Prefer adjacent edits over a standalone cleanup campaign. | low-medium; XS-S per item; low; medium-high |
| N10 One-off tracker reconciliation (F1/F2/F3/F5, Sonnet NI-1, DS-N3 reduced) | Read current issue bodies and merged requirements before closure; verify episode writer/layout end to end; correct local R3 premise using P04 evidence. Retain shipped history where useful. No network-backed CI checker. | medium; XS-S 1-4h; low; medium local / low remote |

Future history-completeness diagnostics (C10/R4/R7) need a concrete consumer decision: name omitted inputs on read results, and block only operations requiring those inputs for safety. Do not turn every parser warning into universal mutation failure. Asset-freshness E5 is separate from P03: require a demonstrated changed-bundle/shell case with preserved mtimes before choosing an identity comparison.

## Deferred or rejected scope and revisit triggers

| Scope | Decision / concrete trigger |
| --- | --- |
| R1 identity/L0-L1 collapse/prose guard relaxation | Defer. Normative prose affects behavior and pinned content identity. Revisit with measured harmless-only bump cost or a concrete pinned-retrieval failure and compatibility plan. No mandatory new stored fields now. |
| R4 provenance reader retirement/history compaction | Defer destructive parts. Revisit after representative stored data is repaired through existing operations and reader-removal compatibility is demonstrated. Measure user latency/storage impact before compaction. Updater recording is a separate concrete ownership/write-path issue. |
| R5 build/release relocation; R6 console package move | Reject as prerequisites; defer programmes. Revisit if reduced guards and concrete console repairs fail a named delivery requirement. Preserve frozen paths and install consumers. |
| R7 envelope/pipeline rewrite | Defer. Per-operation diagnostics/outcome repairs precede redesign; revisit only if repeated fixes demonstrate an unmanageable shared boundary. |
| R9 vocabulary mass rename/public export or published-file deletion | Reject tidiness-driven change. Revisit on a compatibility-supported deprecation need; unused in this repo is insufficient. Private dead code can be removed after an export-boundary check, opportunistically. |
| R10 skill splitting/retirement machinery | Defer. Fix actual contradictory guidance and installed-edit safety first; require demonstrated routing failure or recurring retirement cases. Machine-local uninstall needs a separate explicit request. |
| R11 gate consolidation/large platform matrix | Defer. Run the missing supported-platform tests and current-code smoke before changing gate architecture. |
| A3 classifier allowlist; D12 stub-count fix; DS-N3 automatic backlog checker | Reject proposed fixes: existing breaking contract, misread 'three' scope, and disproportionate machinery respectively. |
| A4 release fail-fast; F6 branch protection; H1/H2 aliases/intent removal | Defer until explicit contract/operational intent is established. Do not infer policy from a code shape or an old API result. |
| Cosmetic schema keys/titles, common hash/parser abstraction and permissive grammar cleanup | Defer unless a consumer failure supplies benefit and compatible grammar/ownership. No quota of improvements. |

## Full proposal traceability

Every original QW ID below has one home. References to an action do not declare all of its historical premises true. Rejected/deferred rows are recommendations, not claims that the source issue is resolved.

| IDs | Final home / disposition |
| --- | --- |
| A1 | Already repaired per baseline package history; no new implementation; current remote publication not audited. |
| A2 | N07; partial guard coverage, not source freshness. |
| A3 | Reject classifier allowlist; D01. |
| A4 | Defer pending release dependency/failure intent. |
| A5, A6 | N08; duplicate new platform/fixture proposals merged. |
| A7, A10, A11 | N09. |
| A8 | Defer untracking derived copies until site-build consumers verified. |
| A9 | N09 only after checking current supported branch policy; do not delete refs. |
| A12 | Opportunistic N09 only; no standalone typo/encoding campaign. |
| B1, B3, B11 | Adjacent blueprint correctness work, after relevant example/scaffold validation; N09 principles and normal bump obligations. |
| B2, B4, B5, B6, B8, B9 | Defer optional completeness/cosmetics until consumer need; no fabricated filler. |
| B7 | N02. |
| B10 | N03. |
| C1, C3, C8 | Defer until cycle/ordering/grammar behavior demonstrated; C3 does not prove Linux flake cause. |
| C2, C12 | Opportunistic N09; stale comment cleanup does not authorize semantic validator changes. |
| C4 | Reject 'malformed becomes current'; optional better unlisted reason only on demonstrated need. |
| C5 | P01. |
| C6 | N02. |
| C7, C11 | Defer general hashing/discovery consolidation; distinct queries may be deliberate. |
| C9 | Opportunistic private deletion after export/caller check; not a first-batch feature. |
| C10 | Defer broad parser strictness; narrow incomplete-history diagnostics only with named consumer/compatibility case. |
| D1 | Reduce to guidance repair after checking citation/provenance distinction; pair field-clear guidance with P04, defer stored-procedure reader removal to R4/N04. |
| D2, D3, D4 | P05. |
| D5, D6, D7, D8 | N09 adjacent verified documentation changes. |
| D9 | Defer mass vocabulary string replacement. |
| D10 | N06. |
| D11 | N05. |
| D12 | Reject mistaken stub-count correction; three canonical maintainer pointers were meant. |
| E1 | P02 (DS-N4 merged). |
| E2 | P03. |
| E3 | Adjacent N09 cleanup only if parse/ignore consumers confirmed; not an urgent functional repair. |
| E4 | Defer CSP change without a concrete tested requirement. |
| E5 | Separate asset-freshness hypothesis; reproduction trigger above; DS-N2 adds no new action. |
| F1, F2, F3, F5 | N10; partial/unverified cases require live evidence before closure. |
| F4 | Batch scheduling already exists locally; its missing-op premise is corrected by P04, not implemented again. |
| F6 | Defer maintainer policy; no settings changed. |
| F7 | No action without live check; first report saw no remote dev, not a fresh guarantee. |
| H1, H2 | Defer removals pending public compatibility/intent. |
| H3, H5 | N01. |
| H4, H7 | Defer unestablished cases; read actual consumer requirements before acceptance. |
| H6, H10 | Defer public export/published-path deletion; compatibility required. |
| H8, H9 | Adjacent N09 source/pointer correctness only. |
| R1 | Deferred immutability/identity programme; no prose-only exception now. |
| R2 | N03 only; distinct core-name sets need not become one. |
| R3 | P04 existing repair plus N06 distributed discovery; new op rejected. |
| R4 | Defer retirement/compaction; investigate updater write recording separately when entering that action. |
| R5 | N07/N09 reduced measures; relocation deferred. |
| R6 | P02/P03; package move deferred. |
| R7 | P01/N01 targeted semantics; envelope/pipeline deferred. |
| R8 | N04 existing backlog item, not a duplicate project. |
| R9 | Defer renames/public deletion; private deletion opportunistic. |
| R10 | P05/N05; machinery/splitting deferred. |
| R11 | N08; gate consolidation deferred. |

## Handoff and stop rule

First-batch acceptance criteria above are future tests, not passed implementation results. No product behavior, public operation, installation, remote tracker or release was changed by creating this plan. Before implementation, recheck branch freshness and follow normal development lane, focused tests and generated-output obligations. Do not merge without the maintainer's per-PR authorization.

The three cross-reviews conclude the authorized evidence round. The coordinator selects P01-P05 without another general consensus cycle. Remaining policy questions do not block those slices. After the first batch, reassess actual outcomes before selecting the next queue. Keep this plan as the single recommendation record; do not copy its full inventory into a second tracker.
