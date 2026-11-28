---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - gemini"
---

# NN Findings

## NN Findings: F1 Consolidate procedures and executions into a single process lifecycle blueprint
category:: refactor
impact:: high
effort:: medium
risk:: medium
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/procedures/spec_NN.md:8, iNNfo/specs/bluepriNNts/executions/spec_NN.md:6, iNNfo/specs/bluepriNNts/executions/spec_NN.md:38, iNNfo/specs/bluepriNNts/procedures/spec_NN.md:41, temp/analysis/core-blueprints-review/study-proposal.md:65
recommendation:: Merge executions concepts into procedures using storage:: distributed on Procedure Execution and harmonize parent specification versions.
tags:: [procedures, executions, workflow, consolidation]

The current separation of `procedures` and `executions` into two distinct Level 2 blueprints creates artificial domain fragmentation and concrete version drift. As verified in the code, `procedures` is pinned to `iNNfo_V_0-6-0` at blueprint version `V_0-6-1`, whereas `executions` is pinned to `iNNfo_V_0-9-0` at blueprint version `V_0-7-0`. This desynchronization forces tooling to manage divergent parent specifications for what is fundamentally a single operational subsystem.

Furthermore, the separation duplicates structural concepts across blueprint boundaries: definition-level `Work` vs runtime `Step Run`, definition-level `Artifact` vs runtime `Run Artifact`, and `Procedure` vs `Procedure Execution`. Because the iNNfo specification natively supports distributed storage (`storage:: distributed`, `placement:: "executions/{slug}/"`) within any Level 2 blueprint, there is no architectural necessity to maintain an isolated `executions` blueprint. Consolidating runtime execution concepts (`Procedure Execution`, `Step Run`, `Run Artifact`, `Input`, `Step Request`) into `procedures` eliminates cross-blueprint version divergence, unifies the FSM execution model, and reduces schema maintenance overhead while preserving all runner and stepper capabilities.

## NN Findings: F2 Absorb sources synchronization and retire static source catalog in favor of sidecar lineage
category:: refactor
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/sources/spec_NN.md:32, iNNfo/specs/bluepriNNts/sources/spec_NN.md:104, iNNfo/specs/bluepriNNts/sidecar/spec_NN.md:37, iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md:25, temp/analysis/core-blueprints-review/study-proposal.md:55
recommendation:: Absorb the Synchronization concept into domaiNN and retire the static Source catalog in favor of dynamic sidecar lineage.
tags:: [sources, sidecar, domaiNN, lineage]

The `sources` blueprint creates extensive double bookkeeping with zero architectural benefit. When an external file is imported into a workspace, `sidecar/spec_NN.md` mandates a co-located companion `<file>.<ext>_sidecar_NN.md` containing `source_file`, `sha256`, `size_bytes`, `source_format`, and `normalized_at`. Simultaneously, `sources/spec_NN.md` demands that users create a static `sources_NN.md` document where every file is declared as a `Source` element duplicating `raw_path`, `origin_uri`, `format`, and linking back via `source_model`.

Because cogNNitive's Lineage engine already inspects the filesystem to dynamically project the `source` role for any file possessing a valid companion sidecar, the static `Source` list in `sources_NN.md` is redundant and prone to configuration drift. However, the `Synchronization` concept (which configures origins, aliases, and sync states for `nn-sources --sync`) represents intentional workspace configuration. Absorbing `Synchronization` directly into `domaiNN` allows external fetch boundaries to be declared at the domain root while completely retiring the redundant static `Source` catalog.

## NN Findings: F3 Retire standalone artifacts blueprint to eliminate catalog sprawl and index-of-indices
category:: refactor
impact:: high
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/artifacts/spec_NN.md:31, iNNfo/specs/bluepriNNts/artifacts/spec_NN.md:67, iNNfo/specs/bluepriNNts/changes/spec_NN.md:183, iNNfo/specs/bluepriNNts/executions/spec_NN.md:48, temp/analysis/core-blueprints-review/study-proposal.md:39
recommendation:: Deprecate the standalone artifacts blueprint and permit optional deliverable registration directly in domaiNN.
tags:: [artifacts, domaiNN, changes, catalog]

The `artifacts` blueprint is an 84-line specification that defines a single concept, `Artifact`, intended to register workspace deliverables. In real workflows, this blueprint is functionally orphaned and causes catalog sprawl. Procedure deliverables are tracked by `Run Artifact` in `executions`, mutation outputs are recorded through `produce_artifact` in `changes`, and physical output files under `artifacts/*` are discovered dynamically by the Lineage projection.

Requiring a separate `artifacts_NN.md` file forces `domaiNN_NN.md` to catalog `artifacts_NN.md` as an arbitrary `kNNowledge` document, creating an unnatural "index of indices". Removing `artifacts` as an independent Level 2 blueprint and absorbing an optional high-level deliverables concept into `domaiNN` eliminates workspace root clutter and aligns the specification with the actual dynamic provenance engine.

## NN Findings: F4 Split overloaded status enum in executions between steps and artifacts
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/executions/spec_NN.md:98, iNNfo/specs/bluepriNNts/executions/spec_NN.md:101
recommendation:: Decouple status into distinct step_status and artifact_status fields with clean, non-overlapping state transitions.
tags:: [executions, schema, fsm, state-machine]

In `executions/spec_NN.md`, the `status` field definition is shared across both `Step Run` and `Run Artifact` concepts (`concept:: [Step Run, Run Artifact]`). This field packs nine mutually incompatible states into a single enum: `[pending, active, waiting, done, failed, expected, produced, validated, rejected]`.

To prevent illegal states, the specification relies on an intricate transitions map and prose rule stating that "each row only takes the edges of its own lifecycle; the rows never cross". This represents unnecessary schema entanglement. Steps have an execution lifecycle (`pending -> active -> waiting -> done | failed`), whereas artifacts have a production lifecycle (`expected -> produced -> validated | rejected`). Merging these disjoint state machines into a single field increases parser and validation complexity. Decoupling them into concept-specific status fields removes ambiguity and makes the state contracts explicit.

## NN Findings: F5 Reclassify blank from core infrastructure to starter blueprint
category:: change
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/blank/spec_NN.md:9, iNNfo/specs/bluepriNNts/blank/spec_NN.md:28, temp/analysis/core-blueprints-review/study-proposal.md:81
recommendation:: Reclassify blank to tier: starter or tier: free in blueprint registries and exclude it from the core infrastructure tier.
tags:: [blank, classification, taxonomy, tiers]

The `blank` blueprint is currently grouped under `tier: core` alongside infrastructural blueprints such as `domaiNN`, `procedures`, and `changes`. However, `blank` defines only a single generic `Content` concept (`type:: text`) and contains no runtime engine bindings, validation rules, or tooling dependencies.

Treating `blank` as core infrastructure is a classification error. Core blueprints define the runtime architecture and operational substrate of a cogNNitive workspace, whereas `blank` is merely an unopinionated starting template for exploratory authoring. Reclassifying `blank` as `tier: starter` or `tier: free` correctly separates workspace runtime requirements from authoring scaffolds and reduces the scope of core governance.

## NN Findings: F6 Fix severe parent specification version rot in blank blueprint documentation
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/blank/spec_NN.md:6, iNNfo/specs/bluepriNNts/blank/spec_NN.md:8, iNNfo/specs/bluepriNNts/blank/spec_NN.md:132, iNNfo/specs/bluepriNNts/blank/spec_NN.md:140
recommendation:: Update blank/spec_NN.md documentation examples to target current parent_spec and blueprint_version definitions.
tags:: [blank, documentation, versioning, drift]

The `blank` blueprint specification exhibits critical documentation rot that misleads model authors. In the file's YAML frontmatter, lines 6-8 declare `parent_spec: name: "iNNfo_V_0-6-0"` and `blueprint_version: "V_0-4-1"`. However, in the markdown body under "Parent Chain" and example snippets, line 132 explicitly instructs authors to set `name: "iNNfo_V_0-3-0"`, and line 140 specifies `name: "blank_V_0-2-0"`.

Because `blank` is intended to serve as the baseline template for new models, users copying the canonical example code will instantiate invalid models pinned to obsolete specifications from multiple generations ago. Aligning the prose examples with the active frontmatter versioning is essential to maintain template integrity.

## NN Findings: F7 Eliminate semantic overloading of rev field for input values in executions
category:: improvement
impact:: medium
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/executions/spec_NN.md:210, iNNfo/specs/bluepriNNts/executions/spec_NN.md:212, iNNfo/specs/bluepriNNts/executions/spec_NN.md:60
recommendation:: Introduce a dedicated value field for Input and restrict rev exclusively to cryptographic revision hashes.
tags:: [executions, schema, naming, semantic-overload]

In `executions/spec_NN.md:210-213`, the field `rev` is declared on both `Run Artifact` and `Input` concepts (`concept:: [Run Artifact, Input]`). For `Run Artifact`, `rev` functions as expected by holding a content revision hash (a sha256 hex string, an element origin change ID, or an applied change path). However, for `Input`, line 212 documents that `rev` stores "the recorded input's value".

Naming a field `rev` to store the literal payload value of an input is confusing and semantically misleading. Storing data values inside a field designated for version identification obfuscates model queries and breaks intuition for both human users and AI agents. The `Input` concept should declare its own `value` field (or reuse `Run Artifact`'s `value` field), leaving `rev` dedicated strictly to pinning cryptographic revisions.

## NN Findings: F8 Clarify serialization boundary between sidecar frontmatter and body concepts
category:: improvement
impact:: low
effort:: low
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/sidecar/spec_NN.md:28, iNNfo/specs/bluepriNNts/sidecar/spec_NN.md:104, iNNfo/specs/bluepriNNts/sidecar/spec_NN.md:124
recommendation:: Formally specify that Sidecar fields are serialized in YAML frontmatter rather than markdown concept blocks.
tags:: [sidecar, serialization, specification]

The `sidecar` blueprint defines `Sidecar` as a standard `list` concept (`type:: list`) with ten associated field definitions. However, the accompanying Level 3 document template places all of these fields (`source_file`, `sha256`, `size_bytes`, `source_format`, `normalized_at`, etc.) directly into the YAML frontmatter block rather than serialized as `key:: value` pairs under a `# NN Sidecar` concept heading. For text-native files, the markdown body is completely empty.

While this structure is practical because sidecars serve as transparent companion files to physical assets, it deviates from the canonical Level 3 serialization pattern where fields belong to concept blocks in the body. The specification should explicitly document this frontmatter serialization exception so generic iNNfo validators and linting tools do not raise false-positive schema violations.

## NN Findings: F9 Replace escaped single-line JSON requested_outputs with structured file outputs
category:: refactor
impact:: low
effort:: medium
risk:: low
evidence:: verified
code_ref:: iNNfo/specs/bluepriNNts/executions/spec_NN.md:193, iNNfo/specs/bluepriNNts/executions/spec_NN.md:196, iNNfo/specs/bluepriNNts/executions/spec_NN.md:271
recommendation:: Replace single-line escaped JSON strings in requested_outputs with staged filesystem deliverables referenced by path.
tags:: [executions, formatting, persistence, anti-pattern]

In `executions/spec_NN.md:193-196`, the `requested_outputs` field on `Step Request` allows users in the console to submit file deliverables directly. The specification defines this field as "one line of JSON: artifact slug -> { name?: string, text: string }", with a maximum payload size of 256 KiB of UTF-8 text per deliverable.

Escaping multi-kilobyte formatted documents (such as Markdown or JSON reports) into a single escaped line within a markdown field contradicts iNNfo's core emphasis on human-readable plain-text transparency. It creates parsing fragility and inflates change history. Staging the deliverables to a temporary workspace path and passing the staged path to the request provides a cleaner, less error-prone separation of payload and intent.
