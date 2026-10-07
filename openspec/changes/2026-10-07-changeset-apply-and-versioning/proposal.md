# Proposal: Changeset Apply and Versioning (Slice S2a)

## Intent

Implement Slice S2a (`changeset-apply-and-versioning`) of the `stable-identity-and-changesets` architectural initiative. This establishes **changesets** as the single authoritative mutation and provenance medium across cogNNitive, superseding fragmented graph writers (hand edits, direct editor file writes, ad-hoc script mutations) and disjointed provenance artifacts (the `## NN Agent Modification` block, verbatim-paste mandate, transcript promotion, and separate feedback ledgers). 

S2a introduces a normative `changes` Level-2 bluepriNNt and document model with cryptographic proposal sealing (`proposal_sha`), an atomic two-phase apply engine guarded by a single-writer filesystem lock (`changes/.lock`), invariant live model versioning with snapshot archival to `kNNowledge/archive/` alongside deep archive exclusion, and automatic rewriting of field-level citations to reflect current value origins per architectural decision D20.

---

## Architectural Context & Backlog Decisions

This proposal directly implements backlog decisions **D7**, **D8**, **D9**, **D15**, and **D20** established in [`openspec/backlog.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/backlog.md#L1236-L1250), adhering to the cross-cutting constraints verified in [`exploration.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/exploration.md):

| Decision | Summary | Direct Implication in S2a |
|---|---|---|
| **D7** | Changesets live in `changes/` at the domain root as `_NN.md` documents typed to the `changes` bluepriNNt. Naming follows `NN_NAME_INVARIANT` and the UTC timestamp contract (`<workspace_id>_<author>_<stamp>_changes_NN.md`). Classified as role `'changeset'` so they are never treated as semantic models. Proposed content is sealed by `proposal_sha` in the header; the agent annotates `status::`, `resolution::`, and `resolved_slug::` per change. | Create `changes` Level-2 blueprint, register it in `CANONICAL_BLUEPRINTS`, update `Role` union and `roleOf` in `contract.ts`, and define parser/serializer with SHA-256 seal verification. |
| **D8** | Every graph mutation is a changeset (console, chat, source import, `cognitivize`). `apply_change` always executes a changeset (synthesizing and sealing one when called with bare operation arguments). The `## NN Agent Modification` block, verbatim-paste mandate, and transcript promotion as provenance are retired without compatibility shims. | Refactor MCP `apply_change` to route all mutations through changesets. Remove `modification` string generation and verbatim-paste requirement. |
| **D9** | Live `kNNowledge` files remain version-free under `NN_NAME_INVARIANT` (`<name>_NN.md`), tracking their version in frontmatter (`knowledge_version`). Applying a changeset bumps affected models once (patch default) and moves the previous content to `kNNowledge/archive/` (retaining version, stamp, and changeset id). `isExcludedPath` excludes `archive` at **any depth**. Decouple `knowledge_version` from parent `spec_version` in `init_knowledge`. | Implement archival move during apply, update `isExcludedPath` in `contract.ts` to check all path segments for `'archive'`, and record `base_version`/`result_version` in changeset frontmatter. |
| **D15** | Review feedback is represented directly as `op: comment` changes (target, author, notes, no `to` value). | Include `comment` operation in `changes` blueprint and mutation pipeline, laying the groundwork for retiring separate feedback ledgers. |
| **D20** | A field's `sources::` citation in the model reflects the origin of its *current* value. Applying a change rewrites the citation of every touched field to point to that change (`changes/<changeset>_changes_NN.md@## NN Change: <id>`). Untouched fields retain their previous citations. Historical provenance walks backward through archived model snapshots and the changeset chain. | Implement field-level citation rewriting in Phase 1 of the apply engine for all modified fields. |

---

## Cross-Cutting Constraints

1. **Single-Writer Lock (`changes/.lock`)**:
   - Filesystem mutex at `<rootDir>/changes/.lock` acquired via exclusive file creation flag (`wx`).
   - Lock payload records `{ pid: number, timestamp: number, changeset: string }`.
   - Stale lock timeout (60 seconds) breaks dead locks safely.
   - Guaranteed deterministic release in `finally` blocks across all success and error paths.
2. **Two-Phase Apply Transaction**:
   - **Phase 1 (In-Memory Compute & Validate)**: Changeset is parsed, proposal hash is verified, preconditions (`from` values, target entities) are evaluated, mutations are applied in-memory, citations are rewritten (D20), `knowledge_version` is bumped (D9), and full schema validation (`validateKnowledge`) is executed on all touched models. If any validation fails, the entire transaction aborts with zero files modified or moved on disk.
   - **Phase 2 (Atomic Persistence & Archival)**: Mutated models are written to temporary staging files (`.tmp`), previous active models are moved to `kNNowledge/archive/`, temporary files are renamed to active invariant filenames, and changeset document/frontmatter is annotated with `status:: applied`, `applied_at`, and the `models` version transition map.
3. **Idempotent Replay**:
   - Re-applying an already applied changeset is a safe no-op.
   - Idempotency is keyed on the changeset frontmatter `status: applied` and the target models matching the recorded `result_version`.
4. **Deep `archive` Directory Exclusion**:
   - `isExcludedPath` checks all path segments for `'archive'`. Any nested directory named `archive` (e.g. `kNNowledge/archive/`, `sources/archive/`) is permanently invisible to model discovery, catalogs, and active validators.
5. **Retirement Without Compatibility Layer**:
   - The `## NN Agent Modification` markdown block, verbatim-paste mandate, and transcript promotion as provenance are retired immediately. `apply_change` returns structured changeset execution results rather than markdown paste text.

---

## Capabilities

### New Capabilities

1. `changeset-document-model`:
   - Level-2 `changes` normative bluepriNNt definition (`iNNfo/specs/bluepriNNts/changes/spec_NN.md`) and canonical registry integration.
   - Changeset file naming convention: `<workspace_id>_<author>_<stamp>_changes_NN.md` in `changes/` at domain root.
   - Changeset header schema: `spec_version`, `parent_spec`, `blueprint_version`, `status` (`proposed`, `applied`, `rejected`, `conflict`), `proposal_sha`, `applied_at`, and `models` map (`base_version`, `result_version`).
   - Operation schemas: `update_field`, `add_element`, `rename_element`, `rename_concept`, `update_matrix_cell`, and `comment`.
   - Cryptographic proposal sealing: `proposal_sha` SHA-256 hash computed over canonical serialized proposed elements (excluding agent resolution annotations `status::`, `resolution::`, `resolved_slug::`), verifying proposal integrity before execution.
2. `changeset-apply-engine`:
   - Core mutation engine executing changeset operations against live domain models.
   - Single-writer lock manager at `changes/.lock` with stale lock detection and release guarantees.
   - Two-phase apply transaction guaranteeing atomic, all-or-nothing execution with zero partial writes on failure.
   - Per-change status updates: writes `status:: applied`, `resolution::`, and `resolved_slug::` onto each change element within the changeset document.
   - Replay idempotency keyed on model `result_version` and changeset `status: applied`.
3. `knowledge-version-and-snapshot`:
   - Invariant model file naming (`kNNowledge/<name>_NN.md`) preserving `NN_NAME_INVARIANT` on live models without embedding `_V_` in filenames.
   - Semantic version tracking via frontmatter (`knowledge_version: "V_0-1-1"`), bumped once per changeset per touched model (patch default, optional minor/major).
   - Snapshot archival: moves previous model file to `kNNowledge/archive/<model_stem>_<base_version>_<stamp>_<changeset_stem>_NN.md`.
   - Deep `archive` exclusion in `isExcludedPath` filtering out nested archive paths across all segments.
   - Decoupled `knowledge_version` from parent blueprint `spec_version` in `init_knowledge` and validation.

### Modified Capabilities

4. `field-citation-provenance` (Delta of `document-citations` / `console-field-citations`):
   - Provenance rewriting per D20: Touched fields have their `sources::` citations updated to point to the applied changeset change (`changes/<changeset>_changes_NN.md@## NN Change: <id>`).
   - Untouched fields retain their previous citations unaltered.
   - Preserves bidirectional auditability: current value provenance resides in the active model, historical provenance walks backward through archived snapshots and the changeset chain.

---

## Detailed Scope & Technical Approach

### 1. Role Classification & Deep Archive Exclusion (`innfo-core/src/naming/contract.ts`)

- **Deep Archive Exclusion (D9)**:
  Update `isExcludedPath` so that any path segment named `'archive'` triggers exclusion:
  ```ts
  export function isExcludedPath(path: string): boolean {
    const segs = segmentsOf(path)
    if (segs.length > 0 && IGNORED_DIRECTORIES.has(segs[0])) return true
    return segs.some((s) => s === 'archive' || s === 'staging' || (s.startsWith('.') && s !== '..'))
  }
  ```
  This guarantees that files in `kNNowledge/archive/` or `sources/archive/` are never classified as models, scanned by `findKnowledgeFile`, or included in workspace manifests.
- **Role Classification for Changesets (D7)**:
  - Extend `Role` union:
    ```ts
    export type Role =
      | 'entrypoint'
      | 'spec'
      | 'sidecar'
      | 'lineage-record'
      | 'catalog'
      | 'procedure'
      | 'knowledge'
      | 'source'
      | 'artifact'
      | 'changeset'
    ```
  - Update `NON_KNOWLEDGE_BLUEPRINT_RE`:
    ```ts
    const NON_KNOWLEDGE_BLUEPRINT_RE = /^(cognnitive|workspace|procedures|sources|artifacts|sidecar|changes)(?:_|$)/i
    ```
  - Update `roleOf`:
    ```ts
    case 'changes':
      return 'changeset'
    ```
  - `isModelCandidate` checks `roleOf === 'knowledge'`, so changeset files in `changes/` will never be classified as models.

### 2. The `changes` BluepriNNt & Canonical Registry

- **Level-2 BluepriNNt Specification (`iNNfo/specs/bluepriNNts/changes/spec_NN.md`)**:
  - Author normative Level-2 blueprint conforming to `iNNfo_V_0-4-0`.
  - Defines concept `Change` (`icon:: git-commit`, `type:: list`, `color:: blue`).
  - Fields defined under `Change`:
    - `op`: select `[update_field, add_element, remove_element, rename_element, rename_concept, update_matrix_cell, comment]`
    - `target`: string (canonical D5 address `model_slug@element-slug&field_name`)
    - `from`: string (precondition check)
    - `to`: string (new value)
    - `concept`: string (for `add_element`)
    - `name`: string (for `add_element`, `rename_element`, `rename_concept`)
    - `slug`: string (proposed slug)
    - `fields`: string (initial field values)
    - `author`: string (contributor or agent identifier)
    - `notes`: string (review notes or rationale)
    - `status`: select `[proposed, applied, rejected, conflict]`
    - `resolution`: string (agent resolution notes)
    - `resolved_slug`: string (disambiguated assigned slug)
- **Canonical Registry (`innfo-core/src/schema/canonical-registry.ts`)**:
  - Register `changes` blueprint in `CANONICAL_BLUEPRINTS` with embedded schema content to support fully offline resolution.

### 3. Changeset Document Model & Proposal Seal (`innfo-core/src/changeset/`)

Create module `iNNfo/packages/innfo-core/src/changeset/`:
- **Types (`types.ts`)**:
  - `ChangeOp`: `'update_field' | 'add_element' | 'remove_element' | 'rename_element' | 'rename_concept' | 'update_matrix_cell' | 'comment'`.
  - `ChangeStatus`: `'proposed' | 'applied' | 'rejected' | 'conflict'`.
  - `ChangeItem`: Structured interface representing an individual `## NN Change: <id>` block.
  - `ChangesetFrontmatter`: Extends frontmatter with `status`, `proposal_sha`, `applied_at`, and `models: Record<string, { base_version: string, result_version: string }>`.
  - `ChangesetDocument`: Parsed representation of a changeset file.
- **Hasher (`hasher.ts`)**:
  - `computeProposalSha(changes: ChangeItem[]): string`: Computes deterministic SHA-256 hash over canonical proposed values (`id`, `op`, `target`, `from`, `to`, `concept`, `name`, `slug`, `fields`, `author`, `notes`). Omits execution/resolution fields (`status`, `resolution`, `resolved_slug`).
  - `verifyProposalSha(doc: ChangesetDocument): boolean`: Validates frontmatter `proposal_sha` against computed hash.
- **Parser & Serializer (`parser.ts`, `serializer.ts`)**:
  - Parse `_changes_NN.md` documents into `ChangesetDocument`.
  - Serialize changesets back to Markdown, preserving comments and formatting, while appending or updating resolution fields (`status:: applied`, `resolution:: ...`, `resolved_slug:: ...`).

### 4. Matrix Cell Mutation in `mutate.ts`

- Add `update_matrix_cell` handler to `innfo-core/src/mutate.ts`:
  - Accepts `{ matrixName?, matrixSlug?, row, col, value }`.
  - Locates target matrix by slug or name.
  - Matches existing cell by row and column slugs/names, updating its value.
  - If cell is not present in matrix data, inserts a new cell entry `{ row, col, value }`.
  - Integrates with D5 target address parser: parses `model_slug@matrix-slug&row-slug&col-slug` directly into matrix cell updates.

### 5. Single-Writer Lock (`changes/.lock`)

- Create `LockManager` in `innfo-core/src/changeset/lock.ts` (or `innfo-mcp/src/tools/changeset-lock.ts`):
  - Lock path: `<rootDir>/changes/.lock`.
  - `acquireLock(rootDir: string, changesetName: string, timeoutMs = 60000): Promise<LockHandle>`:
    - Attempts `open(lockPath, 'wx')`.
    - Writes JSON payload: `{ pid: process.pid, timestamp: Date.now(), changeset: changesetName }`.
    - If file exists, inspects timestamp. If older than `timeoutMs`, warns and breaks stale lock.
    - If active lock is held by another live process, fails fast with error `CONCURRENT_APPLY_ACTIVE`.
  - `releaseLock(handle: LockHandle): Promise<void>`:
    - Safely unlinks `changes/.lock`. Always called in `finally` blocks.

### 6. Two-Phase Apply Transaction Engine (`innfo-mcp/src/tools/apply-change.ts`)

Refactor `apply_change` into a transaction-driven changeset engine:
- **Phase 1: In-Memory Compute & Validate**:
  1. Acquire `changes/.lock`.
  2. Load and parse the changeset file (or synthesize a temporary sealed changeset if called with legacy bare mutation arguments).
  3. Verify `proposal_sha`; throw `PROPOSAL_TAMPERED` if mismatched.
  4. Check Idempotency: If changeset `status === 'applied'`, check each model's current version against `result_version`. If matched, return early with no-op success.
  5. Load all affected models into memory.
  6. Check preconditions: For each change, if `from` is specified, verify it matches the current model field value; if mismatched, register conflict.
  7. Apply mutations in memory via `innfo-core` mutation engine.
  8. Update citations per D20 (`field-citation-provenance`): For each touched field on an element, rewrite `sources::` to `changes/<changeset_file>@## NN Change: <id>`.
  9. Bump `knowledge_version` in frontmatter once per affected model (patch by default).
  10. Run `validateKnowledge` across all touched models against their blueprints. If any model has validation errors, **abort transaction immediately**: release lock and throw `VALIDATION_FAILED` with errors. Zero files written to disk.
- **Phase 2: Atomic Persistence & Archival**:
  1. For each touched model:
     - Write mutated content to temporary file: `kNNowledge/<model_name>.tmp`.
     - Move existing active model to archive:
       `<rootDir>/kNNowledge/archive/<model_stem>_<base_version>_<stamp>_<changeset_stem>_NN.md`.
     - Atomically rename `kNNowledge/<model_name>.tmp` to `kNNowledge/<model_name>_NN.md`.
  2. Update changeset file on disk:
     - Annotate each applied change element with `status:: applied`, `resolution:: Applied successfully`.
     - Update frontmatter: `status: applied`, `applied_at: <ISO>`, `models: { <slug>: { base_version, result_version } }`.
  3. Release `changes/.lock`.
  4. Return structured execution report.

### 7. Model Version Bumping & Snapshot Archival (`knowledge-version-and-snapshot`)

- **Frontmatter Version Bumping**:
  - Live model files keep invariant names: `kNNowledge/<model_stem>_NN.md` (no `_V_` in live filenames).
  - Version increment is performed in frontmatter: `knowledge_version: "V_0-1-1"`.
  - Default bump is `patch`. Optional arguments allow `minor` or `major`.
- **Archival Move**:
  - Ensure `<rootDir>/kNNowledge/archive/` exists.
  - Rename active model file to `<model_stem>_<base_version>_<stamp>_<changeset_stem>_NN.md`.
  - Deep archive exclusion in `isExcludedPath` ensures that archived snapshots are immediately excluded from discovery, catalogs, and checks.
- **Decouple Blueprint Version in `init-knowledge.ts`**:
  - Remove coupling where model `knowledge_version` was forced to match parent blueprint `spec_version`, allowing model versions to bump freely without triggering `VERSION_MISMATCH`.

### 8. Field Citation Rewriting per D20 (`field-citation-provenance`)

- When a change touches a field `field_name` on an element `element_slug`:
  - Locate or create the field's citation entry in the element.
  - Set citation reference to `changes/<changeset_file>@## NN Change: <change_id>`.
  - If element-level `sources::` list is used, ensure it records the changeset reference.
  - Untouched fields on the same element retain their existing citations.
  - Lineage walk: Current model $\to$ Changeset $\to$ Archived snapshot $\to$ Primary source.

### 9. Retiring Legacy Provenance

- **Agent Modification Block**:
  - Remove `buildAgentModificationBlock` and `modification` property from `applyChange` result.
  - Remove the requirement for agents to paste modification markdown blocks into chat replies.
- **Transcript Promotion**:
  - Stop promoting session transcripts as graph provenance. All provenance is stored in `changes/` documents.
- **Feedback Ledger & Tools**:
  - Review feedback is submitted as `op: comment` changes within changesets (D15).
  - Mark legacy feedback tools for deprecation in S2c.

---

## Impact & File Surface

| Component / File | Nature of Change | Purpose |
|---|---|---|
| `iNNfo/packages/innfo-core/src/naming/contract.ts` | **Modify** | Extend `Role` union to include `'changeset'`, add `changes` to `NON_KNOWLEDGE_BLUEPRINT_RE`, update `roleOf`, and update `isExcludedPath` to exclude `archive` at ANY depth. |
| `iNNfo/specs/bluepriNNts/changes/spec_NN.md` | **Create** | Normative Level-2 blueprint specification for `changes`. |
| `iNNfo/packages/innfo-core/src/schema/canonical-registry.ts` | **Modify** | Register `changes` blueprint in `CANONICAL_BLUEPRINTS` with embedded schema. |
| `iNNfo/packages/innfo-core/src/changeset/types.ts` | **Create** | TypeScript interfaces for `ChangeItem`, `ChangesetDocument`, operations, and statuses. |
| `iNNfo/packages/innfo-core/src/changeset/hasher.ts` | **Create** | SHA-256 seal computation and validation for proposed changes (`proposal_sha`). |
| `iNNfo/packages/innfo-core/src/changeset/parser.ts` | **Create** | Parser for `_changes_NN.md` documents. |
| `iNNfo/packages/innfo-core/src/changeset/serializer.ts` | **Create** | Serializer for changesets, including per-change resolution annotations. |
| `iNNfo/packages/innfo-core/src/changeset/index.ts` | **Create** | Barrel export for changeset document model. |
| `iNNfo/packages/innfo-core/src/mutate.ts` | **Modify** | Add `update_matrix_cell` mutation handler; support slug-based addressing for operations. |
| `iNNfo/packages/innfo-mcp/src/tools/changeset-lock.ts` | **Create** | Single-writer filesystem lock manager at `changes/.lock`. |
| `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts` | **Refactor** | Implement two-phase apply transaction, lock acquisition, model archival move to `kNNowledge/archive/`, citation rewriting (D20), version bumping, and retire `Agent Modification` block. |
| `iNNfo/packages/innfo-mcp/src/tools/init-knowledge.ts` | **Modify** | Decouple `knowledge_version` from parent blueprint `spec_version`. |
| `iNNfo/packages/innfo-mcp/src/server.ts` | **Modify** | Update `apply_change` tool definition to support changeset path execution. |
| `iNNfo/packages/innfo-core/tests/naming/contract.test.ts` | **Modify / Add** | Unit tests for deep archive exclusion and `changeset` role classification. |
| `iNNfo/packages/innfo-core/tests/changeset/` | **Create** | Unit tests for changeset parsing, serialization, proposal SHA hashing, and tampering detection. |
| `iNNfo/packages/innfo-mcp/test/apply-change.test.ts` | **Modify / Add** | Integration tests for two-phase apply, locking, archival move, idempotency, and D20 citation rewriting. |

---

## Review Line Budget
> [!NOTE]
> An explicit line budget exception was pre-approved by the user due to the foundational, multi-package architectural scope of Slice S2a (`changeset-apply-and-versioning`).

---

## Success Criteria & Test Plan

- [ ] **Strict TDD**: All new behaviors (naming exclusion, changeset parser, hasher, lock manager, two-phase apply, citation rewriting) have corresponding unit and integration tests written before or in lockstep with implementation.
- [ ] **Deep Archive Exclusion**:
  - `isExcludedPath('kNNowledge/archive/model_NN.md') === true`
  - `isExcludedPath('sources/archive/data.csv') === true`
  - `isExcludedPath('deeply/nested/archive/file_NN.md') === true`
- [ ] **Role Classification**:
  - `roleOf` classifies documents in `changes/` with parent spec `changes` as `'changeset'`.
  - `isModelCandidate` returns `false` for changeset documents.
- [ ] **Changeset Document Model**:
  - Parses `_changes_NN.md` documents containing `update_field`, `add_element`, `rename_element`, `rename_concept`, `update_matrix_cell`, and `comment`.
  - Computes deterministic `proposal_sha`.
  - Fails with `PROPOSAL_TAMPERED` if proposed change contents are modified after sealing.
- [ ] **Single-Writer Lock**:
  - Acquires exclusive lock at `changes/.lock`.
  - Blocks concurrent apply attempts with `CONCURRENT_APPLY_ACTIVE`.
  - Automatically cleans up stale locks (> 60s).
  - Guarantees lock release in `finally` on both success and failure.
- [ ] **Two-Phase Apply Transaction**:
  - Phase 1 validation failure aborts transaction with zero files written to disk or moved to archive.
  - Phase 2 successfully updates live model in-place with bumped `knowledge_version`.
  - Moves prior model file to `kNNowledge/archive/<model_stem>_<base_version>_<stamp>_<changeset_stem>_NN.md`.
  - Updates changeset document with `status:: applied` and frontmatter `models` map.
- [ ] **Idempotency**:
  - Re-applying an already applied changeset detects matching `result_version` and exits as a successful no-op without re-bumping or duplicating archives.
- [ ] **Field Citation Rewriting (D20)**:
  - Touched fields have their citations updated to point to `changes/<changeset>_changes_NN.md@## NN Change: <id>`.
  - Untouched fields retain their previous citations.
- [ ] **Retirement of Agent Modification**:
  - `apply_change` returns structured changeset execution output and no longer generates `## NN Agent Modification` markdown strings.
- [ ] Full workspace verification passes: `npm test` and `npm run check:integrity` (or relevant package tests) run clean.
