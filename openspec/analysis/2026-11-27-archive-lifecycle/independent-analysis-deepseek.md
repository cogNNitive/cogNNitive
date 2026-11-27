---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - deepseek"
---

# NN Findings

## NN Findings: F1 Archival as run state is already refuted by the proposal; adopt the orthogonal axis and drop the state framing
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/executions/spec_NN.md:95, iNNfo/specs/bluepriNNts/executions/spec_NN.md:284, iNNfo/specs/bluepriNNts/changes/spec_NN.md:187, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:6
recommendation:: Close open question 1 in favor of the orthogonal axis (visibility and placement, never a stored field) before any requirement is written, and state that an `archive` change is a metadata/placement operation, not a write to the run model.

The maintainer's first instinct was to add a final `Archived` state to every procedure. That is impossible on the current contract and the proposal already says so in its own open questions: `state` declares `"completed": [], "failed": [], "cancelled": []` (terminal, no outgoing edge), the run is closed with `close_model` after that terminal state, and `close_model` refuses every write to the model afterwards, including the change that would carry the state transition. So one of the two framings has to die, and it should be the state one. The proposal is right to lean toward an orthogonal axis but keeps the state idea alive as an unresolved question, which is exactly the kind of ambiguity that produces an `archived` value in `state::` in the first applied changeset. The first slice should say plainly: archival is a property of where and whether an element is presented, expressed outside the element's own fields.

## NN Findings: F2 The "archive is invisible to discovery" premise is false; the real leaks are two hardcoded folder skips
category:: improvement
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/naming/contract.ts:131, iNNfo/packages/nn-core/src/naming/contract.ts:194, iNNfo/packages/nn-core/src/naming/contract.ts:195, iNNfo/packages/nn-mcp/src/tools/spec.ts:117, iNNfo/packages/nn-mcp/src/tools/spec.ts:118, iNNfo/packages/nn-mcp/src/tools/apply-change.ts:224
recommendation:: Rewrite the problem statement around the exact code paths that drop archived models (the model-file walks in `spec.ts` and `apply-change.ts`), and state that `archive` and `staging` are excluded at any depth.

The delta claims "the only way out is a path segment named `archive`, which `isExcludedPath` makes invisible to discovery". That is half true and it points at the wrong lever. `IGNORED_DIRECTORIES` is documented as roots only, and the code confirms it: only `segs[0]` is looked up in that set; nested exclusions come from the separate rule that bites on any segment. The consequence is that a nested `archive/` folder under an existing placement is already excluded from every `isExcludedPath` consumer, but the two model-file walks that feed ids and reference pre-checks do not consult `isExcludedPath` at all: they keep their own hardcoded skip list with a case-folded `archive`, and `apply-change.ts` additionally skips any path containing `/archive/`. That divergence is the actual mechanism of the bug the maintainer hit, and it is not what the proposal's headline describes.

## NN Findings: F3 The "unbounded changes/ listing" argument rests on one speculative reader while every hot-path reader is bounded by traversal depth
category:: improvement
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:386, iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:378, iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:22, iNNfo/packages/nn-mcp/src/tools/spec.ts:110, iNNfo/packages/nn-mcp/src/tools/apply-change.ts:228
recommendation:: Drop the `changes/` growth from the problem framing unless a measured cost exists, or measure `procedure_state` on a real domaiNN of forty runs and report the number in the delta.

The economic case for moving changesets is weaker than the delta implies. `procedure_state` is the only stated consumer that reads every changeset, and its own doc comment narrows that to `state.attempts`. The other walks are pruned before they reach the changesets: the lineage snapshot aborts on any excluded segment, `spec.ts` caps recursion at depth eight and skips `archive`, and `apply-change.ts` skips `changes/` outright. "Every scan, validation, console payload and `changes/` listing pays for them" is not supported by the corpus; the visible cost is console burying plus one reader the delta does not name.

## NN Findings: F4 Moving a changeset into a cold zone changes lineage without any mechanism, because lineage is built from the snapshot
category:: refactor
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:22, iNNfo/packages/nn-core/src/changelog/node.ts:8, iNNfo/packages/nn-core/src/changelog/node.ts:9, iNNfo/packages/nn-core/src/lineage/project.ts:262, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:50
recommendation:: Make the lineage consequence explicit in the delta: either the cold zone stays inside the snapshot walk (so nothing changes for the log) or the delta states which readers lose history, with a test.

The proposal requires both that a citation into an archived element "still validates" and that a run's changesets move out of `changes/` into a period partition. Those two requirements meet in the lineage code. The snapshots it builds prune any excluded segment, and lineage is exactly `buildChangeLog(readLineageSnapshot(...))`. So a cold zone reusing the already-reserved `archive` literal would silently amputate those units from the change log, lineage and every history reader, while a zone that chooses a fresh literal adds a fourth reserved word to a contract that already reserves three. The delta lists the resolver question as open but never says that the change log itself is at stake.

## NN Findings: F5 Identity is positional, so "the archived element resolves at its unchanged hierarchical id" cannot hold once it moves
category:: refactor
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/domain/placement.ts:113, iNNfo/packages/nn-core/src/domain/placement.ts:117, iNNfo/packages/nn-core/src/domain/placement.ts:121, iNNfo/packages/nn-core/src/domain/placement.ts:175, iNNfo/specs/bluepriNNts/changes/spec_NN.md:194
recommendation:: Choose one of the two honest options in the delta and write the tradeoff: an archived id gains a segment (a documented id change with a retarget pass), or archival never moves the file and only marks it.

A distributed instance id is the `{slug}` segments of its placement, its folder is derived from that id, and a mismatch between placement and folder is a hard layout error naming the expected folder. That is the design: `move_model` changes the id and moves the folder together, and "Recorded targets are never rewritten: the fold carries them forward". The delta's requirement that a moved archived element "keep its slugs and hierarchical ids, so every existing address resolves" therefore asks the filesystem and the resolver to disagree with the grammar, which is precisely the state a validator is built to report. Either archival is a rename with a recorded target change, or it does not move.

## NN Findings: F6 The compact-rotation requirement proposes `extract_instance`, the wrong operation with the opposite direction
category:: change
impact:: high
effort:: medium
risk:: medium
evidence:: verified
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:9, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:79, iNNfo/specs/bluepriNNts/changes/spec_NN.md:197
recommendation:: Replace the rotation requirement with `remove_element` plus a re-add into the archive segment, or drop the requirement from the first slice; delete the `extract_instance` idea.

`extract_instance` takes a compact element and makes it the root of a new distributed instance model on a blueprint that declares the concept distributed. The rotation requirement asks for the opposite: elements of a compact concept must stay elements, move to a sibling segment document of the same blueprint, and keep their slugs. The delta notes the extract idea as "not yet validated against that operation's contract"; reading the contract makes it clear it can never satisfy that requirement, and keeping it in the open-questions list invites an implementer to try.

## NN Findings: F7 Archive policy as a Concept property ignores that "terminal" only exists on fields, and `keep`/`after` semantics do not survive one read
category:: improvement
impact:: medium
effort:: medium
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/iNNfo_V_0-9-0_NN.md:142, iNNfo/specs/bluepriNNts/executions/spec_NN.md:95, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:39, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:44
recommendation:: Define `archive_policy` against a named field (`terminal_field:: state`) and specify both keys with a failure case, or defer the policy requirement behind the single-run archive requirement.

The Concept Definition property table is a closed list of eight properties; adding `archive_policy::` is a vocabulary change at Level 1, not a local one, and the delta does not say so. Moreover "a Concept Definition that declares a terminal state" has no referent: terminality lives on a select field's `transitions::` map in the executions blueprint, not on the concept. And the policy as written leaves two questions a pass cannot answer: whether `keep: 5` counts the ordering by the terminal transition's `applied_at` (the only order the change log defines) and whether `after` on a run that is still open is a no-op or an error.

## NN Findings: F8 "Any Level-3 element is archivable" collides with the append-only and read-only policies
category:: change
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/specs/iNNfo_V_0-9-0_NN.md:196, iNNfo/specs/iNNfo_V_0-9-0_NN.md:199, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:15, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:17
recommendation:: Scope the universal requirement to "every element whose concept allows a remove or a placement change", or state that archive is exempt from write policy by name, with the reason.

An `archive` change that moves or restyles an element is a write to that element. `append-only` says a written value is never removed "nor is the instance", and `read-only` says no write at all; the policy cascades and a scope document can only tighten it. The delta nonetheless requires that anything be archivable "whatever its concept declares" and that an archived element resolve as `read-only`, "overriding its concept and scope write policy". That is two overrides in one requirement, and the second one loosens a scope-tightened policy from a lower level.

## NN Findings: F9 The archive mechanism is described twice with contradictory meanings and interrupts the change log
category:: improvement
impact:: medium
effort:: low
risk:: medium
evidence:: verified
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:16, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:40, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:68, iNNfo/specs/bluepriNNts/changes/spec_NN.md:218
recommendation:: Say whether `archive` is a new `op::` value or a `produce_artifact`-style record, and state that an archival recorded after `close_model` lives outside the closed model's log.

The delta names an `archive` change and an `unarchive` change without placing them in the op table, which is a closed enum a change is validated against. It also says a pass "MUST record each archival as a change", but a changeset cannot be written into a closed model, so either the record goes to a different model or the requirement contradicts the executions contract on the very next page. And because changes are ordered by `(applied_at, changeset stamp, ...)`, an archival recorded later lands after the run's terminal state in the same unit history, so a reader folding "the run as it was at close" has to know to stop.

## NN Findings: F10 Bulk validation and console cost must be handled at the walk, not by an `isExcludedPath` carve-out; F5's open question in the delta understates it
category:: improvement
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/packages/nn-core/src/helpers.ts:95, iNNfo/packages/nn-core/src/helpers.ts:111, iNNfo/packages/nn-core/src/cognitivize/cognitivize.ts:73, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:7
recommendation:: Replace "MUST NOT be hidden from discovery by a reserved path segment alone" with the concrete rule the code can support: the walks that back `list_knowledge` and validation prune archived trees deliberately, and a separate reader serves archived models.

Model discovery is `collectModels`, which filters on `isModelCandidate` after a full read and parse of every `_NN.md` file it reaches. To make archived models leave the hot path you must stop reading them during discovery, which means pruning the folder, which means they are absent from `list_knowledge`; to keep "every existing address resolves" you must still read them on demand. That is a second index over an excluded subtree, not a predicate change. `cognitivize` already rejects any excluded path, so the archived subtree will also stop receiving sidecars, which is fine for a frozen record but should be stated rather than discovered.

## NN Findings: F11 The per-period cold placement is YAGNI for the first slice; the smallest correct slice is marking plus listing filters plus one honest move
category:: improvement
impact:: high
effort:: low
risk:: low
evidence:: inferred
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:3, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:65, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:79
recommendation:: Ship slice one as: (a) an orthogonal `archived` marker recorded outside the element, (b) console and listing exclusion with an explicit include, (c) `read_knowledge`/`procedure_state` still resolving the id, and leave every placement move, period partition, changeset relocation and compact rotation to a second change with a measured cost.

The proposal bundles five independent mechanisms: a marker, a policy engine, a resolver for a cold zone, a changeset move with a seal, and compact segment rotation. Each one touches a different contract, and four of the five depend on the still-undecided identity question in F5. Only the marker plus the exclusion plus the still-resolvable read are needed to stop archived runs burying the active ones, which is the maintainer's actual complaint. The rest is design momentum.

## NN Findings: F12 The cited prior art answers a different question and should not carry the framing
category:: improvement
impact:: low
effort:: low
risk:: low
evidence:: verified
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:3, iNNfo/specs/bluepriNNts/executions/spec_NN.md:261
recommendation:: Keep at most one analogy, cite it in one clause, and drop Obsidian's exclusion modes; they illustrate a filesystem feature, not the archive problem.

Jira archives whole projects, Kubernetes deletes finished Jobs, and event-sourcing snapshots one aggregate: none of them keeps every address resolvable while removing bytes from the reading path, which is the exact tension this proposal must resolve. In iNNfo that tension already has a settled precedent worth citing instead: closing a run is a governance event outside the run's own reachable lifecycle, decided by the runner and not by a request. That is the pattern archival should copy, and the delta never mentions it.
