---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - gpt"
---

# NN Findings

## NN Findings: F1 Make run concurrency cover the whole decision
category:: change
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:59, odd/designs/procedure-consolidation.md:110, iNNfo/packages/nn-core/src/changeset/conflicts.ts:257, iNNfo/packages/nn-core/src/changeset/conflicts.ts:270, iNNfo/packages/nn-mcp/src/tools/procedure-record.ts:491
recommendation:: Specify an atomic compare-and-swap on a monotonic run revision for every read-fold-plan-write action, or retain the per-run lock until that invariant is implemented and tested.
tags:: [concurrency, cas]

An implicit current value read at apply is not the value observed when the plan was made; validating an allowed edge does not by itself implement compare-and-swap. Existing `from` checks cover `update_field`, not the proposed `set_fields`; `base_hash` is conditional. Even an explicit status comparison does not guard concurrent input, artifact, pause, rebase, or different-step updates that change the fold, and a status can leave and return to its old value (ABA). CAS must cover the complete decision snapshot under the apply serialization boundary, including terminal closure and start creation; failure must leave every write unapplied. The current lock protects the read-fold-plan-apply window, not merely slug collisions.

## NN Findings: F2 Define crash recovery and fence engine attempts
category:: change
impact:: high
effort:: high
risk:: high
evidence:: inferred
code_ref:: odd/designs/procedure-consolidation.md:85, odd/designs/procedure-consolidation.md:104, odd/designs/procedure-consolidation.md:110, iNNfo/packages/nn-mcp/src/tools/procedure-record.ts:439, iNNfo/packages/nn-mcp/src/tools/procedure-lock.ts:42
recommendation:: Specify a claim identity, bounded execution and fenced completion per attempt, plus an explicit crash-to-retry transition and idempotency or reconciliation rules for external effects.
tags:: [engine, recovery, concurrency]

Age beyond a timeout is suspicion, not proof that a process or its spawned work stopped. A delayed first attempt can complete after a retry claims the same active status unless completion checks an attempt-specific token, and effects produced before a crash cannot be undone by a state CAS. The proposed transition table also has no `active` to retry route: `failed ? active` requires a failure to be recorded, yet crash is only derived. Define the claim time rather than the unspecified last change, termination and recovery behavior, and tests for late completion, crash after side effects, and timeout boundaries. Exactly-once external execution cannot be promised by state CAS alone.

## NN Findings: F3 Preserve the evidence contract before removing events
category:: change
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:79, odd/designs/procedure-consolidation.md:99, odd/designs/procedure-consolidation.md:106, iNNfo/specs/bluepriNNts/executions/spec_NN.md:141, iNNfo/specs/bluepriNNts/executions/spec_NN.md:156, iNNfo/specs/bluepriNNts/executions/spec_NN.md:160, iNNfo/packages/nn-core/src/procedure/fold.ts:39
recommendation:: Keep append-only run facts until a specified, tested history projection preserves attempt-level facts and closed-run citations, or explicitly revise the evidence contract before replacing them.
tags:: [history, evidence, migration]

Mutable rows retain only the latest attempt, outcome, inputs and artifact revision; the proposed run-model change-log timeline must reconstruct each previous attempt, actor, outcome and frozen input, including facts recorded in other models. A closed model is currently itself an append-only citable record; it is not established that a portable closed model plus separately retained domain change files provides equivalent evidence or that citations can address reconstructed facts. Define durable retention, ordering, event-to-change mapping, rejection and correction, citation identities, close atomicity and export/restore before deletion. The claimed 300-second crash check also introduces a change-log read into routine folding; measure full-domain scan cost and specify a correct run-scoped index or stored claim time rather than assuming filtering is cheap.

## NN Findings: F4 Align approval gates with actual review subjects
category:: change
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:39, odd/designs/procedure-consolidation.md:49, odd/designs/procedure-consolidation.md:53, iNNfo/packages/nn-core/src/changeset/gates.ts:72, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:340, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/episode.mjs:242, temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md:500
recommendation:: Model the gate's actual target, verdict, subject hash and aggregation explicitly; retain the existing coNNtent gate resolver until equivalent behavior is demonstrated.
tags:: [gates, review, conntent]

The proposal checks a single gate on the Video element's current hash, while script approval is derived from the subject hashes and verdicts of all scenes; model gates are also valid. A review may be `needs-change`, not an approval, and a named human reviewer alone does not express a positive verdict. The procedure permits omitted gates and an autopilot run with no human approval; a mandatory `gate:script` blocks that case. Changes to status may also change the hashed element, so the meaning and timing of a reviewed hash must be defined. Preserve human-only verdict provenance without claiming that every transition to approved is itself human-authored.

## NN Findings: F5 Correct lifecycle edges and separate policies from transitions
category:: change
impact:: high
effort:: medium
risk:: high
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:48, odd/designs/procedure-consolidation.md:71, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:394, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:635, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs:753, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/episode.mjs:36, iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/detect-state.mjs:84
recommendation:: Derive the table from observed writers and reconciliation, add explicit same-value semantics and initialization, and retain separate producibility and pin policies.
tags:: [state-machine, conntent]

A failed-QA episode is producible, but pipeline promotion can write `failed_qa ? approved`, absent from the proposal. QA can write `approved ? failed_qa`, and successful delivery can write `approved ? delivered`; neither edge is present. Delivery can write `delivered ? delivered` when a new version is created. An options list and transition table do not replace `PIN_OPTIONAL_STATUSES`, and `PRODUCIBLE` is a routing policy distinct from `REFUSED_STATUSES` (delivered is producible by the pipeline but not selected as the next procedure by detection). Test every actual edge and policy before removing constants.

## NN Findings: F6 Scope the generic primitive to demonstrated needs
category:: improvement
impact:: medium
effort:: high
risk:: medium
evidence:: inferred
code_ref:: odd/designs/procedure-consolidation.md:29, odd/designs/procedure-consolidation.md:41, odd/designs/procedure-consolidation.md:59, odd/designs/procedure-consolidation.md:151, iNNfo/packages/nn-core/src/changeset/gates.ts:15
recommendation:: First specify and test plain optional select transitions on two genuinely different lifecycle fields; defer generic gate requirements and universal consumer replacement until their distinct subject semantics are proven.
tags:: [architecture, yagni, meta-spec]

The inventory counts lifecycle fields, not independently verified transition rules or demand for a global approval primitive. Model-level and element-level gates already differ, and aggregate, optional and computed review subjects exceed a string-to-one-gate mapping. A small optional transition constraint may be reusable, but a meta-spec change must define unknown states, creation defaults, unchanged writes, batch ordering, validation of declarations and backward compatibility. The run rows need an unset-to-initial transition too, which the proposed step table omits. A run-specific implementation is a lower-commitment alternative, trading immediate reuse for an evidence-based generic contract later.

## NN Findings: F7 Make artifact provenance and validation explicit
category:: change
impact:: high
effort:: high
risk:: high
evidence:: inferred
code_ref:: odd/designs/procedure-consolidation.md:20, odd/designs/procedure-consolidation.md:91, odd/designs/procedure-consolidation.md:116, odd/designs/procedure-consolidation.md:120, odd/designs/procedure-consolidation.md:124, iNNfo/packages/nn-core/src/procedure/fold.ts:52, temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md:462
recommendation:: Define artifact identity, attempt linkage, verification evidence and revision capture for each kind, including proposed changesets, and enforce immutable snapshots or honestly describe files as hash-verifiable references.
tags:: [artifacts, provenance]

A sealed run-step context identifies an asserted producer, not which declared artifact or attempt a change satisfies, nor proof that a file was verified or a proposed scene changeset was applied or rejected. The origin of an element is its latest applied change, which may be a later edit rather than its producing change; a multi-operation output may span changes. File paths and a record-time digest do not themselves freeze file bytes on closure, especially for mutable domain deliverables. Define missing-file, changed-after-record, rejection, multiple producers, provenance authorization and atomic linkage behavior. Keep explicit run artifact facts where ordinary changes cannot represent these distinctions.

## NN Findings: F8 Make the slices preserve a runnable runner
category:: change
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:87, odd/designs/procedure-consolidation.md:110, odd/designs/procedure-consolidation.md:151, odd/designs/procedure-consolidation.md:153, odd/designs/procedure-consolidation.md:154, iNNfo/packages/nn-mcp/src/tools/procedure-record.ts:303, iNNfo/packages/nn-mcp/src/tools/procedure-record.ts:462
recommendation:: Define B2 as a compatibility-preserving vertical slice with current artifact, input, retry, pause, rebase and close behavior, or land the required B3 capabilities atomically with it.
tags:: [delivery, compatibility]

B2 deletes artifact and input facts and the lock before B3 defines the replacement object verification and revision behavior. The existing runner accepts produced, validated and rejected facts and verifies file artifacts during engine runs, so removing its representation without replacement leaves a gap. Specify the public tool response/action contract, state conversion or a justified no-existing-runs check, and end-to-end proof at each independently landable slice. `add_model` and all per-step initializations also need defined collision and partial-failure behavior, not just a claim that later rows exist.

## NN Findings: F9 Preserve runnable procedure addressing and tool meaning
category:: change
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: odd/designs/procedure-consolidation.md:19, odd/designs/procedure-consolidation.md:116, odd/designs/procedure-consolidation.md:133, odd/designs/procedure-consolidation.md:134, iNNfo/packages/nn-core/src/procedure/graph.ts:36, odd/designs/procedure-runner.md:49, temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md:480
recommendation:: Keep procedures as Level-3 plans, but specify scoped graph resolution, slot declarations and a narrow compatibility mapping for recognized tool values before claiming the real procedure is runnable.
tags:: [levels, graph, procedures]

Separating a plan from the executions blueprint is sound: the run conforms to its own schema while the graph supplies run-specific decisions. This is a useful modeling choice, not proof that every dynamic rule would necessarily collapse levels. The graph currently identifies container parents but computes starts for the entire document. Define descendant selection, references crossing that boundary, artifact ownership, and root addresses consistently. `tool` was retained as a Tool reference in the shipped design, so alias only known literal values rather than reinterpret all references; declare required slots and resolve `{run}` from an unambiguous run identity and workspace root. The sample engine step has stage-specific exit codes, so generic nonzero-as-failure cannot implement its gated flow without an explicit mapping.

# Panel questions

## 1. Level analysis

The plan/schema separation is sensible: procedure data describes what to do and the executions blueprint describes the run. It is not a formal proof that any data-driven constraint would be a level collapse; retain graph rules in the runner and make scoped graph and slot semantics precise (F9).

## 2. State versus events

State rows simplify current-state reads but do not automatically replace append-only facts, attempt evidence, closed-run citations or portable retention. Preserve those properties with a concrete projection contract and measured change-log access, or retain events; a hash and change-log filter alone are not sufficient (F3, F7).

## 3. State-machine primitive and Video table

Optional declared edges may be general enough if demonstrated against independent lifecycles, but the proposed gate condition over-generalizes incompatible subjects and optional approvals. The Video table misses several actual paths and self-writes, while the existing constants encode policies beyond transitions (F4, F5, F6).

## 4. CAS instead of a lock

Optimistic concurrency is viable only with a real atomic precondition on the entire read decision, not an implicit apply-time read or the currently unsupported `set_fields` from check. Engine execution additionally needs attempt fencing and explicit crash and external-effect recovery; retain the lock until equivalent guarantees are demonstrated (F1, F2).

## 5. Procedure objects and provenance

The file/element distinction and run-relative intermediates are useful, but the design does not yet establish safe `{run}` resolution, immutable bytes, attempt-to-artifact association, authoritative element producer identity or the distinction between a proposed and applied changeset. A sealed context is a linkage claim, not validation by itself (F7, F9).

## 6. Slices and decisions

Keep D1 as a practical boundary, condition D2?D5 on proven evidence, concurrency and recovery invariants, and narrow D6 to demonstrated common behavior. Revise A1 and C1 around real gate subjects and observed edges; make B2 and B3 preserve a runnable end-to-end contract at each landing, with collision, closure and failure tests (F1?F9).
