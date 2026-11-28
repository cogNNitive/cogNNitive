---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - codex"
---

# NN Findings

## NN Findings: F1 Preserve run identity and lifecycle before merging blueprints
category:: change
impact:: high
effort:: high
risk:: high
evidence:: inferred
code_ref:: temp/analysis/core-blueprints-review/study-proposal.md:65, iNNfo/specs/bluepriNNts/executions/spec_NN.md:33, iNNfo/specs/bluepriNNts/executions/spec_NN.md:277, iNNfo/specs/bluepriNNts/changes/spec_NN.md:213
recommendation:: Prototype a merged schema with explicit backward-compatible parent-spec resolution and migration of existing run models, then verify run addressing, closure, citations, and concurrency before removing executions.
tags:: [consolidation, executions, compatibility]

A single specification could describe both definitions and runs, but shared subject matter does not make their records interchangeable: executions have distributed placement, guarded write sequencing, terminal closure, and citation semantics. The proposal's promise to preserve all runner capabilities is not established by the schemas alone. Retaining the existing executions parent as a compatibility alias or delaying its removal trades some catalog simplicity for safe replay and migration; runtime implementation and migration costs were not reviewed here.

## NN Findings: F2 Do not discard semantic source inventory with sidecars
category:: change
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: temp/analysis/core-blueprints-review/study-proposal.md:25, iNNfo/specs/bluepriNNts/sources/spec_NN.md:53, iNNfo/specs/bluepriNNts/sources/spec_NN.md:92, iNNfo/specs/bluepriNNts/sources/spec_NN.md:97, iNNfo/specs/bluepriNNts/sidecar/spec_NN.md:36
recommendation:: Define where source type, semantic summary, and operational status live and how they are queried before replacing Source catalog entries with a projection.
tags:: [sources, sidecar, lineage]

The source catalog contains semantic and operational data beyond the sidecar's file identity and integrity metadata. A filesystem projection may eliminate redundant path and hash bookkeeping, but cannot reconstruct an authored summary or processing state from the sidecar fields specified here. Preserve those values, or explicitly approve their loss, and compare inventory queries before migrating; projection capabilities were not inspected.

## NN Findings: F3 Preserve synchronization declarations independently of imports
category:: improvement
impact:: high
effort:: medium
risk:: high
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/sources/spec_NN.md:38, iNNfo/specs/bluepriNNts/sources/spec_NN.md:64, iNNfo/specs/bluepriNNts/sources/spec_NN.md:75, iNNfo/specs/bluepriNNts/sources/spec_NN.md:159, iNNfo/specs/bluepriNNts/sidecar/spec_NN.md:66
recommendation:: If Synchronization moves into domaiNN, migrate each declaration including alias, origin, kind, and paused state, and preserve existing sync lookup until migrated workspaces have been verified.
tags:: [synchronization, migration]

A synchronization is a durable instruction for future on-demand imports, including paused origins and mirrored models; a sidecar's optional synchronization alias describes an already landed subject. Scanning files cannot recover all declarations. Moving the concept can reduce an index document, but only with an explicit compatibility and migration contract.

## NN Findings: F4 Separate deliverable catalog semantics from run artifacts
category:: refactor
impact:: high
effort:: medium
risk:: medium
evidence:: inferred
code_ref:: temp/analysis/core-blueprints-review/study-proposal.md:39, iNNfo/specs/bluepriNNts/artifacts/spec_NN.md:51, iNNfo/specs/bluepriNNts/artifacts/spec_NN.md:56, iNNfo/specs/bluepriNNts/artifacts/spec_NN.md:62, iNNfo/specs/bluepriNNts/executions/spec_NN.md:48, iNNfo/specs/bluepriNNts/executions/spec_NN.md:198
recommendation:: Keep a curated deliverable record with summary, lifecycle, and model or file link when moving Artifact into domaiNN, and use projections only to populate demonstrably derivable fields.
tags:: [artifacts, consolidation]

Run Artifact records track per-run verification and revisions, whereas the artifacts catalog specifies a human-facing summary, lifecycle, and deliverable link. A mutation or filesystem artifact is not necessarily the same semantic entity as a curated deliverable. Consolidation can remove one catalog without dropping that distinction, but automated equivalence and runtime behavior are unverified.

## NN Findings: F5 Preserve definition and execution concepts rather than deduplicating names
category:: refactor
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: temp/analysis/core-blueprints-review/study-proposal.md:30, iNNfo/specs/bluepriNNts/procedures/spec_NN.md:117, iNNfo/specs/bluepriNNts/procedures/spec_NN.md:133, iNNfo/specs/bluepriNNts/executions/spec_NN.md:41, iNNfo/specs/bluepriNNts/executions/spec_NN.md:76, iNNfo/specs/bluepriNNts/executions/spec_NN.md:105
recommendation:: If the specifications are combined, retain explicit definition and run concepts and document their mapping instead of merging Work with Step Run or Artifact with Run Artifact.
tags:: [procedures, modeling, yagni]

Work declares step types and conditions; Step Run records mutable state, attempts, and the definition revision used. These are definition-versus-instance relationships, not necessarily redundant concepts. One blueprint may improve discoverability, but collapsing these records would lose the distinction between a reusable process and each execution; avoid a broad model redesign merely to reduce blueprint count.

## NN Findings: F6 Reclassify blank without breaking existing parent references
category:: change
impact:: medium
effort:: medium
risk:: medium
evidence:: inferred
code_ref:: temp/analysis/core-blueprints-review/study-proposal.md:81, iNNfo/specs/bluepriNNts/blank/spec_NN.md:51, iNNfo/specs/bluepriNNts/blank/spec_NN.md:59, iNNfo/specs/bluepriNNts/blank/spec_NN.md:103
recommendation:: Treat blank as a starter in discovery and presentation first, while retaining resolution of existing blank parent_spec references; change catalog tier only after checking its supported values and consumers.
tags:: [blank, classification, compatibility]

The blueprint itself describes an intentionally minimal starter and an existing Level-3 parent, which supports changing how it is presented without changing its identity. Whether starter or free is a valid tier, and whether tier changes affect installation or resolution, cannot be established from these files. Reclassification is useful but does not by itself justify a migration framework.

## NN Findings: F7 Update stale version examples in the maintained specifications
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md:6, iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md:124, iNNfo/specs/bluepriNNts/blank/spec_NN.md:6, iNNfo/specs/bluepriNNts/blank/spec_NN.md:63, iNNfo/specs/bluepriNNts/blank/spec_NN.md:129
recommendation:: Align explanatory parent-chain and meta-template examples with each document's current frontmatter, then add a documentation consistency check if an existing validator can express it.
tags:: [documentation, versions]

Both frontmatters name iNNfo V_0-6-0, while domaiNN describes V_0-5-0 and blank describes and illustrates V_0-3-0. These examples can mislead authors during any consolidation, independently of the chosen architecture. Verify the intended compatibility chain before changing URLs; this review establishes the inconsistency, not which historical references must remain.

