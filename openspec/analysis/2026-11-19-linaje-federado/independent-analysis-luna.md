---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - luna"
---

Panel note: this review ran single-provider (`opencode-go`). It is not a
multi-provider verdict; a shared-serving bias cannot be ruled out.

# NN Findings

## NN Findings: F1 Model-only domain sync leaves the screenshot unsolved
category:: change
impact:: high
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/sync/refresh.ts:114, iNNfo/packages/nn-core/src/sync/refresh.ts:240
recommendation:: Treat asset transfer as a separate requirement from federated evidence: the scenario needs the article bytes to reach coNNtent, either through an explicit asset-transfer rule or through a staged copy in AI_stack that its domain sync can already carry.

A domain origin is detected by `domaiNN_NN.md`; non-model files in a domain are excluded, and refresh imports raw files only in the non-domain path. This confirms the stated obstacle and means the four proposed pieces do not by themselves make the full scenario work. Federated evidence cannot provide the screenshot.

## NN Findings: F2 Mirror references are already a working mechanism
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/validator/workspaceReferences.ts:164, iNNfo/packages/nn-core/src/validator/workspaceReferences.ts:231, docs/documentation/content/how-to/synchronize-an-origin.md:45
recommendation:: Retain mirror addressing and its drift validation, and extend its use for provenance instead of replacing sync or reference handling.

Typed `reference` fields parse mirror addresses, resolve them through an alias-specific index and report missing models or elements. The docs additionally prescribe frozen slugs to keep those references stable. This supports "do not rewrite" for the addressing layer.

## NN Findings: F3 Mirror addresses do not satisfy the evidence contract today
category:: change
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/sync/address.ts:26, iNNfo/packages/nn-core/src/sourceRef.ts:604, iNNfo/packages/nn-core/src/validator/workspaceSources.ts:109, iNNfo/packages/nn-mcp/src/tools/validate.ts:358
recommendation:: Add and test a mirror-aware evidence parse and resolve path across core validation and MCP, and stop describing it as a grammar-only edit.

Mirror parsing is a distinct parser for model element addresses, while citation validation calls `parseCitation` and then a workspace `SourceResolver`. A `.md@<element-slug>` mirror reference does not match the raw Markdown citation heading-unit grammar. Evidence validation also depends on resolving both the parsed path and the unit.

## NN Findings: F4 A parseable evidence address does not make read_lineage federated
category:: change
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:17, iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:33, iNNfo/packages/nn-core/src/lineage/project.ts:245, iNNfo/packages/nn-core/src/lineage/project.ts:435
recommendation:: Specify the cross-domain traversal as its own requirement: define how the mirror's owner, its source change and the next evidence edge are loaded and versioned.

The filesystem snapshot explicitly skips `sources/sync`, and the projection runs over one workspace's snapshot and log. An evidence edge may name a citation, but the local projection neither loads the origin's change log nor recursively expands the mirror. The proposal's step 4 therefore needs a reader, not just a parser.

## NN Findings: F5 The proposed lock overlaps an existing hash mechanism
category:: improvement
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/sync/refresh.ts:37, iNNfo/packages/nn-core/src/sync/refresh.ts:264, iNNfo/packages/nn-core/src/changelog/drift.ts:190
recommendation:: Test first whether the existing per-evidence `evidence_sha256` mechanism can anchor the required upstream revision, and add a separate lock only if it must identify a whole origin snapshot or a transitive closure.

Refresh computes and returns tree digests but does not persist them in that module. Separately, the change log already stores evidence-file hashes and can detect changed evidence. That existing mechanism does not lock a whole domain, and it does not preserve prior model states, which is the gap a lock would fill — but the overlap must be measured before new state is introduced.

## NN Findings: F6 domain_id is useful identity but not proven to block a content lock
category:: improvement
impact:: medium
effort:: low
risk:: medium
evidence:: inferred
code_ref:: iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md:57, iNNfo/packages/nn-core/src/sync/refresh.ts:63
recommendation:: Separate issuer identity from content identity. For the stated local scenario, test a consumer-scoped alias plus content digest before making `domain_id` a prerequisite, and reserve stable domain identity for cross-machine or issuer-sensitive use.

The blueprint defines a display `name`, not a `domain_id`, and refresh already computes content digests. The claim that a lock "locks nothing" without global identity is therefore overstated for a consumer-local content pin, though stable issuer identity still matters for attribution and for domain renames.

## NN Findings: F7 Exporting lineage needs an explicit privacy contract
category:: change
impact:: high
effort:: medium
risk:: high
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/lineage/project.ts:31, iNNfo/packages/nn-core/src/lineage/project.ts:98, iNNfo/packages/nn-core/src/lineage/project.ts:461
recommendation:: Define an export allowlist and redaction policy before producing bundles, and test it against paths, citations and change identifiers.

Projection fields carry workspace-relative raw, model and artifact references plus citations, and edges carry change IDs. "Reachable from exported models" limits scope but does not itself redact sensitive path or evidence values.

## Judgement

Preserve the current sync and mirror references. Solve the missing article-byte transfer. Then add a mirror-aware evidence resolver that can traverse the origin's versioned lineage. Defer `domain_id` until its identity semantics are specified, and defer bundles until it is shown that existing evidence hashes plus some version-retention mechanism cannot meet offline historical traversal. A bundle may be needed for durable transitive history, but the proposal does not establish that it transports the screenshot bytes.
