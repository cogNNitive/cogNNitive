---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - argon"
---

# NN Findings

## NN Findings: F1 Separate closed-model visibility, scan indexing, and high-volume stream boundaries
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:3, iNNfo/specs/bluepriNNts/changes/spec_NN.md:187, iNNfo/specs/bluepriNNts/executions/spec_NN.md:284, iNNfo/packages/nn-core/src/naming/contract.ts:331, iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:33
recommendation:: Narrow the archive-lifecycle scope to distributed instances closed via close_model (starting with Procedure Execution runs), use indexing/filtering instead of file relocation for scan performance, and explicitly reject high-volume transactional streams in compact Markdown models.
tags:: [architecture, scope, yagni, storage, executions]

The proposal conflates three distinct problems under one "archival" mechanism: (1) completed procedure runs and closed distributed instances cluttering default console and active listings, (2) full-domain filesystem scans (`readLineageSnapshot`, `loadChangeLog`, validation passes) re-reading immutable historical files on every call, and (3) unbounded row growth inside a single compact Markdown document (2,000+ rows).

Each has a different architectural lever:
- For problem (1), iNNfo already defines a terminal, immutable lifecycle transition: `close_model` sets `closed: true` in the model frontmatter (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:187`, `iNNfo/specs/bluepriNNts/executions/spec_NN.md:284`). Closed runs bury active elements only because `isConsoleModel` (`iNNfo/packages/nn-core/src/naming/contract.ts:331`), console views, and active listings do not filter or collapse models with `closed: true`.
- For problem (2), moving files into a non-excluded cold folder does not stop directory walkers like `readLineageSnapshot` (`iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:33`) from reading them if Requirement 4 still requires discovery and lineage to resolve archived ids. Skipping `closed: true` models during hot validation/listing passes and resolving them lazily by deterministic path (or caching their parsed summaries) removes the scan cost without moving files.
- For problem (3), every element creation or field mutation in iNNfo writes a sealed changeset in `changes/` and tracks per-field provenance units (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:188`). A compact concept with thousands of high-frequency rows exceeds the design envelope of a single Markdown document with changeset provenance; as `iNNfo/specs/bluepriNNts/changes/spec_NN.md:187` already states ("A log that never ends is closed in segments"), high-volume records should be modeled as distributed instances or periodic models closed with `close_model`, not compact rows rotated across sibling files.

## NN Findings: F2 Keep archived distributed instances at their declared placement path
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:67, iNNfo/packages/nn-core/src/schema/storage.ts:39, iNNfo/packages/nn-core/src/schema/storage.ts:58, iNNfo/packages/nn-core/src/schema/storage.ts:291, iNNfo/packages/nn-core/src/naming/contract.ts:192, iNNfo/specs/bluepriNNts/executions/spec_NN.md:279, openspec/changes/private-run-outputs/specs/executions/spec.md:28
recommendation:: Drop Requirement 5's physical movement of distributed instances to period-partitioned cold directories; keep distributed instances at their deterministic placement:: path and treat archival as metadata/visibility state.
tags:: [storage, placement, executions, private-run-outputs]

Requirement 5 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:67`) mandates moving an archived distributed instance to a cold placement partitioned by period (such as `<placement>/archive/<period>/`). This breaks four existing contracts:
1. **Deterministic placement resolution**: `parsePlacement` (`iNNfo/packages/nn-core/src/schema/storage.ts:58`) restricts placement templates to kebab-case literals, `{slug}`, and an optional leading `{container}`, while `instanceFileName` (`iNNfo/packages/nn-core/src/naming/contract.ts:77`) derives the filename from the folder slug. Together they make `(concept, hierarchical_id) -> file_path` a pure O(1) calculation. Partitioning instances by period on disk destroys path determinism, forcing `findKnowledgeFile` and the resolver to scan all period folders or maintain a secondary index/stub.
2. **Reserved path segments**: `RESERVED_LITERALS` (`iNNfo/packages/nn-core/src/schema/storage.ts:39`) forbids `archive` in any placement template, and `isExcludedPath` (`iNNfo/packages/nn-core/src/naming/contract.ts:192`) prunes any path containing an `archive` segment from discovery and lineage (`iNNfo/packages/nn-core/src/lineage/fs-snapshot.ts:22`).
3. **Private run output paths**: Both `iNNfo/specs/bluepriNNts/executions/spec_NN.md:279` and `openspec/changes/private-run-outputs/specs/executions/spec.md:28` require the runner to write human step deliverables to `executions/<run>/outputs/<slug>/<name>` and store that exact domain-relative path in the `Run Artifact` row's `value::` field. Moving `executions/<run>/` to a cold directory after `close_model` breaks every stored `value::` path inside the closed run (which can no longer be updated) as well as any external `evidence::` or `produce_artifact` citation pointing to that path.
4. **Physical container nesting**: In `validateStorage` (`iNNfo/packages/nn-core/src/schema/storage.ts:291`) and `iNNfo/specs/iNNfo_V_0-9-0_NN.md:172`, `{container}` expands to the parent instance's root folder so containment is physical directory nesting. Relocating an archived parent or child instance into a period folder breaks `{container}` path expansion for its descendants.

## NN Findings: F3 Do not write change-log hashes into closed instances or move changesets out of changes/
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:29, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:67, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:68, iNNfo/specs/bluepriNNts/changes/spec_NN.md:137, iNNfo/specs/bluepriNNts/changes/spec_NN.md:187, iNNfo/specs/bluepriNNts/changes/spec_NN.md:217, iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:386
recommendation:: Remove Requirement 5 altogether: never mutate an instance model after close_model to stamp a change-log hash, and keep all applied changesets in changes/ while speeding up history lookups with an index or prefix filter.
tags:: [changes, executions, provenance, close-model, procedure-state]

Requirement 5 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:67`) requires moving single-target changesets out of `changes/` alongside the archived instance and states that "the instance MUST record the hash of its final change log" (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:68`). This conflicts directly with Requirement 2 and core provenance invariants:
1. **Violation of `close_model` and `evidence_sha256`**: Requirement 2 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:29`) states that archiving a run MUST NOT require a write after `close_model`, because `close_model` refuses all subsequent writes with `MODEL_CLOSED` (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:187`). Furthermore, once a run is closed, downstream changesets cite it as evidence (`<run-id>@<step-slug>`) and the apply engine stamps the closed model file's `sha256` into `evidence_sha256` (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:217`). Writing a change-log seal hash into the run file later changes its bytes and triggers `EVIDENCE_SOURCE_CHANGED` (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:137`) across every changeset that cited the closed run.
2. **Breakage of `procedure_state`**: Requirement 2's scenario (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:35`) requires `procedure_state` to keep working for an archived run id. However, `procedureState` (`iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:386`) rebuilds `read.run.attempts` by calling `runAttemptsOf(loadChangeLog(root).all, read.run.id, Object.keys(read.run.steps))`. If the run's changesets leave `changes/`, `loadChangeLog(root)` no longer sees them and `procedure_state` silently loses the run's step attempt history.
3. **Broken changeset artifact paths and incomplete `changes/` bounding**: A `Run Artifact` row with `kind:: changeset` records the changeset's `changes/...` path in `value::` (`iNNfo/specs/bluepriNNts/executions/spec_NN.md:280`), and changesets produced during a step carry `run:: <run-id>@<step-slug>` in frontmatter while targeting domain models (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:222`). Moving only changesets that target the run model alone breaks path references and still leaves multi-target and active-model changesets growing in `changes/`.

## NN Findings: F4 Drop compact element segment rotation and extract_instance overloading
category:: change
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:9, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:79, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:80, iNNfo/specs/bluepriNNts/changes/spec_NN.md:46, iNNfo/specs/bluepriNNts/changes/spec_NN.md:132, iNNfo/specs/bluepriNNts/changes/spec_NN.md:182, iNNfo/specs/bluepriNNts/changes/spec_NN.md:197, iNNfo/packages/nn-core/src/naming/contract.ts:397
recommendation:: Remove Requirement 6 (compact element segment rotation); require concepts with unbounded instance counts to declare storage:: distributed (migrating via standard extract_instance when promoting a concept) or close whole periodic models with close_model.
tags:: [storage, addressing, extract-instance, compact, yagni]

Requirement 6 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:79`) proposes rotating archived elements of a compact concept into a sibling period segment document (`<stem>_<period>_<bp>_NN.md`) while claiming that "The archived elements MUST keep their slugs and hierarchical ids, so every existing address resolves" (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:80`), and line 9 suggests implementing this via `extract_instance`. Both assertions violate the D5 addressing and mutation contracts:
1. **Compact elements have `<model>@<element>` addresses, not document-independent hierarchical ids**: In `iNNfo/specs/bluepriNNts/changes/spec_NN.md:46` and `132`, a compact element's canonical address is `model@frozen-slug` (and `model@frozen-slug&field`), where `model` is the canonical file stem of the host document (`canonicalModelId` in `iNNfo/packages/nn-core/src/naming/contract.ts:397`). Moving element `deal-1` out of `crm_NN.md` into a sibling file changes its host model id. Keeping `crm@deal-1` resolvable would require the resolver to scan every sibling segment file whenever a slug is not found in `crm_NN.md`, defeating the hot-path isolation goal.
2. **`extract_instance` is incompatible with compact sibling segments**: `extract_instance` (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:197`) migrates a single compact element (and its descendants) into its own 1-instance-per-file distributed model at a concept's `placement::`, explicitly rejects compact concepts with `EXTRACT_NOT_DISTRIBUTED`, and re-keys the unit history in the fold to the *new* instance model id via `extracted_slugs`.
3. **Destruction of in-document structure**: Cutting subset elements out of an active compact document tears apart `# NN index` parent/child trees, evaluable matrices (`model@matrix&row&col`), and in-document `[[...]]` wikilinks (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:182`), making `unarchive` (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:16`) unable to deterministically reconstruct the original hierarchy and matrix cells.

## NN Findings: F5 Build the first slice on existing close_model frontmatter and read-time retention filtering
category:: refactor
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/changes/spec_NN.md:187, iNNfo/specs/bluepriNNts/executions/spec_NN.md:284, iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:177, iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:276, iNNfo/packages/nn-core/src/naming/contract.ts:305, iNNfo/packages/nn-core/src/naming/contract.ts:331, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:52
recommendation:: Ship the first slice without new change ops or file moves: treat closed: true distributed instances (or closed: true beyond a keep/after retention window) as cold by default in active listings, console views, and hot validation passes, while keeping O(1) direct resolution by hierarchical id.
tags:: [first-slice, close-model, executions, console, discovery]

A terminal `Procedure Execution` run is already closed via `close_model` (`iNNfo/specs/bluepriNNts/executions/spec_NN.md:284`), which writes `closed: true` into the model frontmatter (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:187`), locks the model against further writes (`MODEL_CLOSED`), and disables all runner actions (`iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:177` and `276`). Any other distributed instance that finishes its active lifecycle can also be closed with `close_model` today.

Therefore, the smallest correct first slice requires zero new changeset operations (`archive`/`unarchive`), zero directory moves, and zero changeset relocation:
1. Stamp `closed_at` (from the closing changeset's `applied_at`) alongside `closed: true` in the model frontmatter when `close_model` applies (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:140` and `187`).
2. Keep every closed distributed instance in place at its declared `placement::` (`executions/{slug}/`), so `read_knowledge`, `procedure_state` (`iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:181`), and citation verification (`<run-id>@<step-slug>`) resolve in O(1) by path without scanning.
3. Update active run/model listings, default console views (`isConsoleModel` callers, `iNNfo/packages/nn-core/src/naming/contract.ts:331`), and hot validation passes (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:52`) to exclude or collapse `closed: true` distributed instances (or those outside the concept's active retention window) unless `include_closed` / expand-archived is requested.

## NN Findings: F6 Universal element-level archive/unarchive conflicts with write_policy, close_model, and in-document references
category:: change
impact:: medium
effort:: medium
risk:: high
evidence:: verified
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:15, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:16, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:17, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:52, iNNfo/specs/iNNfo_V_0-9-0_NN.md:152, iNNfo/specs/iNNfo_V_0-9-0_NN.md:193, iNNfo/specs/bluepriNNts/changes/spec_NN.md:187, iNNfo/specs/bluepriNNts/changes/spec_NN.md:194
recommendation:: Restrict archival lifecycle state to whole distributed instance models (or whole models), respect read-only scope/concept write policies, and disallow unarchive on models closed with close_model.
tags:: [write-policy, close-model, validation, references]

Requirement 1 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:15`) states that any Level-3 element or distributed instance MUST be archivable by an explicit `archive` change and reversible by `unarchive` "whatever its concept declares", overriding its concept and scope `write_policy` (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:16` and `17`). This introduces three contract conflicts:
1. **Violation of `write_policy:: read-only`**: Under `iNNfo/specs/iNNfo_V_0-9-0_NN.md:152` and `193`, `write_policy` cascades from bluepriNNt to Concept Definition to scope documents (`mutable > append-only > read-only`), and `read-only` permits no writes at all (e.g., imported snapshots). Allowing `archive`/`unarchive` "whatever its concept declares" breaches `read-only` scope protection.
2. **Conflict with irreversible `close_model`**: A model closed with `close_model` (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:187`) is permanently frozen so it can be cited as a hash-verified source (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:217`). Allowing `unarchive` to restore an archived element "to the hot path with its prior write policy" (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:16`) would either illegally reopen a `close_model` instance or require tracking two separate read-only states (`closed` vs `archived`).
3. **Dangling in-document structure when archiving a single compact element**: Unlike `move_model` and `remove_model`, which enforce `MOVE_LEAVES_DANGLING_REFERENCES` and `REMOVE_MODEL_HAS_DESCENDANTS` (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:194` and `195`), Requirement 1 and Requirement 4 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:52`) exclude an archived compact element from default console views and validation passes without specifying what happens when active elements in the same document use that element as a parent in `# NN index`, a matrix row/column header, or a typed `reference` target.

## NN Findings: F7 Anchor archive_policy to closed_model timestamps and evaluate retention without change amplification
category:: change
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:39, openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:40, iNNfo/specs/iNNfo_V_0-9-0_NN.md:142, iNNfo/specs/bluepriNNts/executions/spec_NN.md:94, iNNfo/specs/bluepriNNts/executions/spec_NN.md:186, iNNfo/specs/bluepriNNts/executions/spec_NN.md:237, iNNfo/specs/bluepriNNts/changes/spec_NN.md:140
recommendation:: Define archive_policy:: { after, keep } on distributed Concept Definitions as a retention window over closed instances (using closed: true and a frontmatter closed_at timestamp stamped by close_model) rather than emitting a new changeset per archived instance in a batch pass.
tags:: [schema, archive-policy, executions, changes]

Requirement 3 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:39` and `40`) states that a Concept Definition "that declares a terminal state" may declare `archive_policy::` with `after` and `keep`, and that an "archival pass" MUST record each archival as a change. Three schema details are missing or problematic:
1. **Concept Definitions do not declare terminal states**: In `iNNfo/specs/iNNfo_V_0-9-0_NN.md:142`, Concept Definitions only declare `slug`, `type`, `icon`, `color`, `weight`, `storage`, `container`, `placement`, and `write_policy`. State machines (`transitions::`) live on `select` Field Definitions (`iNNfo/specs/bluepriNNts/executions/spec_NN.md:94` for `state` on `Procedure Execution`, and line `186` for `request_status` on `Step Request`). Anchoring `archive_policy::` to `closed: true` (set by `close_model` on distributed instances) avoids ambiguity when a concept has zero or multiple state fields.
2. **Missing completion timestamp on closed models**: Evaluating `after` (duration after terminal state) and `keep` (N most recent terminal instances) requires a timestamp per instance. Today, a `Procedure Execution` model stores only `procedure`, `def_rev`, `params`, `seq`, and `state` (`iNNfo/specs/bluepriNNts/executions/spec_NN.md:237`), while `applied_at` is stored only in the changeset frontmatter in `changes/` (`iNNfo/specs/bluepriNNts/changes/spec_NN.md:140`). Unless `close_model` stamps `closed_at` in the model frontmatter (or `changesetStampOf` on the run slug is used), evaluating `archive_policy` requires scanning `changes/`.
3. **Changeset amplification**: Requiring an automated archival pass to write a new changeset for every run that falls outside `keep: 5` (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:40`) doubles the number of changesets generated by short procedures. Evaluating `archive_policy:: { after, keep }` as a deterministic read-time retention window over `closed: true` instances achieves the exact same UX and hot-path filtering with zero additional changesets.

## NN Findings: F8 Guard procedure_state on archived runs against moved or evolved procedure definitions
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:35, iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:55, iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:81, iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:238, iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:276, openspec/changes/execution-rebase-rows/specs/executions/spec.md:5
recommendation:: Specify that procedure definitions referenced by runs cannot be relocated by archival (or resolve run.procedure by procedure id fallback), and ensure foldStoredRun tolerates closed runs whose pinned def_rev predates later procedure step additions.
tags:: [executions, procedure-state, rebase]

Requirement 2 (`openspec/changes/archive-lifecycle/specs/archive-lifecycle/spec.md:35`) requires `procedure_state` with an archived run id to keep returning the run. In `iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:238`, `foldStoredRun` calls `loadProcedure(root, run.procedure)` (`iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:81`), which resolves `run.procedure` as a domain-relative file path (`iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:55`) and folds the run's stored rows against the *current* procedure graph on disk.

This creates two hazards for long-lived archived runs:
1. If a procedure definition document itself is archived and moved under Requirement 1, `loadProcedure` fails with `PROCEDURE_NOT_FOUND` for every historical run that recorded its old domain-relative file path.
2. When a live procedure definition grows new steps or artifacts over time (`openspec/changes/execution-rebase-rows/specs/executions/spec.md:5`), open runs reconcile their row set via `action=rebase`, whereas closed/archived runs (`run.closed === true`) cannot rebase (`iNNfo/packages/nn-mcp/src/tools/procedure-state.ts:276`). Folding an old archived run against the evolved current procedure graph will flag `state.drift` and see current graph steps that have no `Step Run` row in the archived model unless closed runs are folded strictly over their recorded rows or tolerate un-rebased step additions.
