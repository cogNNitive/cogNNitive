# Design: Domain Lineage Update Architecture

## Conceptual Model & Ubiquitous Language

```
Level 0: defiNNition (Meta-specification Language)
   ▲
   │ pins
Level 1: iNNfo (Concrete Specification Meta-template, e.g. spec_version: V_0-2-1)
   ▲
   │ pins
Level 2: bluepriNNt (Domain Schema, e.g. coNNtent V_0-15-0)
   ▲
   │ pins (parent_spec)
Level 3: kNNowledge (Domain Data Models, e.g. domaiNN.md, series/episode/scenes)
```

When an $L3$ model pins an older $L2$ blueprint than the catalog's `adopted` version, the domain has an **Available Lineage Update**.
The update process is the **Blueprint Lineage Reconciliation**, reconciling the instance model data with the updated schema definitions.

### Key Entities

1. **`LineageAuditResult`**:
   - Discovers all $L3$ models in the workspace.
   - For each model, extracts `parent_spec.name`, `parent_spec.url`, and pinned `blueprint_version`.
   - Compares pinned versions against `iNNfo/specs/bluepriNNts/catalog.json`.
   - Classifies each model into:
     - `current`: pinned version matches catalog adopted version.
     - `update-available`: newer adopted version exists in catalog; calculates semver gap (`major`, `minor`, `patch`).
     - `ahead`: pinned version is newer than catalog adopted version.
     - `unlisted`: blueprint is not in canonical catalog (local specialization).
   - Identifies any pre-existing **Version Skew** (e.g., models pinning different versions of the same blueprint in the same domain).

2. **`ReconciliationPlan`**:
   - Groups models into **Reconciliation Units** by blueprint name.
   - Enforces the core invariant: **The unit of reconciliation is the Blueprint Group, never an individual model**.
   - Contains:
     - `blueprint`: canonical blueprint name (e.g. `coNNtent`).
     - `pinnedVersions`: distinct versions currently pinned across members.
     - `targetVersion`: the catalog's adopted version.
     - `members`: list of model relative paths.
     - `hasSkew`: boolean indicating whether members currently pin different versions.
     - `planHash`: SHA-256 over canonicalized member paths and pins to detect plan staleness before apply.

3. **`LineageChangesetBuilder`**:
   - Replaces the legacy regex string replacements (`repinContent`).
   - For each model in a reconciliation unit:
     1. Parses model content using `parseKnowledge()`.
     2. Diffs the pinned schema against the target blueprint schema.
     3. Produces a formal `ChangesetDocument`:
        - Mutation `repin_blueprint`: updates `parent_spec` (name, url) and frontmatter `blueprint_version`.
        - Mutation `rename_concept` (if a concept heading changed between schema versions).
        - Mutation `rename_field` (if a field was renamed and user confirmed mapping).
        - Mutation `set_field_default` (if a new required field is introduced with a schema default).
     4. Verifies the generated changeset passes `validateKnowledge()` against the target blueprint schema.

4. **`ReconciliationExecutor`**:
   - Enforces the safety gates:
     - **Consent Gate**: Requires explicit consent naming the exact model count and target version before writing.
     - **Freshness Gate**: Re-verifies `planHash` against the current workspace state (`isPlanFresh`). If any file changed since planning, aborts immediately.
     - **Pre-write Backup**: Creates a timestamped backup directory outside the workspace with `manifest.sha256`.
     - **All-or-None Execution**: If any model in the unit fails post-mutation validation (`validateKnowledge`), all modified files in the unit are restored to their pre-mutation content, leaving zero partial updates.

## Pipeline Phases

```
  [1. Lineage Audit]
         │ (read-only scan)
         ▼
  [2. Reconciliation Plan Generation]
         │ (groups models by blueprint, computes planHash)
         ▼
  [3. User Consent Gate]
         │ (shows exact counts, breaking changes, mapping prompts)
         ▼
  [4. Pre-write Workspace Backup]
         │ (manifest outside workspace)
         ▼
  [5. Changeset Generation & Atomic Apply]
         │ (parseKnowledge -> changeset -> executeChangesetApply)
         ▼
  [6. Validation & Verification]
         │
         ├─── Validation Fails ──► Restore from Backup & Report Error
         │
         └─── Validation Passes ──► Success Report & Cleanup
```

## Storage Semantics: Compact vs Distributed

- **Compact Storage**:
  - Elements of a concept reside inside a single model document (e.g. `domaiNN.md` or a root model).
  - The Changeset modifies element headings and attributes within the single document.

- **Distributed Storage**:
  - Each concept instance is its own standalone instance model document in a collection directory (e.g. `scenes/<scene-slug>_NN.md`).
  - Schema mapping decisions (such as renamed fields or concept headers) are determined once per concept and applied to every instance document in the collection through individual Changeset operations within the atomic batch.

## Backwards Compatibility & Aliasing

- CLI & Skill:
  - `nn-update`: Primary front-facing skill and command.
  - `nn-upgrade`: Thin compatibility wrapper that forwards to `nn-update`, logging a deprecation notice.
  - Preflight flags: `--audit-lineage` is added alongside legacy `--upgrade-check`. Output JSON fields provide `updateStatus` and `update-available` alongside deprecated `upgrade-available`.
