# Proposal: Domain Lineage Update & Blueprint Reconciliation

## Problem Statement

The existing workspace migration capability (`nn-upgrade`, specified in `workspace-template-upgrade/spec.md`) suffers from multiple deep technical and conceptual flaws:

1. **Anachronistic & Confusing Nomenclature**:
   - The term **"upgrade"** implies a commercial or infrastructure upgrade rather than the ubiquitous language of iNNfo: updating a Level 3 domain (`kNNowledge`) to conform to newer Level 2 schemas (`bluepriNNt`).
   - The phrase **"Flow B"** is an opaque historical relic. It was originally named "Flow B" when "Flow A" (an in-place migration of pre-canonical layouts) existed. When Flow A was permanently retired in favor of the clean "import as source" model, the label "Flow B" was never eliminated, leaving agents and users confused about what it represents.

2. **Primitive Text Mutation (Regex Repinning)**:
   - In `skills/nn-upgrade/scripts/apply-upgrade-plan.js`, updating a model's blueprint pin is performed via raw regular expressions:
     ```javascript
     function repinContent(content, blueprint, version, mapping = {}) {
       let out = content.replace(/(parent_spec:...)/, ...);
       for (const [from, to] of Object.entries(mapping)) {
         out = out.split(`## NN ${from}:`).join(`## NN ${to}:`);
       }
       return out;
     }
     ```
   - This bypasses the iNNfo parser (`parseKnowledge`), AST model, and the `Changeset` engine (`ChangesetDocument`, `propose_changeset`, `apply_change`).
   - Blind string replacements cannot handle multi-file distributed storage, renamed attributes, re-typed scalar/matrix fields, or formatting variations without risking silent corruption.

3. **Omission of the Lineage Chain ($L3 \to L2 \to L1 \to L0$)**:
   - A domain update must respect the transitivity of specification layers. When an $L3$ instance model updates its parent $L2$ blueprint pin, the system must ensure the target $L2$ blueprint is hydrated and verified against its $L1$ meta-blueprint specification, and that changes to concepts respect compact vs distributed storage rules.

## Proposed Solution

Redesign the domain update capability from first principles into **Domain Lineage Update**:

1. **Ubiquitous Language**:
   - Replace `upgrade` with **`update`** across commands, specs, tools, and skills.
   - Replace `Flow B` with **`Blueprint Lineage Reconciliation`** (`BlueprintLineageReconciliation`).
   - Replace `upgrade-check` with **`Lineage Audit`** (`lineage-audit`).

2. **Changeset-Driven Reconciliation Engine**:
   - All mutations to models during an update are formulated as formal iNNfo **Changesets** (`ChangesetDocument`).
   - The engine computes semantic diffs between the pinned $L2$ blueprint schema and the target $L2$ blueprint schema.
   - A Changeset is generated with typed change operations (`repin_blueprint`, `rename_concept`, `rename_field`, `add_field_default`).
   - Changes are previewed, validated through `validateKnowledge`, and applied atomically via `executeChangesetApply`.

3. **Atomic Unit of Reconciliation**:
   - The unit of update remains the **Blueprint Group**: every model pinning a given blueprint in a domain is updated atomically to prevent version skew.
   - In distributed concepts (where instances live across individual files in collection folders), mapping questions are resolved once at the concept level and applied uniformly across all instance models.

4. **Transitional Compatibility**:
   - `nn-upgrade` remains as a compatibility alias delegating to `nn-update`.
   - Existing catalog formats (`catalog.json`) and preflight detection hooks are retained while updating output payloads to the new ubiquitous language.
