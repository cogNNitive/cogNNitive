---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Consolidated plan and verdict - archive-lifecycle"
analyzed_sha: "732af61f103c4c4b79aba5d0881dd853c7092283"
roster: "argon=antigravity/gemini-4-argon (High), luna=codex/gpt-6-luna, deepseek=opencode/opencode-go/deepseek-v4.1-flash, consolidator=claude-opus-5-5"
single_provider_panel: false
no_cross_critique: false
---

# Verdict

The proposal `openspec/changes/archive-lifecycle` at `732af61f1` is not adoptable as written. All three reviewers independently reach the same core conclusion: the maintainer's complaint (closed runs bury active ones) is real and cheap to fix as a read-side projection over the existing `closed: true` marker, while every storage mechanism in the delta (cold placement, changeset relocation with a seal, compact segment rotation, universal archive op, automatic policy) contradicts an existing contract: placement-derived identity, `close_model` immutability, `evidence_sha256`, the single provenance log, `write_policy`, or the open `private-run-outputs` change. The delta is also internally contradictory: Requirement 2 forbids a write after `close_model` and Requirement 5 requires one (the seal). The performance claim ("every scan, validation, payload and `changes/` listing pays") is unmeasured; two whole-domain reads are confirmed (`procedure_state` change-log fold, lineage snapshot), the rest is not quantified.

Agreement here is strong but not proof: all three share the premise that `closed: true` is a sufficient "done" marker. It is for Procedure Execution runs; it is not established for other high-volume collections (artifact-template instances, frequent compact rows), which remain an open product question.

# Vote table

Cells: stance of the column reviewer in its cross critique on the row finding; `author` marks the reviewer's own finding.

| Finding | argon | luna | deepseek |
|---|---|---|---|
| argon:F1 three distinct problems | author | partially agree | agree |
| argon:F2 keep instances at placement | author | agree | agree |
| argon:F3 no seal, no changeset moves | author | agree | agree |
| argon:F4 drop compact rotation | author | agree | partially agree |
| argon:F5 first slice on closed:true | author | partially agree | agree |
| argon:F6 universal archive vs write_policy | author | agree | partially agree |
| argon:F7 archive_policy anchoring | author | partially agree | agree |
| argon:F8 procedure_state vs moved/evolved definitions | author | agree | agree |
| luna:F1 archival not a demonstrated perf fix | agree | author | partially agree |
| luna:F2 Archived is not a run state | agree | author | agree |
| luna:F3 override breaks write-policy lattice | agree | author | agree |
| luna:F4 cold placement breaks identity | agree | author | agree |
| luna:F5 moving changesets breaks provenance log | agree | author | agree |
| luna:F6 automatic policy underspecified | agree | author | agree |
| luna:F7 reconcile with open execution changes | agree | author | disagree |
| luna:F8 first slice = non-moving projection | agree | author | agree |
| deepseek:F1 drop the state framing | agree | agree | author |
| deepseek:F2 archive-invisible premise is false | partially agree | partially agree | author |
| deepseek:F3 changes/ growth argument unsupported | partially agree | agree | author |
| deepseek:F4 cold changesets amputate lineage | agree | agree | author |
| deepseek:F5 identity is positional | agree | agree | author |
| deepseek:F6 extract_instance is the wrong op | agree | agree | author |
| deepseek:F7 terminal state lives on fields | agree | agree | author |
| deepseek:F8 universal archive vs append-only/read-only | partially agree | partially agree | author |
| deepseek:F9 archive op undefined, hits closed log | agree | agree | author |
| deepseek:F10 hot-path cost is at the walk | agree | partially agree | author |
| deepseek:F11 slice = marker + filters | agree | partially agree | author |
| deepseek:F12 prior art frames the wrong question | agree | disagree | author |
| argon:N1 seal breaks evidence_sha256 and Run Artifact paths | author | — | — |
| argon:N2 compact rotation vs idOf / DUPLICATE_MODEL_ID | author | — | — |
| argon:N3 Concept-level policy cannot partition by procedure | author | — | — |
| deepseek:N1 loadChangeLog is directory-blind | — | — | author |
| deepseek:N2 instanceFileName follows the folder slug | — | — | author |

`N` findings were raised in phase 2 and had no further reviewer.

# Disagreements verified in code by the consolidator

- deepseek:F2 is refuted on its headline. `collectModels` calls `isExcludedPath` (`iNNfo/packages/nn-core/src/helpers.ts:95`) and so does `findAllWorkspaceModelFiles` (`iNNfo/packages/nn-mcp/src/tools/apply-change.ts:245`). What survives: three walkers also keep their own hardcoded `archive` skips (`helpers.ts` `isIgnoredDir`, `spec.ts`, `apply-change.ts:224-227`), a duplication, not the mechanism of the problem.
- deepseek:F3 is refuted on "every hot-path reader is bounded". `readLineageSnapshot` walks the whole domaiNN and keeps every knowledge model and changeset (`iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:33-53`), and both `loadChangeLog` and lineage consume it. Its recommendation (measure before relocating) stands.
- deepseek:N1 is confirmed. `isChangesetPath` tests the basename only (`iNNfo/packages/nn-core/src/changelog/load.ts:75-81`); the log's contents are a function of the walk predicate, so "leaving `changes/`" removes a changeset only if its new folder is excluded, which is exactly the invisibility Requirement 4 forbids.
- luna:F7 vs deepseek: the conflict with `private-run-outputs` is concrete. The runner writes to `executions/<run>/outputs/<slug>/<name>` and stores that path in the row (`iNNfo/specs/bluepriNNts/executions/spec_NN.md:279`); a closed run cannot update it. deepseek's disagree is upheld on substance; luna's sequencing framing is too weak.

# NN Decisions

## NN Decisions: D1 Archival is a visibility axis, never a run state or a write to a closed model
covers:: argon:F1, luna:F2, deepseek:F1, deepseek:F9
decision:: adopt
consensus:: unanimous
priority:: P1

`state` terminals have no outgoing edges (`executions/spec_NN.md:95`) and `close_model` refuses every later write (`changes/spec_NN.md:187`). Close the delta's open question 1: no `archived` option in `state::`, no `archive`/`unarchive` op targeting a closed model. This answers the maintainer's "último estado Archived" idea: the effect he wants (archived runs reachable but out of the way) comes from visibility, not from a state.

## NN Decisions: D2 Reject physical relocation of instances to a cold placement
covers:: argon:F2, luna:F4, deepseek:F5, deepseek:N2, luna:F7
decision:: reject
consensus:: unanimous
priority:: P1

Identity is the placement-derived hierarchical id (`placement.ts`, `classify.ts`), `archive` is a reserved literal (`storage.ts:39`), the file name follows the folder slug (`contract.ts:77`), `{container}` expands from the parent folder (`storage.ts:291`), and closed runs store literal paths under `executions/<run>/` (`executions/spec_NN.md:279`). A cold zone needs an identity-preserving indirection contract that nothing provides. Instances stay at their declared placement.

## NN Decisions: D3 Reject changeset relocation and the change-log seal
covers:: argon:F3, luna:F5, deepseek:F4, deepseek:N1, argon:N1
decision:: reject
consensus:: unanimous
priority:: P1

`changes/` is the single permanent provenance medium (`changes/spec_NN.md:165`); `procedure_state` rebuilds attempts from the full log (`procedure-state.ts:386`); the loader is directory-blind (`load.ts:75`); and writing a seal into a closed run changes its bytes and trips `EVIDENCE_SOURCE_CHANGED` for every changeset that cited it (`changes/spec_NN.md:137,217`). Requirement 5 also contradicts Requirement 2. If log growth is later measured as the bottleneck, the lever is an index or a loader scope, not a move.

## NN Decisions: D4 Reject compact segment rotation and the extract_instance idea
covers:: argon:F4, deepseek:F6, argon:N2
decision:: reject
consensus:: unanimous
priority:: P1

`extract_instance` only promotes a compact element into a distributed instance and re-keys it (`changes/spec_NN.md:197`). A compact model id is its file stem, so a sibling segment changes every moved address, and same-id siblings trip `DUPLICATE_MODEL_ID` (argon:N2, not spot-checked). deepseek partially dissented on whether this "violates" addressing or is merely unimplemented indirection; both readings lead to the same call for now. Unbounded compact growth is a modelling question (D10), not an archival one.

## NN Decisions: D5 First slice: Activas / Historial projection over closed runs, no writes, no moves
covers:: argon:F5, luna:F8, deepseek:F11, luna:F1
decision:: adopt with changes
consensus:: unanimous
priority:: P1

Default console run views and active listings show non-closed runs; runs with `closed: true` collapse into an expandable "History (N)" with an explicit include. `read_knowledge`, `procedure_state` and citations keep resolving by id unchanged. Changes from argon:F5: no `closed_at` frontmatter write (deepseek critique: `applied_at` of the closing changeset already exists, `changes/spec_NN.md:139-142`); a terminal run whose `close_model` failed stays visible as active (prior Codex Sol review). luna's caveat holds: this is a UX fix, and no performance gain is claimed without D8.

## NN Decisions: D6 Remove universal archive/unarchive and its write-policy override
covers:: argon:F6, luna:F3, deepseek:F8
decision:: reject
consensus:: unanimous
priority:: P2

Requirement 1 overrides a fail-closed lattice (`writePolicy.ts`, `iNNfo_V_0-9-0_NN.md:191-199`) and "restore the prior policy" has no meaning once concept or scope policy changed meanwhile. Note: argon is right that clamping to `read-only` tightens, deepseek's "loosens" wording is backwards; the real hole is the archive op itself bypassing the policy check. If element-level archival returns, it must be classified in `writeOperationOf`, honour scope policy, and restore against the current cascade.

## NN Decisions: D7 Defer archive_policy (keep / after)
covers:: argon:F7, luna:F6, deepseek:F7, argon:N3
decision:: defer
consensus:: unanimous
priority:: P3

Concept Definitions declare no terminal state (`iNNfo_V_0-9-0_NN.md:140-152`), the clock and ordering are undefined, and a Concept-level `keep: 5` would keep five runs per domaiNN, not per procedure (argon:N3). Trigger: D5 shipped and the History list itself becomes too long. When revived: anchor to `closed: true`, partition by `procedure`, order by the closing changeset's `applied_at`, and decide read-time retention (no writes) vs an audited record; luna flags that as a provenance decision, not a technical one.

## NN Decisions: D8 Measure the two whole-domain reads before any performance claim
covers:: luna:F1, deepseek:F3, deepseek:F10
decision:: adopt with changes
consensus:: majority
priority:: P2

Measure on a domaiNN with tens of closed runs: `procedure_state` (full change-log fold), the lineage snapshot, console export time and payload size, separately. deepseek:F3's "bounded walks" premise is dropped (refuted above). If a read dominates, the candidate lever is a derived, rebuildable index, not archival.

## NN Decisions: D9 Constraint: procedure definitions are never archived or relocated by archival
covers:: argon:F8
decision:: adopt
consensus:: unanimous
priority:: P2

`foldStoredRun` loads the run's recorded procedure by path (`procedure-state.ts:81,242`) and closed runs cannot rebase (`procedure-state.ts:275`). State it as a hard constraint of any archival design; resolving by procedure id is separate resolver work, deferred.

## NN Decisions: D10 Decide whether high-volume transactional data belongs in a domaiNN
covers:: argon:F1
decision:: defer
consensus:: split
priority:: P2

argon's third sub-problem (thousands of compact rows) is a design-envelope question, not an archival one: model it as distributed instances or periodic models closed with `close_model` ("a log that never ends is closed in segments", `changes/spec_NN.md:187`), or keep it outside the domaiNN. Only argon raised it; luna partially agreed. This is the maintainer's own open question ("casos de uso para los que no fue diseñado") and needs his call. Trigger: a real collection other than runs shows the burying problem.

## NN Decisions: D11 Rewrite the delta's framing
covers:: deepseek:F2, deepseek:F12
decision:: adopt with changes
consensus:: split
priority:: P3

Correct the problem statement (exclusion is enforced by `isExcludedPath` plus three hardcoded skip lists; the measured cost is unknown) and cite `close_model` as the internal precedent. Keep at most one external analogy (luna disagreed that prior art is a defect; it is a framing edit, not a design change). The duplicated hardcoded `archive` skips are a separate cleanup, deferred to the backlog (trigger: any change to exclusion rules).

# Rejected or deferred

- Rejected: D2 cold placement, D3 changeset relocation and seal, D4 compact rotation, D6 universal archive op.
- Deferred: D7 archive_policy (trigger: History list too long after D5), D10 transactional data scope (trigger: a second collection with the problem), the hardcoded-skip cleanup in D11, resolver-by-procedure-id in D9.
- Single-reviewer, not spot-checked, carried only as supporting evidence for rejections already decided: argon:N2, argon:N3, deepseek:N2.

# Execution order

First batch (≤5):
1. D1 + D2 + D3 + D4 + D6: rewrite the delta to the D5 scope, listing the rejected mechanisms as explicit non-goals with their reason.
2. D5: implement the Activas / History projection in the procedures console and the active run listings.
3. D8: record the baseline measurements alongside D5, without attributing any speed-up to the filter.
4. D9: add the "definitions are never archived" constraint to the rewritten delta.

Next queue: D11 framing edit (with the rewrite), then D10 maintainer decision. D7 waits for its trigger.

# Open questions, gaps and run record

- Open: D10 (scope of transactional data). Whether element-level archival is wanted at all once D5 exists (D6).
- Gaps: the first DeepSeek phase-1 delegate was interrupted; a run with a different task id delivered the report and the explicit retry was cancelled before it wrote, to avoid two writers on one file. The report is coherent (12 findings, stable after completion).
- Models actually run: gemini-4-argon (High) via Antigravity, gpt-6-luna via Codex, opencode-go/deepseek-v4.1-flash via OpenCode, claude-opus-5-5 as consolidator.
- A prior single-model critique by Codex gpt-6.2-sol (outside the panel) reached the same verdict; used only as corroboration for D5's "failed close stays active" detail.
- Cost: preflight estimate $0.58 at 2026-11-15 rates; real spend not measured.
