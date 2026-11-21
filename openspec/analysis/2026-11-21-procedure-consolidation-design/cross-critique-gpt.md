---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - gpt"
---

# NN Critiques

## NN Critiques: Review of deepseek F1
target:: deepseek:F1
stance:: agree

The design asserts an implicit precondition but supplies no writer-observed value to compare (odd/designs/procedure-consolidation.md:59-63). Existing `from` validation is explicitly restricted to `update_field` (iNNfo/packages/nn-core/src/changeset/conflicts.ts:270-291), whereas the proposed claim and completion use `set_fields` (odd/designs/procedure-consolidation.md:110). An explicit expected value and an atomic check at apply are needed; state alone also needs an attempt fence (N1).

## NN Critiques: Review of deepseek F2
target:: deepseek:F2
stance:: agree

The proposed predicate compares a gate on the Video element to that element's hash (odd/designs/procedure-consolidation.md:48-53), but script approval is calculated from multiple scene subjects and verdicts (iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:353-378; temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md:500-508). Model-targeted gates are a distinct declared unit (iNNfo/packages/nn-core/src/changeset/gates.ts:65-81). Specify subject selection, current verdict and hash semantics before promising this generic condition; a universal quantifier alone does not define the relevant subjects or their hashes.

## NN Critiques: Review of deepseek F3
target:: deepseek:F3
stance:: partially agree

The missing `failed_qa -> approved` edge follows from the approval write and reconciliation (iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:394-402; iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/episode.mjs:255-260), contrary to odd/designs/procedure-consolidation.md:48. The delivery branch can write `delivered` even when its local status is already `delivered` (pipeline.mjs:753-761), but that branch alone does not prove a complete execution reaches it in that state: the earlier approval step can change the status. Preserve same-value writes or demonstrate reachability with an integration test rather than call the full rerun verified. The table is explicitly provisional (odd/designs/procedure-consolidation.md:55).

## NN Critiques: Review of deepseek F4
target:: deepseek:F4
stance:: partially agree

Autopilot skips an unconfigured script gate and can complete without human approval (iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:344-353; temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md:557-560), conflicting with an unconditional `requires` (odd/designs/procedure-consolidation.md:49-53). However, the report conflates the blueprint's gate declarations with an episode's configured `review_gates`: declaring a gate does not mean it is enabled for an episode. Treating undeclared gate names as vacuous could hide a typo or remove a mandatory control. Define conditional applicability against the actual configuration, and test both autopilot and configured-gate cases.

## NN Critiques: Review of deepseek F5
target:: deepseek:F5
stance:: partially agree

Whole-domain log loading is an observed cost in the existing input-revision path (iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:150-164), and `since` alone cannot provide the proposed timeline or output attribution (odd/designs/procedure-consolidation.md:91-106, 162). But B1 already explicitly includes a change-log filter by run (odd/designs/procedure-consolidation.md:152), so it is inaccurate to say it only adds frontmatter. Require measured bounded-read behavior and retention/completeness evidence before removing events; neither current code nor the report proves the proposed model is slower than event replay.

## NN Critiques: Review of deepseek F6
target:: deepseek:F6
stance:: partially agree

One mutable row overwrites the current attempt's inputs and failure (odd/designs/procedure-consolidation.md:79-85, 99-101), whereas existing events retain individual starts and failures (iNNfo/packages/nn-core/src/procedure/types.ts:73-85; iNNfo/packages/nn-core/src/procedure/fold.ts:39-50). This does not establish that history is erased: D2 intends the changes to be the history (odd/designs/procedure-consolidation.md:20, 106). Specify and test reconstruction of every attempt, including frozen inputs and failure, and state the retention tradeoff. Per-attempt rows are an alternative with storage and complexity costs, not demonstrably free.

## NN Critiques: Review of deepseek F7
target:: deepseek:F7
stance:: partially agree

Start currently resolves the graph but does not reject its error diagnostics before writing a run (iNNfo/packages/nn-mcp/src/tools/procedure-record.ts:111-113, 150-178); a null start blocks the fold (iNNfo/packages/nn-core/src/procedure/fold.ts:65-70). Rejecting error-severity diagnostics is a useful acceptance criterion, including `UNKNOWN_NEXT` (iNNfo/packages/nn-core/src/procedure/graph.ts:80-92). However, the design does more than add an address: it specifies building the graph from the selected container's children (odd/designs/procedure-consolidation.md:131-133), which can eliminate the multiple starts caused by mixing sub-procedures. That graph-scoping fix and diagnostic validation are separate requirements.

## NN Critiques: Review of deepseek F8
target:: deepseek:F8
stance:: partially agree

`Work.produces` already holds a path or address (odd/designs/procedure-runner.md:53-57; iNNfo/packages/nn-core/src/procedure/graph.ts:63-76), so adding `Artifact.at` can create conflicting sources (odd/designs/procedure-consolidation.md:114-116). Specify ownership or synchronization. The default `verify` is derived from `at`, however, so the design does not require a third written copy; an explicitly overridden verifier can also intentionally differ from the output address.

## NN Critiques: Review of deepseek F9
target:: deepseek:F9
stance:: partially agree

Unknown placeholders survive substitution (iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:131-138), and the corpus command needs a usable episode value (temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md:480-486). The migration should declare required slots and test missing and substituted values (odd/designs/procedure-consolidation.md:131-135). But supplied `params` are copied directly even when no slot is declared (iNNfo/packages/nn-mcp/src/tools/procedure-record.ts:108-123); the report's claim that parameters are filled exclusively from declared slots is false. Reject unresolved recognized placeholders, not arbitrary braces that might belong to shell syntax.

## NN Critiques: Review of deepseek F10
target:: deepseek:F10
stance:: partially agree

A transition relation does not by itself encode producibility or pin policy (iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/detect-state.mjs:84-85; iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/episode.mjs:36-44). Specify which policies remain separate. But the design does not promise to replace those two constants: they appear in the inventory, while the consumer promise names `EPISODE_STATUSES`, `REFUSED_STATUSES` and pipeline guards (odd/designs/procedure-consolidation.md:31-33, 67-71). A terminal state is not necessarily a sufficient definition of the states a particular operation refuses. Deferring the widget or MCP exposure is a scope choice, not a verified defect.

## NN Critiques: Review of deepseek F11
target:: deepseek:F11
stance:: partially agree

A gate changeset must carry human/console provenance and a named reviewer (iNNfo/packages/nn-core/src/changeset/gates.ts:100-128); the design needs a way to attach the right run context across that handoff (odd/designs/procedure-consolidation.md:89-95). Human authorship does not mean a human step cannot produce a changeset, nor does it make attribution impossible. Also, an approval verdict is not necessarily the origin change of the approved element, so the proposed origin query is not established to be incomplete merely because a verdict lacks run context. Define whether out-of-run verdicts can satisfy a run and how their provenance is represented.

# NN Findings

## NN Findings: N1 Fence engine completion by attempt, not status alone
category:: change
impact:: high
effort:: medium
risk:: high
evidence:: inferred
code_ref:: odd/designs/procedure-consolidation.md:80, odd/designs/procedure-consolidation.md:85, odd/designs/procedure-consolidation.md:104, odd/designs/procedure-consolidation.md:110, iNNfo/packages/nn-mcp/src/tools/procedure-record.ts:442
recommendation:: Atomically compare an immutable claim or attempt token on completion and specify safe recovery of timed-out work and its external effects.
tags:: [concurrency, engine, recovery]

The proposed completion checks `active`, while retry returns the same row to `active` with a new attempt. If an old worker resumes after recovery and a new claim, its `from: active` can match the newer attempt and incorrectly finish it (an ABA race). The 300-second age test is not proof that the original process and its side effects have stopped; the current engine uses a bounded child-process timeout, but the proposed separate claim and completion do not specify a fencing or cancellation guarantee. Test a delayed old completion against a newer attempt and address duplicate external effects separately from the row update.

## NN Findings: N2 Require an affirmative current gate verdict
category:: change
impact:: high
effort:: medium
risk:: high
evidence:: inferred
code_ref:: odd/designs/procedure-consolidation.md:49, odd/designs/procedure-consolidation.md:53, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:360, temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md:500
recommendation:: Define gate satisfaction using the current effective affirmative verdict for each applicable subject, including superseding rejection and the applicable hash.
tags:: [gates, authorization]

The proposed condition says an applied `review_gate` with a matching name, target and hash holds; it does not require an approval verdict or say how a later rejection supersedes an earlier approval. The procedure allows both `approved` and `needs-change` verdicts, and the existing pipeline checks derived subject states for `approved`, not merely existence of a matching gate (corpus:500-508; pipeline.mjs:360-378). As written, a matching negative or superseded verdict could satisfy the declared transition. Pin these cases in apply-time tests alongside subject selection.
