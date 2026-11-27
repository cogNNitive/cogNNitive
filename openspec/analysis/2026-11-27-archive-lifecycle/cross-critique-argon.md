---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Cross critique - argon"
---

# NN Critiques

## NN Critiques: Review of luna F1
target:: luna:F1
stance:: agree

Verified against `iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:375-390` and `iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:17-56`. `procedureState` calls `loadChangeLog(root).all` on every read to compute `runAttemptsOf`, and `loadChangeLog` (`iNNfo/packages/nn-core/src/changelog/node.ts:8-9`) parses the entire workspace snapshot returned by `readLineageSnapshot`. Similarly, `discoverDomainModels` (`iNNfo/packages/nn-core/src/helpers.ts:77-136`) reads and parses every non-excluded `_NN.md` file on disk before building the domain index. Because Requirement 4 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:50`) still requires discovery, the resolver, and lineage to resolve archived elements by hierarchical ID, and Requirement 5 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:69`) leaves mixed-model changesets in `changes/`, the proposal does not actually define a bounded index or lazy lookup path that eliminates those reads. Narrowing the first slice to a measured active-projection problem before coupling it to physical file moves is the right call.

## NN Critiques: Review of luna F2
target:: luna:F2
stance:: agree

Verified against `iNNfo/specs/bluepriNNts/executions/spec_NN.md:91-95`, `iNNfo/specs/bluepriNNts/executions/spec_NN.md:284`, and `iNNfo/specs/bluepriNNts/changes/spec_NN.md:187`. In `executions/spec_NN.md:95`, `state` declares `"completed": [], "failed": [], "cancelled": []` with no outgoing transitions. Once a run reaches one of those terminal states, it is closed via `close_model`, which sets `closed: true` in frontmatter and rejects any subsequent write—even in the closing changeset itself—with `MODEL_CLOSED`. Requirement 2 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:29`) acknowledges that archiving must not require a write after `close_model`, so keeping "Archived as a procedure state" alive as an open question only introduces contradiction. Archival must be orthogonal to the run's `state::` field and recorded outside the closed run model.

## NN Critiques: Review of luna F3
target:: luna:F3
stance:: agree

Verified against `iNNfo/specs/iNNfo_V_0-9-0_NN.md:191-210` and `openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:15-17`. In Level 1, `write_policy` (`mutable > append-only > read-only`) is declared on blueprint frontmatter, Concept Definitions, or scope documents—never stored as a per-element field that needs to be snapshotted and "restored". While treating an archived element as effectively `read-only` is a valid tightening down the lattice, phrasing `unarchive` as restoring a "prior write policy" ignores that the underlying concept or scope policy may have been tightened while the element was archived; unarchiving should simply remove the archive read-only clamp so the live blueprint/concept/scope cascade applies again. Furthermore, if `archive` performs a physical mutation or removal (such as compact segment rotation in Requirement 6), allowing it "whatever its concept declares" directly collides with `append-only` ("never changed or removed, nor is the instance") and `read-only` ("no write") unless the lifecycle layer's authority boundary is explicitly defined.

## NN Critiques: Review of luna F4
target:: luna:F4
stance:: agree

Verified against `iNNfo/specs/iNNfo_V_0-9-0_NN.md:167-172`, `iNNfo/packages/nn-core/src/schema/storage.ts:39,93`, `iNNfo/packages/nn-core/src/domain/classify.ts:46-103`, `iNNfo/packages/nn-core/src/domain/placement.ts:112-122,168-179`, and `iNNfo/specs/bluepriNNts/changes/spec_NN.md:194`. Distributed instance identity and folder path are bijectively coupled by the concept's single `placement::` template (which forbids the reserved `archive` literal). Moving an instance folder away from its declared `placement::` causes `matchFolder` (`classify.ts:46`) to return `null`, triggers `PLACEMENT_MISMATCH` in `localDiagnostics` (`placement.ts:173`), and for nested distributed concepts with `container::` loses container slug recovery if the prefix diverges. Likewise, for compact models, `idOf` (`classify.ts:101`) is the file stem (`displayStem(basenameOf(input.path))`), so moving compact elements into a sibling segment file changes their `<model-id>@<slug>` address unless a multi-file model federation contract is introduced. Deferring physical moves and compact rotation is essential.

## NN Critiques: Review of luna F5
target:: luna:F5
stance:: agree

Verified against `iNNfo/specs/bluepriNNts/changes/spec_NN.md:165,177,218-224` and `iNNfo/packages/nn-core/src/changelog/load.ts:75-97`. The Changeset Blueprint defines `changes/` at the domain root as the permanent provenance log, and every unit's history is folded in total order `(applied_at, changeset stamp, filename, document index)`. Moving single-instance changesets out of `changes/` fragments the log across per-instance cold directories, while Requirement 5 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:69`) leaves multi-model changesets behind in `changes/`. A hash seal on the instance (`spec.md:68`) cannot substitute for the missing changeset units when `loadChangeLog`, `projectLineage`, or audit tools reconstruct provenance edges or verify `run:: <run-id>@<step-slug>` attributions (`changes/spec_NN.md:222`).

## NN Critiques: Review of luna F6
target:: luna:F6
stance:: agree

Verified against `openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:37-47` and `iNNfo/specs/bluepriNNts/executions/spec_NN.md:91-96`. Requirement 3 introduces declarative `archive_policy::` with `after` and `keep` and assumes an automatic "archival pass", but leaves the trigger mechanism, clock source, ordering timestamp, failure/retry semantics, and concurrency with active runner writes completely unspecified. Because manual archival semantics (how and where an archival record is written without violating `MODEL_CLOSED`) are not yet settled, bundling an automatic policy engine into the first slice is premature.

## NN Critiques: Review of luna F7
target:: luna:F7
stance:: agree

Verified against `openspec/changes/private-run-outputs/specs/executions/spec.md:17-29` (`iNNfo/specs/bluepriNNts/executions/spec_NN.md:279`) and `openspec/changes/execution-rebase-rows/specs/executions/spec.md:3-25`. In fact, the interaction with `private-run-outputs` is even sharper than a sequencing concern: `private-run-outputs` writes step deliverables to `executions/<run>/outputs/<slug>/<name>` and records that exact domain-relative path in the `Run Artifact` row's `value::` field before the run is eventually closed with `close_model`. If Requirement 5 physically moves `executions/<run>/` to a period-partitioned cold placement, the literal path recorded in `Run Artifact` `value::` inside the closed, immutable run model becomes dangling. Keeping the first slice non-moving avoids breaking `private-run-outputs`.

## NN Critiques: Review of luna F8
target:: luna:F8
stance:: agree

Verified against `iNNfo/packages/nn-core/src/naming/contract.ts:191-196,305-312` and `iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:17-22`. A non-moving, reversible active-view projection (recording archival metadata outside closed models, filtering archived items out of default console and listing views with an explicit opt-in include flag, and keeping files and changesets in their canonical locations) directly solves the maintainer's primary problem—active runs and elements being buried in the console—without breaking hierarchical IDs, `close_model`, `Run Artifact` paths, or `loadChangeLog`.

## NN Critiques: Review of deepseek F1
target:: deepseek:F1
stance:: agree

Verified against `iNNfo/specs/bluepriNNts/executions/spec_NN.md:95,284`, `iNNfo/specs/bluepriNNts/changes/spec_NN.md:187`, and `openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:6,29`. Because `state` has no outgoing edges from `completed`, `failed`, or `cancelled` and `close_model` permanently blocks any write to the run document (`MODEL_CLOSED`), archival cannot be a value of `state::` or a field mutation on the closed run. Open question 1 should be closed immediately in favor of the orthogonal lifecycle axis.

## NN Critiques: Review of deepseek F2
target:: deepseek:F2
stance:: partially agree

Checked against `iNNfo/packages/nn-core/src/naming/contract.ts:131,192-196,305-312,331-355`, `iNNfo/packages/nn-core/src/helpers.ts:39-43,95,111`, `iNNfo/packages/nn-mcp/src/tools/spec.ts:117-119`, and `iNNfo/packages/nn-mcp/src/tools/apply-change.ts:221-250`. DeepSeek is right that directory-walk pruning in `helpers.ts:39-42`, `spec.ts:118`, and `apply-change.ts:225` hardcodes a case-insensitive `'archive'` directory skip before per-file predicates run. However, the headline claim that the proposal's `isExcludedPath` premise is "false" and that the model-file walks "do not consult `isExcludedPath` at all" is inaccurate: `isExcludedPath` (`contract.ts:192-196`) checks both `IGNORED_DIRECTORIES.has(segs[0])` at the root and `segs.some((s) => s === 'archive' || s === 'staging' || ...)` at any depth, and it is directly called by `isModelCandidate` (`contract.ts:308`), `isConsoleModel` (`contract.ts:336`), `collectModels` (`helpers.ts:95`), `readLineageSnapshot` (`fs-snapshot.ts:22`), and `findAllWorkspaceModelFiles` (`apply-change.ts:245`). Both the directory-walk skip lists and `isExcludedPath` enforce the exclusion of `archive` segments.

## NN Critiques: Review of deepseek F3
target:: deepseek:F3
stance:: partially agree

Checked against `iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:375-390`, `iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:17-56`, `iNNfo/packages/nn-core/src/changelog/node.ts:8-9`, `iNNfo/packages/nn-mcp/src/tools/spec.ts:103-131`, and `iNNfo/packages/nn-mcp/src/tools/apply-change.ts:221-250`. I agree with the recommendation not to use unmeasured `changes/` growth to justify changeset relocation in the first slice. However, the claim that "the other walks are pruned before they reach the changesets: the lineage snapshot aborts on any excluded segment, `spec.ts` caps recursion at depth eight..." is factually incorrect. `changes/` (depth 1) and `executions/<run>/` (depth 2) are well within depth 8 and are not excluded by `isExcludedPath`; `readLineageSnapshot` (`fs-snapshot.ts:38-53`) explicitly reads and parses every changeset in `changes/` and every non-excluded `knowledge` model (`role !== 'knowledge' && role !== 'changeset'`), feeding both `loadChangeLog` and `projectLineage`. Only `findAllWorkspaceModelFiles` in `apply-change.ts:224,234` skips `changes/` (while still scanning every `executions/<run>/` model file).

## NN Critiques: Review of deepseek F4
target:: deepseek:F4
stance:: agree

Verified against `iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:22`, `iNNfo/packages/nn-core/src/changelog/node.ts:8-9`, and `iNNfo/packages/nn-core/src/lineage/project.ts:255-263`. Because `loadChangeLog` and `projectLineage` operate directly on `readLineageSnapshot(rootDir)`, which prunes any path matching `isExcludedPath`, moving a run's changesets into an excluded `archive` segment silently drops those changesets from the change log and breaks provenance and lineage edges (violating Requirement 4, `openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:50-51`). Conversely, moving them to a non-excluded folder leaves them in `readLineageSnapshot`, saving none of the snapshot or change-log load cost.

## NN Critiques: Review of deepseek F5
target:: deepseek:F5
stance:: agree

Verified against `iNNfo/packages/nn-core/src/domain/placement.ts:112-122,168-179`, `iNNfo/packages/nn-core/src/domain/classify.ts:46-97,100-103`, and `iNNfo/specs/bluepriNNts/changes/spec_NN.md:194`. An instance model's folder and hierarchical ID are tied to the concept's single declared `placement::` rule: `matchFolder` requires the directory segments to match `rule.folder` exactly (`classify.ts:48`), `localDiagnostics` reports `PLACEMENT_MISMATCH` whenever `!matched` (`placement.ts:170-179`), and for nested distributed concepts with `container::`, moving the file outside the container's folder match causes `containerSlugs` (`classify.ts:60-64`) to return `[]`, corrupting `idOf`. Therefore, an archived instance cannot move to a cold path while keeping its hierarchical ID unchanged unless the placement and domain-index contracts are redesigned around multi-zone resolution.

## NN Critiques: Review of deepseek F6
target:: deepseek:F6
stance:: agree

Verified against `openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:9,77-86` and `iNNfo/specs/bluepriNNts/changes/spec_NN.md:197`. `extract_instance` converts a compact element into the root of a distributed instance model and rejects any concept that is not declared `storage:: distributed` with `EXTRACT_NOT_DISTRIBUTED`. It cannot move compact elements into a sibling compact segment document. Note also that in DeepSeek's recommendation, the first option (`remove_element` plus re-add into a sibling archive segment document) would still change the element's `<model-id>@<slug>` address because a compact model's ID is derived from its filename stem (`classify.ts:101`); therefore, the second option in DeepSeek's recommendation—dropping compact segment rotation from the first slice and deleting the `extract_instance` suggestion—is the right choice.

## NN Critiques: Review of deepseek F7
target:: deepseek:F7
stance:: agree

Verified against `iNNfo/specs/iNNfo_V_0-9-0_NN.md:142-152`, `iNNfo/specs/bluepriNNts/executions/spec_NN.md:91-95,183-188`, and `openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:39-47`. The Concept Definition property table in `iNNfo_V_0-9-0_NN.md:142-152` is a closed list of nine properties (`slug`, `type`, `icon`, `color`, `weight`, `storage`, `container`, `placement`, `write_policy`), so adding `archive_policy::` is a Level-1 grammar change. Furthermore, terminality is declared via `transitions::` on a `select` Field Definition (`executions/spec_NN.md:95` for `Procedure Execution.state` and `executions/spec_NN.md:187` for `Step Request.request_status`), never on a Concept Definition, and `keep`/`after` leave their ordering clock and open-instance behavior undefined.

## NN Critiques: Review of deepseek F8
target:: deepseek:F8
stance:: partially agree

Checked against `iNNfo/specs/iNNfo_V_0-9-0_NN.md:191-210` and `openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:15-17`. I agree that allowing an `archive` operation to physically mutate or remove an element "whatever its concept declares" collides with `append-only` ("a written value is never changed or removed, nor is the instance") and `read-only` ("no write"), and that `unarchive` must not restore a stale snapshot of a write policy if a scope or concept tightened it in the meantime. However, DeepSeek's claim that resolving an archived element as `read-only` "loosens a scope-tightened policy from a lower level" gets the lattice direction backward: in `mutable > append-only > read-only` (`iNNfo_V_0-9-0_NN.md:199`), `read-only` is the most restrictive bottom element, so clamping an archived element to `read-only` always tightens (or preserves) the effective policy, never loosens it.

## NN Critiques: Review of deepseek F9
target:: deepseek:F9
stance:: agree

Verified against `openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:15-16,29,40,68` and `iNNfo/specs/bluepriNNts/changes/spec_NN.md:38-40,180,187,218`. `Change.op` is a closed 23-value enum (`changes/spec_NN.md:40`), and the proposal never specifies whether `archive` and `unarchive` are new `op::` values, what target address they record, or how recording an archival change avoids `MODEL_CLOSED` (`changes/spec_NN.md:187`) when the target is a closed run (`spec.md:29`). Because unit histories are ordered by `(applied_at, changeset stamp, filename, document index)` (`changes/spec_NN.md:218`), any change targeting the closed run after `close_model` lands after the closing event in the model's history.

## NN Critiques: Review of deepseek F10
target:: deepseek:F10
stance:: agree

Verified against `iNNfo/packages/nn-core/src/helpers.ts:64-75,77-117`, `iNNfo/packages/nn-core/src/cognitivize/cognitivize.ts:73`, and `openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:7,50-53`. In `collectModels` (`helpers.ts:95-115`), every non-excluded `_NN.md` file is read from disk (`readFile`), has its frontmatter parsed, passes `isModelCandidate`, and is then parsed in full (`elementsOf` calls `parseKnowledge(content)` at `helpers.ts:68`) to populate `DomainModelInput`. Flipping `isExcludedPath` or adding a predicate after `readFile`/`parseKnowledge` does not remove archived models from the hot discovery and validation walk; pruning them at walk time while still resolving their hierarchical IDs on demand requires an explicit split between hot-walk discovery and on-demand/cold resolution.

## NN Critiques: Review of deepseek F11
target:: deepseek:F11
stance:: agree

Verified against `openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:3,13-86`. The delta conflates five distinct mechanisms (lifecycle marking, policy scheduling, cold directory placement, changeset partitioning with hash sealing, and compact segment rotation). Delivering the first slice as an orthogonal archive marker recorded outside closed models, default exclusion from console and active listing views with an explicit opt-in include filter, and preserved ID resolution for `read_knowledge` and `procedure_state`—with zero physical file or changeset moves—solves the immediate UX and listing problem cleanly with low risk.

## NN Critiques: Review of deepseek F12
target:: deepseek:F12
stance:: agree

Verified against `openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:3` and `iNNfo/specs/bluepriNNts/executions/spec_NN.md:261,284-286`. External analogies like Kubernetes job TTL deletion contradict the requirement that archived runs remain permanently resolvable and citable, whereas iNNfo's own `close_model` governance event in `executions/spec_NN.md:261,284` is the direct internal precedent to build upon.

# NN Findings

## NN Findings: N1 Sealing or moving an archived run after `close_model` breaks `evidence_sha256` citations and `Run Artifact` paths
category:: change
impact:: high
effort:: medium
risk:: high
evidence:: verified
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:55, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:67, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:68, iNNfo/specs/bluepriNNts/changes/spec_NN.md:137, iNNfo/specs/bluepriNNts/changes/spec_NN.md:187, iNNfo/specs/bluepriNNts/changes/spec_NN.md:217, iNNfo/specs/bluepriNNts/executions/spec_NN.md:214, iNNfo/specs/bluepriNNts/executions/spec_NN.md:279
recommendation:: Drop the requirement that an archived instance record a change-log hash inside the model file, and keep archived run folders and changesets at their canonical paths so `evidence_sha256` and `Run Artifact` `value::` paths remain valid.
tags:: [provenance, citations, executions, changesets]

Requirement 5 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:67-68`) mandates that archiving a distributed instance move it and its single-instance changesets to a cold placement and that "the instance MUST record the hash of its final change log". That directly breaks two existing contracts that neither report connects:
1. Under `iNNfo/specs/bluepriNNts/changes/spec_NN.md:217`, a closed run is cited as evidence (`<run id>@<step-slug>`) once closed by `close_model`, and "the engine stamps the closed model file's sha256 in `evidence_sha256` like any source". Writing a change-log hash into the run instance when it is archived later modifies the closed model file's bytes, causing every existing changeset that cited the closed run to fail anchor verification with `EVIDENCE_SOURCE_CHANGED` (`changes/spec_NN.md:137`)—directly violating Requirement 4's scenario "A citation into an archived run still validates" (`archive-lifecycle/spec.md:55-58`).
2. Under `iNNfo/specs/bluepriNNts/executions/spec_NN.md:214,279-280` (and `openspec/changes/private-run-outputs/specs/executions/spec.md:28`), a `Run Artifact` row stores a literal domain-relative path in `value::` (`executions/<run>/outputs/<slug>/<name>` for a private `file` output, or `changes/<file>_changes_NN.md` for a `changeset` output). Moving the `executions/<run>/` directory or relocating its changesets out of `changes/` invalidates those stored paths inside a closed model that `close_model` (`changes/spec_NN.md:187`) forbids updating.

## NN Findings: N2 Compact segment rotation collides with `idOf`, `DUPLICATE_MODEL_ID`, and intra-model relative addressing (`ADDRESS_NOT_CANONICAL`)
category:: change
impact:: high
effort:: high
risk:: high
evidence:: verified
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:79, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:80, iNNfo/packages/nn-core/src/domain/classify.ts:101, iNNfo/packages/nn-core/src/domain/index.ts:124, iNNfo/packages/nn-core/src/domain/index.ts:183, iNNfo/packages/nn-core/src/domain/index.ts:205, iNNfo/packages/nn-core/src/domain/index.ts:229
recommendation:: Remove compact segment rotation (Requirement 6) from the proposal; if multi-file compact partitioning is ever pursued, design it as an explicit multi-segment compact model index contract rather than a lifecycle side-effect.
tags:: [compact-storage, domain-index, addressing]

Requirement 6 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:79-86`) states that archiving elements of a compact concept MUST move them to a sibling archive segment document of the same blueprint while each archived element "resolves at its unchanged hierarchical id". In `iNNfo/packages/nn-core/src/domain/classify.ts:101`, a compact model's ID is derived solely from its filename stem (`displayStem(basenameOf(input.path))`), and a compact element's canonical address (`iNNfo/packages/nn-core/src/domain/index.ts:261`) is `<model-id>@<element-slug>`. This creates an impossible trilemma under the current domain index:
- If the sibling segment document has a different filename stem (for example `risks_2026_business_NN.md`), its `modelId` differs, changing every moved element's address from `<active-stem>@<slug>` to `<segment-stem>@<slug>`.
- If the index instead mapped the sibling segment document to the same `modelId` as the active document, `buildDomainIndex` (`domain/index.ts:118-130`) flags `DUPLICATE_MODEL_ID` whenever `group.length >= 2`, and `byId` (`domain/index.ts:181-184`) returns `undefined` (`group?.length === 1`), breaking resolution of both the active and archived documents (`REF_MODEL_NOT_FOUND`).
- Within a compact model, `resolve` (`domain/index.ts:203-206`) enforces `ADDRESS_NOT_CANONICAL` ("a reference to its own model must be relative; write `@<slug>`") and looks up `@<slug>` only in `elementsOf.get(model.path)` of that single file (`domain/index.ts:221-229`). Moving an element to a sibling file immediately breaks every `@<slug>` reference to or from it with `REF_ELEMENT_NOT_FOUND`.

## NN Findings: N3 Declaring `archive_policy::` on a Level-2 Concept Definition cannot express per-procedure run retention
category:: change
impact:: medium
effort:: medium
risk:: medium
evidence:: verified
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:39, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:44, iNNfo/specs/bluepriNNts/executions/spec_NN.md:33, iNNfo/specs/bluepriNNts/executions/spec_NN.md:71, iNNfo/specs/bluepriNNts/executions/spec_NN.md:227, iNNfo/packages/nn-core/src/naming/contract.ts:186
recommendation:: When retention policies are eventually designed, specify the partitioning key (such as grouping `Procedure Execution` instances by their `procedure::` target address) and allow procedure definitions to declare or override retention for their own runs.
tags:: [procedures, executions, archive-policy]

Requirement 3 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:39`) places `archive_policy::` on a Level-2 `Concept Definition`, while its scenario (`spec.md:44`) states: `GIVEN a procedure whose runs declare archive_policy:: { keep: 5 } and twelve completed runs`. Those two levels do not match in the architecture: individual procedures are Level-3 documents (`*_procedures_NN.md`, `iNNfo/packages/nn-core/src/naming/contract.ts:186`, `iNNfo/specs/bluepriNNts/executions/spec_NN.md:227`), whereas all runs of every procedure in a domaiNN share a single Level-2 Concept Definition, `Procedure Execution`, in `iNNfo/specs/bluepriNNts/executions/spec_NN.md:33-40`, linked to their procedure via the Level-3 field `procedure:: <model>@<element>` (`executions/spec_NN.md:71-74`). A property on `## NN Concept Definition: Procedure Execution` cannot be declared per procedure, and without an explicit `partition_by:: procedure` rule, `keep: 5` on `Procedure Execution` would retain only five runs across the entire domaiNN regardless of how many distinct procedures exist.
