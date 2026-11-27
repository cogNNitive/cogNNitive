---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - luna"
---

# NN Critiques


## NN Critiques: Review of argon F1
target:: argon:F1
stance:: partially agree

Visibility, scan cost, and compact-document growth are distinct concerns, but the evidence does not establish all three as measured problems. procedure_state explicitly reads the full changeset log to reconstruct attempts (procedure-state.ts:376-390), while high-volume compact streams need separate evidence. Restricting the first slice to closed distributed runs is a reasonable scope choice, not a conclusion forced by the cited code.

## NN Critiques: Review of argon F2
target:: argon:F2
stance:: agree

Placement forbids the literal archive (storage.ts:35-39; iNNfo_V_0-9-0_NN.md:172), and archive paths are excluded by existing traversal rules. The execution spec also fixes artifact paths under executions/<run>/outputs, so relocating a run risks invalidating those paths and references. Period partitioning therefore requires a deliberate new placement/resolution contract, not a drop-in cold folder.

## NN Critiques: Review of argon F3
target:: argon:F3
stance:: agree

A post-close hash write contradicts close_model's MODEL_CLOSED rule (changes/spec_NN.md:187), and modifying a closed file changes its hash as a cited evidence source (lines 137, 217). Moving changesets also conflicts with procedure_state's attempt reconstruction from loadChangeLog(root).all (procedure-state.ts:376-390) and the normative changes/ provenance contract (changes/spec_NN.md:165-177). The proposal needs a different seal/index design or should defer relocation.

## NN Critiques: Review of argon F4
target:: argon:F4
stance:: agree

Compact addresses are host-model based (changes/spec_NN.md:132), while extract_instance promotes an element to a distributed instance and re-keys its history (line 197); it does not rotate elements into sibling compact documents. Moving selected elements also affects in-document structure and references. Drop this first-slice requirement rather than substitute remove-and-readd, which is not shown to preserve identity or provenance.

## NN Critiques: Review of argon F5
target:: argon:F5
stance:: partially agree

close_model already marks and freezes a model (changes/spec_NN.md:187), and procedure_state suppresses actions for closed runs (procedure-state.ts:274-281). But this does not prove all closed instances should be hidden or that filtering listings reduces filesystem-scan cost. closed_at and retention windows are additional behavior, not existing facts; separate those choices from reuse of the closed marker.

## NN Critiques: Review of argon F6
target:: argon:F6
stance:: agree

The universal override conflicts with published write policies: read-only permits no writes, append-only forbids instance removal, and scope policy can only tighten (iNNfo_V_0-9-0_NN.md:191-199). close_model also prohibits writes after closure (changes/spec_NN.md:187), so unarchive cannot simply restore mutability. The design must define policy and reference behavior before allowing universal archival.

## NN Critiques: Review of argon F7
target:: argon:F7
stance:: partially agree

The Concept Definition property table has no archive_policy, and terminal transitions belong to fields (iNNfo_V_0-9-0_NN.md:140-152; executions/spec_NN.md:91-96). Retention also needs a time/order source. But changeset amplification is not inherent: replacing an audited archival change with read-time policy is a provenance/product decision, not established by current code.

## NN Critiques: Review of argon F8
target:: argon:F8
stance:: agree

foldStoredRun loads the procedure address recorded by the run from the current repository before folding it (procedure-state.ts:80-90, 238-248). Moving that definition can break historical reads, and evolving its graph can diverge from the recorded run. Specify stable definition resolution/pinning for long-lived runs.

## NN Critiques: Review of deepseek F1
target:: deepseek:F1
stance:: agree

The terminal states have no outgoing transitions (executions/spec_NN.md:91-96), and close_model refuses later writes (changes/spec_NN.md:187). Archived cannot be a post-close state transition under the current contract. An orthogonal visibility/archive mechanism avoids that contradiction, though its metadata and audit location remain unspecified.

## NN Critiques: Review of deepseek F2
target:: deepseek:F2
stance:: partially agree

There are divergent traversal rules: spec.ts skips archive directories (103-123), and apply-change.ts independently skips archive and changes (215-235). However, helpers applies isExcludedPath before parsing candidates (helpers.ts:93-111), and other discovery/lineage consumers use their own walks. The claim needs to distinguish path exclusion from the enumerators that decide which models are visited; it is not simply false or limited to two leaks.

## NN Critiques: Review of deepseek F3
target:: deepseek:F3
stance:: agree

procedure_state is explicitly described as rebuilding attempts from every changeset (procedure-state.ts:376-390); the other cited paths have pruning/skip behavior. The proposal supplies no measurements for its broad claim that every scan, validation, payload, and changes listing pays this cost. Separate console clutter from changeset-scan performance and measure before making relocation a goal.

## NN Critiques: Review of deepseek F4
target:: deepseek:F4
stance:: agree

Lineage is built from the filesystem snapshot, which excludes paths matching path-exclusion rules (fs-snapshot.ts:22-33). Since archive is reserved/excluded, moving changesets there would remove them from snapshot-derived history unless readers change. The proposal's retained-citation and relocation requirements are therefore in substantive tension.

## NN Critiques: Review of deepseek F5
target:: deepseek:F5
stance:: agree

move_model changes an instance id and its descendants while moving the folder, and placement validation checks the expected folder (changes/spec_NN.md:193-195; placement.ts:113-121, 171-179). Cold relocation with unchanged ids therefore needs indirection/indexing or violates the existing identity grammar. The delta asserts stable resolution while leaving that mechanism undecided.

## NN Critiques: Review of deepseek F6
target:: deepseek:F6
stance:: agree

extract_instance promotes compact elements into distributed instance models and rejects concepts not distributed (changes/spec_NN.md:197); it cannot implement sibling compact-segment rotation. remove-and-readd is not shown to preserve address or provenance, so drop rotation or define a distinct migration contract rather than treat the alternative as equivalent.

## NN Critiques: Review of deepseek F7
target:: deepseek:F7
stance:: agree

The normative Concept Definition property list has no archive_policy (iNNfo_V_0-9-0_NN.md:140-152), and execution transitions are field-level (executions/spec_NN.md:91-96). The proposal does not define ordering for keep or behavior of after on open instances. A closed timestamp may help, but it is a new design choice, not existing support.

## NN Critiques: Review of deepseek F8
target:: deepseek:F8
stance:: partially agree

write_policy and scope inheritance make the universal override problematic (iNNfo_V_0-9-0_NN.md:191-199), and the proposal does not reconcile archival with immutable closure. But visibility-only metadata may differ from removing or relocating an instance, so limiting eligibility to concepts allowing those mutations does not necessarily follow. Define which archival changes count as writes and honor policy.

## NN Critiques: Review of deepseek F9
target:: deepseek:F9
stance:: agree

The normative op list does not include archive/unarchive (changes/spec_NN.md:177-180). The delta also requires archival after close_model, which bars writes to that model (line 187), while requiring archival to be recorded as a change. Define the operation, record location, and how it preserves closed-model provenance.

## NN Critiques: Review of deepseek F10
target:: deepseek:F10
stance:: partially agree

helpers filters excluded paths before parsing candidates (helpers.ts:93-111), and cognitivize rejects excluded paths (cognitivize.ts:68-74), so excluded trees are not ordinary discovery/input. Yet the remedy assumes all list/validation walks prune uniformly; the code has distinct traversals, including explicit archive skips in spec.ts and apply-change.ts. Name the APIs and preserve direct lookup/citation behavior; a separate index is possible, not proven necessary.

## NN Critiques: Review of deepseek F11
target:: deepseek:F11
stance:: partially agree

Physical moves, changeset relocation, and compact rotation each add identity/provenance constraints, while the brief supplies no measurements showing they are needed for the active-console complaint. But an external marker is not yet shown safe for read-only/append-only scopes or consistent with change-only provenance. Treat it as a scope proposal and specify its authority, lookup, and history.

## NN Critiques: Review of deepseek F12
target:: deepseek:F12
stance:: disagree

The analogies are not themselves contract violations, and the report offers a framing preference rather than evidence that the proposal fails. close_model is relevant precedent for immutable completed runs (changes/spec_NN.md:187; executions/spec_NN.md:284), but does not prove archive semantics should copy its governance model. This is not a technical finding requiring a design change.

# NN Findings

No additional unreported issue identified after checking the proposal against the cited storage, placement, changeset, discovery, and procedure-state contracts.
