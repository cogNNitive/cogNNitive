# Improvement review process and decision register

Date: 2026-11-14. Approved scope: finish evidence-led cross-review and produce one actionable plan; product implementation is outside this round.

## Baseline and inputs

All decisions in this round target commit `f3348c162cfa2ecf2461a76a481e5903d63647ff`. Record any later relevant change separately; do not silently mix baselines.

Common inputs for every reviewer:

- `2026-11-12-improvement-analysis.md` and `2026-11-12-improvement-analysis-evidence.md`.
- `2026-11-14-independent-sonnet.md`.
- `2026-11-14-independent-sol.md`.
- `2026-11-14-independent-deepseek.md` (OpenCode-Go DeepSeek v4.1 Flash).
- Current implementation, tests, published specs and backlog at the baseline. Archived decisions are historical context, not contracts.

The first-round files are immutable records during cross-review. They are independent of one another but had unequal historical/remote inputs. Agreement is not independent proof when all reports inherit the same premise.

## Cross-review protocol

Each model reads both other reports and its own, corrects its own material mistakes and tests objections against source evidence. Write one short cross-review per model; no second full audit and no quota of new findings.

For each decision below, report: disposition (accept/reduce/defer/reject/unresolved), exact claim being assessed, baseline path and line, evidence level, minimum safe action, acceptance check and remaining uncertainty. Explicitly distinguish observed behavior, static source evidence and inference. A historical incident does not alone establish a present defect.

Use narrow, non-destructive checks only when the result changes a decision. No full suite, installation, release, shared build or junction mutation. Scratch fixtures must live outside tracked files. Capture commands, actual results and environmental limitations. Unexecuted acceptance criteria must not be presented as passing checks.

Every reviewer covers the register; the assigned focus gets deeper checking. Stop after this cross-review round. The coordinator resolves small factual issues directly. At most one further narrowly scoped check is justified if an unresolved material question prevents selecting the first batch. No repeated consensus rounds.

## Decisions to resolve

| ID | Material question / first-round tension | Evidence needed | Primary checking focus |
| --- | --- | --- | --- |
| D01 | QW-A3: should `docs!` retain explicit breaking semantics? Sonnet acceptance contradicts Sol's objection. | Release classifier, published contract and focused examples; distinguish desired policy from bug. | Sonnet |
| D02 | QW-A2/R5: does the version guard prove freshness, or only identity/import shape? | Actual guard scope and release consumers; show a same-version stale-source case before adding another mechanism. | Sol |
| D03 | R3/B10: what is the smallest safe field-repair operation and its actual prerequisite? Do not conflate declaring review_gate with implementing remove_field. | Parser, apply, serializer and validator paths; failing repair scenario; independent vs necessary dependencies. | Sol |
| D04 | QW-C6: which checks are bypassed, which still run, and how does installed-version enforcement constrain exposure? | Missing vs explicit invalid fields at relevant pins; existing episode checks; smallest predicate repair. | DeepSeek |
| D05 | QW-E1/E2: distinguish bundle banner from runtime export identity; establish freshness defect and minimum correction. | Version injection consumers, freshness inputs, synthetic entries, unchanged/re-export scenarios. Avoid speculative hashing subsystem. | DeepSeek |
| D06 | QW-C4/C5/R7: which silent/incomplete results are observable and which require blocking destructive changes? | Full callers/status flow; malformed-version result; unreadable impacted model; per-operation error semantics. | Sol |
| D07 | R1/R4/R6/R8/R9/R10/R11: which reduced repairs are justified, and which migrations/deletions lack demonstrated value? | Current consumers and compatibility obligations, producer/consumer pairs, repair before rejection. No package move or rename merely for tidiness. | Sonnet |
| D08 | New proposals: Windows policy, backlog checker, content hashing, local skill removal and tracker cleanup. Which duplicate an existing proposal or overreach? | Existing guarantees, actual recurring defect and minimum manual alternative; machine cleanup is separate from repo changes. | All |
| D09 | Reconcile proposal counts and status claims without using unqueried GitHub state as fact. | 52 A-E items versus 69 total QW IDs; inconsistent DeepSeek summary/tallies; current local facts versus timestamped remote observations. | Sonnet |

All other material errors discovered while reading peers may be added with stable IDs. Cosmetic disagreements need no register entry.

## Consolidation rules

The coordinator produces `2026-11-14-improvement-plan.md` after all three cross-reviews. It includes:

- Decisions and evidence, including unresolved minority objections; no majority-vote rule.
- One entry per distinct action, retaining links to QW/R/new IDs. A new finding that duplicates an old one is merged.
- Observable problem and affected user, smallest adequate change, acceptance, dependencies and compatible rollback boundary.
- Value (low/medium/high), effort range with assumptions, change risk (low/medium/high), evidence confidence (low/medium/high). Difficulty and impact/scope are auxiliary descriptors, not additional multipliers in a scoring formula.
- Effort XS <=2h; S 2-8h; M 1-3 maintainer-days; L 4-10d; XL >10d requires reduction or splitting. Include review/spec work; distinguish shared setup and avoid summing overlapping estimates.
- Groups: ready first batch; next once dependencies hold; defer until a named trigger; reject/already resolved. Unverified high-risk changes stay out of the ready batch.
- A first batch of at most 3-5 small, evidence-backed actions; no arbitrary effort target and no implementation authorization implied.

Large redesigns need demonstrated benefit and a concrete trigger. Published paths, stored data and public contracts are not removed just because local references are absent. Repair paths precede stricter rejection. Existing behavior and explicit contract decisions outweigh stylistic consistency.

The three cross-reviews are supporting evidence, not competing work trackers. This file holds the process and decision questions; the final plan will hold implementation recommendations. Do not copy the whole plan into the backlog or open dozens of issues during this phase. No product changes or merge are part of this review.
