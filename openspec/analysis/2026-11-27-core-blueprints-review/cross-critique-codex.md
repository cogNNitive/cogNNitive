---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - codex"
---

# NN Critiques

The eight bluepriNNts were assessed against commit `ed80ad93b344089e00d7aa15062b9519b6e3440a`. The supplied study proposal is a local analysis artifact, not a file in that commit; its claims are proposals, not independent evidence. Verdicts map refine to `partially agree` and dispute to `disagree`.

## NN Critiques: Review of gemini F1
target:: gemini:F1
stance:: disagree

**Dispute.** The parent versions and distributed placement are accurately cited, but version differences alone do not establish harmful drift or an extra tooling burden. `executions/spec_NN.md:220` explicitly explains the separation: a procedure is a definition, an execution is a versioned run. Definition and instance pairs are related, not duplicate records: one definition can have many independently evolving runs. Distributed placement does not prove a merged blueprint preserves discovery, addressing, loading, schema resolution, or existing execution records. Changing parent bindings and versioning is a public-format migration, not a demonstrated medium-effort, medium-risk cleanup. Harmonize versions separately only where compatibility is verified; retain the boundary absent evidence of a concrete problem. A merge now is speculative architectural churn, not necessary simplification.

## NN Critiques: Review of gemini F2
target:: gemini:F2
stance:: disagree

**Dispute.** Sources and sidecars overlap on paths and sometimes origin, and lineage projects cognitivized files (`iNNfo/packages/nn-core/src/lineage/project.ts:1-8`). But `sources/spec_NN.md:92-114` additionally defines summaries, tags, source type and operational status; `sidecar/spec_NN.md:36-84,128` does not provide equivalent semantic inventory. Optional origin metadata is not universally present. The claim that every import must have a manually created catalog row is not established by the cited spec alone; `skills/nn-sources/SKILL.md:234-247` does prescribe agent registration. Synchronizations include declarations with no landed file, paused state, and mirrored models (`sources/spec_NN.md:38-43,64-79,147-159`), so sidecars cannot replace them. `iNNfo/packages/nn-core/src/sync/declarations.ts:1-2` reads the sources catalog, making relocation a consumer and data migration, not low-risk deletion. First measure actual duplication and usage; retain semantic metadata and compatible sync discovery if any consolidation is pursued.

## NN Critiques: Review of gemini F3
target:: gemini:F3
stance:: disagree

**Dispute.** The artifact concept and overlap are real, but its spec is 106 lines at this commit, not 84. The catalog carries summaries, publication status, tags and model links (`artifacts/spec_NN.md:39-78`); a per-run artifact, `produce_artifact` ledger entry, or dynamically discovered file is not shown to reproduce those semantics. The cited references do not prove the blueprint is orphaned, required in every domain, or that a domain must index it; `domaiNN/spec_NN.md:188-190` says a simple domain needs only two concepts. Deprecation plus moving registrations would affect existing models, consumers, and publication metadata. Treat optional catalog simplification as an evidence-gathering question, not a low-risk removal; a new domain-root deliverables catalog could merely move the index and add coupling.

## NN Critiques: Review of gemini F4
target:: gemini:F4
stance:: partially agree

**Refine.** `executions/spec_NN.md:98-103` does define one union of options and transitions for two concepts, including separate initial transitions; schema-level selection can therefore admit an inappropriate initial status unless another check enforces concept-specific constraints. The proposed state diagrams omit legitimate retries, loop resets and artifact revalidation (lines 102, 264-266). No cited implementation shows added parser complexity or an actual accepted invalid transition. Separate fields might express the constraint but rename the persisted `status` contract and require runner, existing run, and migration changes; risk is not automatically low. Prefer retaining `status` and adding concept-scoped validation if supported, after testing the real validator; preserve all existing transitions.

## NN Critiques: Review of gemini F5
target:: gemini:F5
stance:: partially agree

**Refine.** `blank` is core in `iNNfo/specs/bluepriNNts/catalog.json:38-41` and is minimal (`blank/spec_NN.md:28-45,49-57`). That does not establish that core means runtime infrastructure: core can mean bundled or always available. `scripts/blueprint-catalog.mjs:326` generates only `core` or `free`, so inventing `starter` is not a metadata-only change. Moving to `free` may alter availability or hydration (`scripts/blueprint-catalog.mjs:67`); investigate consumers and offline behavior first. A separate category solely for conceptual neatness would be YAGNI. If taxonomy is demonstrably misleading, document it or change the classification with availability tests.

## NN Critiques: Review of gemini F6
target:: gemini:F6
stance:: partially agree

**Refine.** The mismatch is real: `blank/spec_NN.md:5-8` declares iNNfo V_0-6-0 and blank V_0-4-1 while lines 63, 106, 119, 132-133, and 140 refer to older versions. Correct the parent-chain example and stale meta-spec prose. For Level 3, follow the current canonical parent-name convention rather than blindly copying the Level 2 `blueprint_version` into `parent_spec.name` (compare `executions/spec_NN.md:286-292`). The report does not demonstrate that copied examples are rejected: the blank URL is unversioned and resolver compatibility must be tested. This is a useful documentation correction, not a proven critical runtime failure; avoid changing actual parent versions merely to make examples match.

## NN Critiques: Review of gemini F7
target:: gemini:F7
stance:: partially agree

**Refine.** The odd wording is real: `executions/spec_NN.md:209-212` assigns `rev` both artifact revision and input value, whereas lines 55-60 and 228-234 describe an input as having both value and revision. However, restricting revisions to cryptographic hashes contradicts the same line: element origins and applied change paths are also valid revisions. The runtime types explicitly distinguish input `value` and `rev` (`iNNfo/packages/nn-core/src/procedure/types.ts:127-128,229-231`), so establish the actual persisted reader/writer contract before calling this only naming confusion or prescribing a rename. Clarify or repair the schema to preserve both meanings, with compatibility for existing runs; repurposing `rev` risks staleness and replay regressions.

## NN Critiques: Review of gemini F8
target:: gemini:F8
stance:: partially agree

**Refine.** The fields are declared against a list concept but the example serializes them as YAML frontmatter (`sidecar/spec_NN.md:28-84,104-124`). Explicitly stating that metadata is frontmatter would clarify the boundary, but the example and rules already show it, and the report supplies no validator producing false positives. Sidecars are explicitly not models (lines 92-94), and the body may contain normalized binary content, so do not prescribe generic model validation or a new serialization subsystem. Also distinguish required and optional keys (lines 128-130): not every field is present in every sidecar. A brief clarification is proportionate.

## NN Critiques: Review of gemini F9
target:: gemini:F9
stance:: disagree

**Dispute.** The one-line JSON representation and 256 KiB per text are accurately described at `executions/spec_NN.md:193-196,252`. The finding establishes a readability tradeoff, not parsing failures or actual history bloat. More importantly, the existing contract validates all entries, writes inside the run, removes output on failed commit, and records a hash and step in the atomic changeset (lines 252, 270-273). Replacing payloads with staged paths introduces file lifecycle, access control, path traversal, cleanup, and time-of-check/time-of-use questions; a temporary path can disappear or change before consumption. It would also change console and `procedure_record` contracts. Keep the current self-contained request unless measured limits justify a compatible staged alternative with equivalent snapshot, validation and cleanup guarantees.

# NN Findings

## NN Findings: N1 Correct the domaiNN parent-chain objective
category:: improvement
impact:: low
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md:5, iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md:124
recommendation:: Align the stated parent chain with the declared iNNfo parent version, without changing the actual parent binding.
tags:: [domaiNN, documentation, versioning]

The frontmatter binds the blueprint to iNNfo V_0-6-0, but its offline-resolution objective says V_0-5-0. This is independently observable documentation drift; it does not prove an offline resolution failure.
