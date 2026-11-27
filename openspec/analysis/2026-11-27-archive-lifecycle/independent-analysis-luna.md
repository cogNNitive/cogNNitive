---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - luna"
---

# NN Findings
## NN Findings: F1 Archiving is not yet a demonstrated solution to the measured hot-path cost
category:: improvement
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:375, iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:386, iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:17, iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:38
recommendation:: First measure and address the actual read paths; do not promise that archive alone bounds scans, validation, payloads, or `changes/` until each consumer has an explicit archive-aware query/index strategy.
tags:: [performance, procedures, lineage]

`procedure_state` explicitly rebuilds attempts from the whole domaiNN change log on each read, while lineage walks the workspace snapshot. The proposal describes hiding archived elements and separately moving only single-instance changesets; mixed changesets remain hot, and no bounded lookup/index is specified. Archiving can improve active projections, but the claim that it fixes every listed cost is unsupported. The smallest first slice should target a measured active-list/console projection, not bundle storage migration and provenance compaction.
## NN Findings: F2 `Archived` cannot be modeled as an ordinary terminal write to closed runs
category:: change
impact:: high
effort:: medium
risk:: high
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/executions/spec_NN.md:91, iNNfo/specs/bluepriNNts/executions/spec_NN.md:95, iNNfo/specs/bluepriNNts/changes/spec_NN.md:187, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:25
recommendation:: Keep archival orthogonal to run state and define how archive metadata is recorded outside a closed model, with idempotence and atomicity specified.
tags:: [procedures, lifecycle, changesets]

The run state machine has only `completed`, `failed`, and `cancelled` as terminal states, each with no outgoing transitions; `close_model` then refuses every write, including in the closing changeset. The proposal notices this in its open questions, but its general `archive`/`unarchive` change and automatic pass do not resolve the authority boundary. Reopening or appending to a closed run would contradict the contract. Treat archival as index/placement metadata managed externally or via a narrowly specified lifecycle record, not a new run state.
## NN Findings: F3 A universal archive override conflicts with the existing write-policy lattice
category:: change
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: iNNfo/specs/iNNfo_V_0-9-0_NN.md:191, iNNfo/specs/iNNfo_V_0-9-0_NN.md:195, iNNfo/specs/iNNfo_V_0-9-0_NN.md:199, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:15
recommendation:: Specify archival as a lifecycle/visibility flag that only tightens effective writes, and define the exact restore semantics without weakening scope or concept policy.
tags:: [write-policy, storage]

The established policy cascades from blueprint/concept/scope and scopes may only keep or tighten policy; `mutable`, `append-only`, and `read-only` have distinct add/update/remove semantics. Requirement 1 makes every element archivable and says unarchive restores its prior policy, but leaves unclear whether archive/unarchive are exempt from that policy and how restoration composes with a policy that changed while archived. A generic override risks making append-only/read-only models mutable through lifecycle operations.
## NN Findings: F4 Cold placement and segment rotation contradict the current identity and placement contracts
category:: change
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: iNNfo/specs/iNNfo_V_0-9-0_NN.md:167, iNNfo/specs/iNNfo_V_0-9-0_NN.md:172, iNNfo/specs/bluepriNNts/changes/spec_NN.md:193, iNNfo/specs/bluepriNNts/changes/spec_NN.md:194, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:67, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:79
recommendation:: Defer physical moves and compact rotation; first preserve canonical placement and identity while adding an archive-aware projection/index.
tags:: [identity, placement, compact-storage]

Placement is the sole declared source of truth for distributed instance location, with reserved `archive` excluded from placement templates. `move_model` already changes model id and descendant ids and requires all typed references to be retargeted, whereas requirement 6 expects cold placement but stable hierarchical IDs; requirement 7 expects compact elements to migrate between documents yet retain their IDs. Those are not just storage details: resolver, references, lineage, and existing move/extract semantics need a complete identity-preserving indirection contract before these requirements can be accepted.
## NN Findings: F5 Moving changesets breaks the single permanent provenance log unless the fold contract changes
category:: change
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/changes/spec_NN.md:165, iNNfo/specs/bluepriNNts/changes/spec_NN.md:177, iNNfo/specs/bluepriNNts/changes/spec_NN.md:224, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:65
recommendation:: Keep the authoritative changesets in `changes/` in the initial design; if log partitioning is later justified, specify a manifest/index and replay/verification semantics for every reader.
tags:: [provenance, changesets, lineage]

The change contract calls changesets the single authoritative mutation/provenance medium and says they are permanently recorded; changes are atomic/possibly mixed-model, and rejected/applied outcomes are part of that history. Moving model-only changesets to a cold location makes the normative `changes/` log incomplete and requires every fold, query, lineage, audit, and replay path to discover the partitions. Hashing the final log is not a substitute for specifying the changed source-of-truth and query contract. Mixed changesets staying in place also means the proposed relocation cannot bound all change-list growth.
## NN Findings: F6 Automatic policy is underspecified and adds a scheduler before the manual lifecycle is proven
category:: improvement
impact:: medium
effort:: high
risk:: medium
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/executions/spec_NN.md:95, iNNfo/specs/bluepriNNts/executions/spec_NN.md:96, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:37, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:40
recommendation:: Defer `archive_policy` and archival passes; prove one explicit archive/unarchive flow first, then add policy only with defined clocks, ordering, and failure/retry guarantees.
tags:: [automation, yAGNI, procedures]

The proposed policy supports duration-after-terminal and keep-count, but neither the generic terminal-state vocabulary nor the pass's ordering, scheduling, retry behavior, concurrency, or transaction boundary is defined. Procedure state itself is folded/derived, and state values differ by concept. Automating archive, while the underlying archive operation and location semantics remain unresolved, compounds rather than resolves the design questions. It is reasonable future functionality, not a first-slice requirement.
## NN Findings: F7 The change needs to be reconciled with the two existing execution proposals before expanding its scope
category:: improvement
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: openspec/changes/private-run-outputs/specs/executions/spec.md:17, openspec/changes/private-run-outputs/specs/executions/spec.md:26, openspec/changes/execution-rebase-rows/specs/executions/spec.md:3, openspec/changes/execution-rebase-rows/specs/executions/spec.md:17
recommendation:: Keep archive lifecycle independent of both changes unless a concrete conflict is demonstrated; explicitly preserve their atomic output and rebase behavior in any later run-storage migration.
tags:: [scope, procedures, open-changes]

The two open execution changes establish active behavior around writes under `executions/<run>/` and adding rows to a run on rebase. They do not establish an archival interface or create an immediate reason to relocate run models and their histories. If archive work is intended to alter the run model's storage or write lifecycle, its spec must state compatibility and sequencing against these changes; otherwise the new proposal is broader than the current demonstrated need.

## NN Findings: F8 The first slice should be a reversible, non-moving active-view projection
category:: improvement
impact:: high
effort:: low
risk:: low
evidence:: inferred
code_ref:: iNNfo/packages/nn-core/src/naming/contract.ts:191, iNNfo/packages/nn-core/src/naming/contract.ts:305, iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:17, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:13
recommendation:: Narrow the first slice to explicit archive metadata plus an opt-in include-archived query for one real high-volume collection; keep files and history in their current canonical locations until measured costs justify migration.
tags:: [scope, smallest-slice, discovery]

This avoids immediately changing model IDs, physical placement, compact storage, or the permanent provenance log. It still must be implemented above discovery's excluded-path predicate: merely placing an item under `archive/` hides it from model discovery and the filesystem lineage snapshot. The proposal's central visibility objective is sound, but identity-preserving archival is better separated from the later optimization of cold storage.