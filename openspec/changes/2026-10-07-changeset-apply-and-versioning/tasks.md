# Implementation Tasks: Changeset Apply and Versioning (Slice S2a)

**Change ID**: `2026-10-07-changeset-apply-and-versioning`  
**Status**: `Draft`  
**Author**: `sdd-tasks subagent`  
**Delivery Strategy**: `exception-ok` (User pre-approved line budget exception for foundational architectural slices)  
**Chain Strategy**: `size-exception`  
**Proposal**: [`proposal.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/proposal.md)  
**Design**: [`design.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/design.md)  
**Specs**: [`specs/`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/specs/)  

---

## Review Workload Forecast

| Metric / Parameter | Value | Notes |
|---|---|---|
| **Estimated Changed Lines** | 700–1,100 lines | Foundational multi-package architectural slice (`innfo-core`, `innfo-mcp`, Level-2 blueprint) |
| **400-Line Budget Risk** | High | Exceeds standard 400-line review budget |
| **Chained PRs Recommended** | No | Single continuous delivery on `dev` |
| **Delivery Strategy** | `exception-ok` | Explicit line budget exception pre-approved by user |
| **Chain Strategy** | `size-exception` | Monolithic architectural slice executed via ordered TDD phases |

---

## Strict TDD Methodology

Each task adheres to a strict Test-Driven Development (TDD) cycle:
1. **Red**: Author failing unit or integration tests that verify expected contract behaviors before writing production code.
2. **Green**: Implement the minimal production code necessary to pass the tests.
3. **Verify**: Run package test suites (`npm test`) and typechecker (`npm run typecheck`).
4. **Refactor**: Clean up and optimize while keeping tests green.

---

## Phase Breakdown & Tasks

### Phase 1: Contract, Role & Path Exclusion Updates

**Goal**: Extend role classification for changesets, exclude changesets from model discovery, and enforce deep `archive` directory exclusion at any path depth per decisions **D7** and **D9**.

- [ ] **1.1 [Test First] Contract tests: Deep archive exclusion & changeset role**
  - **File**: [`contract.test.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-core/tests/naming/contract.test.ts)
  - **Description**: Add unit tests in `innfo-core` testing deep archive exclusion and changeset role classification.
  - **Tests to Author**:
    - `isExcludedPath('kNNowledge/archive/model_NN.md') === true`
    - `isExcludedPath('sources/archive/data.csv') === true`
    - `isExcludedPath('deeply/nested/archive/file_NN.md') === true`
    - `isExcludedPath('kNNowledge/pricing_NN.md') === false`
    - `roleOf({ path: 'changes/c1_changes_NN.md', parentSpecName: 'changes' }) === 'changeset'`
    - `roleOf({ path: 'changes/workspace_agent_20261007T120000Z_changes_NN.md', parentSpecName: 'changes' }) === 'changeset'`
    - Verify `isModelCandidate` returns `false` for files classified as `'changeset'` role or with `parentSpecName: 'changes'`.
  - **Traceability**: [`changeset-document-model/spec.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/specs/changeset-document-model/spec.md#L36-L51), [`knowledge-version-and-snapshot/spec.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/specs/knowledge-version-and-snapshot/spec.md#L62-L83)

- [ ] **1.2 [Implement] Update `contract.ts`: `Role`, `NON_KNOWLEDGE_BLUEPRINT_RE`, `roleOf`, and deep `archive` exclusion**
  - **File**: [`contract.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-core/src/naming/contract.ts)
  - **Description**:
    - Add `'changeset'` to the `Role` union type.
    - Update `NON_KNOWLEDGE_BLUEPRINT_RE` to `/^(cognnitive|workspace|procedures|sources|artifacts|sidecar|changes)(?:_|$)/i`.
    - Update `roleOf` switch to handle `case 'changes': return 'changeset'`.
    - Update `isExcludedPath` so any path segment named `'archive'` or `'staging'` triggers exclusion:
      ```ts
      export function isExcludedPath(path: string): boolean {
        const segs = segmentsOf(path)
        if (segs.length > 0 && IGNORED_DIRECTORIES.has(segs[0])) return true
        return segs.some((s) => s === 'archive' || s === 'staging' || (s.startsWith('.') && s !== '..'))
      }
      ```
  - **Traceability**: Proposal Section 1, Backlog **D7**, **D9**.

- [ ] **1.3 [Verify & Refactor] Run contract tests**
  - **Command**: `npm --workspace=@cognnitive/innfo-core test -- tests/naming/contract.test.ts`
  - **Description**: Confirm all new assertions pass and existing naming invariant tests remain fully green.

---

### Phase 2: Level-2 `changes` BluepriNNt & Registry

**Goal**: Author normative Level-2 blueprint specification for changesets and embed it into the offline canonical template registry per decision **D7**.

- [ ] **2.1 [Test First] Canonical blueprint resolution for `changes`**
  - **File**: [`canonical-registry.test.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-core/tests/canonical-registry.test.ts) (or create if not existing)
  - **Description**: Author tests verifying:
    - `findCanonicalBlueprint('changes')` returns the registered canonical blueprint with name `'changes'`.
    - `findCanonicalBlueprint('changes_V_0-1-0_NN.md')` and standard aliases resolve to `'changes'`.
    - `getCanonicalSpecContent('changes')` returns non-empty specification content.
    - Resolving the embedded specification content via `resolveBlueprintSchema` yields valid concepts (`Change`) and fields (`op`, `target`, `from`, `to`, `concept`, `name`, `slug`, `fields`, `author`, `notes`, `status`, `resolution`, `resolved_slug`).
  - **Traceability**: [`changeset-document-model/spec.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/specs/changeset-document-model/spec.md#L9-L34)

- [ ] **2.2 [Implement] Author normative Level-2 blueprint `iNNfo/specs/bluepriNNts/changes/spec_NN.md`**
  - **File**: `iNNfo/specs/bluepriNNts/changes/spec_NN.md`
  - **Description**: Create normative Level-2 blueprint conforming to `iNNfo_V_0-4-0_NN.md`:
    - Frontmatter: `spec_version: "V_0-4-0"`, `level: 2`, `parent_spec: { name: "iNNfo_V_0-4-0", url: "..." }`, `blueprint_name: "changes"`, `blueprint_version: "0.1.0"`.
    - Concept: `Change` (`icon:: git-commit`, `type:: list`, `color:: blue`).
    - Fields:
      - `op`: select `[update_field, add_element, remove_element, rename_element, rename_concept, update_matrix_cell, comment]`
      - `target`: string (canonical D5 address: `model@element&field`, `model@matrix&row&col`, `model@concept`)
      - `from`: string (precondition check)
      - `to`: string (proposed target value)
      - `concept`: string (for `add_element`)
      - `name`: string (for `add_element`, `rename_element`, `rename_concept`)
      - `slug`: string (proposed slug)
      - `fields`: string (initial field values)
      - `author`: string (contributor or agent identifier)
      - `notes`: string (rationale, critique, or review comment per D15)
      - `status`: select `[proposed, applied, rejected, conflict]`
      - `resolution`: string (agent resolution explanation)
      - `resolved_slug`: string (disambiguated assigned slug)
    - Body prose: Required Level-2 sections (`Philosophy`, `Objectives`, `Specification`, `Template`, `Examples`).
  - **Traceability**: Design Document Section 4.3, Proposal Section 2.

- [ ] **2.3 [Implement] Register `changes` in `canonical-registry.ts`**
  - **File**: [`canonical-registry.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-core/src/schema/canonical-registry.ts)
  - **Description**: Embed `CHANGES_SPEC_CONTENT` matching `spec_NN.md` and add the `changes` record to `CANONICAL_BLUEPRINTS` map with aliases (`changes`, `changes_spec_NN`, `changes_v_0-1-0`, `changes_v_0-1-0_nn`, `specs/bluepriNNts/changes/spec_NN.md`).
  - **Traceability**: Design Document Section 6.1.

- [ ] **2.4 [Verify & Refactor] Verify canonical registry resolution**
  - **Command**: `npm --workspace=@cognnitive/innfo-core test -- tests/canonical-registry.test.ts`
  - **Description**: Ensure offline resolution passes and schema compiler creates valid `BlueprintSchema` without filesystem or network access.

---

### Phase 3: Core Changeset Module (`innfo-core/src/changeset/`)

**Goal**: Build the normative changeset document model, cryptographic proposal hasher, Markdown parser/serializer, and single-writer lock manager.

- [ ] **3.1 [Data Models & Types] Implement TypeScript interfaces in `types.ts`**
  - **File**: `iNNfo/packages/innfo-core/src/changeset/types.ts`
  - **Description**: Define:
    - `ChangeOp` union: `'update_field' | 'add_element' | 'remove_element' | 'rename_element' | 'rename_concept' | 'update_matrix_cell' | 'comment'`
    - `ChangeStatus` union: `'proposed' | 'applied' | 'rejected' | 'conflict'`
    - `ChangeItem` interface: `id`, `op`, `target`, `from?`, `to?`, `concept?`, `name?`, `slug?`, `fields?`, `author?`, `notes?`, `status?`, `resolution?`, `resolved_slug?`
    - `ModelVersionTransition` interface: `base_version: string`, `result_version: string`
    - `ChangesetFrontmatter` interface: `spec_version`, `parent_spec`, `blueprint_version`, `status`, `proposal_sha`, `applied_at?`, `models?`, `title?`, `author?`, `workspace_id?`
    - `ChangesetDocument` interface: `frontmatter: ChangesetFrontmatter`, `changes: ChangeItem[]`, `rawContent?: string`
    - `ChangesetApplyResult` interface: `success`, `changesetPath`, `status`, `models`, `appliedCount`, `errors?`, `warnings?`
    - `LockPayload` interface: `pid: number`, `timestamp: number`, `changeset: string`
    - `LockHandle` interface: `lockPath: string`, `payload: LockPayload`, `release: () => Promise<void>`
  - **Traceability**: Design Document Section 4.1 & 4.2.

- [ ] **3.2 [Test First] Proposal hasher unit tests (`tests/changeset/hasher.test.ts`)**
  - **File**: `iNNfo/packages/innfo-core/tests/changeset/hasher.test.ts`
  - **Description**: Author unit tests verifying:
    - `computeProposalSha` produces deterministic 64-character lowercase SHA-256 hex string over proposed changes.
    - Changing proposed fields (`to`, `from`, `target`, `notes`) produces a completely different hash.
    - Execution annotations (`status:: applied`, `resolution:: ...`, `resolved_slug:: ...`) and frontmatter fields (`applied_at`, `models`) do **not** affect the hash.
    - `verifyProposalSha` returns `true` when hash matches, `false` when proposed content is altered.
  - **Traceability**: [`changeset-document-model/spec.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/specs/changeset-document-model/spec.md#L84-L107)

- [ ] **3.3 [Implement] Deterministic proposal hasher (`hasher.ts`)**
  - **File**: `iNNfo/packages/innfo-core/src/changeset/hasher.ts`
  - **Description**: Implement `computeProposalSha(changes: ChangeItem[]): string` using Node `crypto` (`createHash('sha256')`). Canonicalize object keys and values of proposed attributes (`id`, `op`, `target`, `from`, `to`, `concept`, `name`, `slug`, `fields`, `author`, `notes`). Implement `verifyProposalSha(doc: ChangesetDocument): boolean`.
  - **Traceability**: Proposal Section 3, Design Document Section 6.1.

- [ ] **3.4 [Test First] Parser and serializer unit tests (`tests/changeset/parser.test.ts`)**
  - **File**: `iNNfo/packages/innfo-core/tests/changeset/parser.test.ts`
  - **Description**: Author unit tests verifying:
    - Parses `_changes_NN.md` document frontmatter and multiple `## NN Change: <id>` element blocks.
    - Correctly parses `update_field`, `add_element`, `rename_element`, `rename_concept`, `update_matrix_cell`, and `comment` (without `to`/`from` per **D15**).
    - Parses canonical D5 target addresses (`model@element&field`, `model@matrix&row&col`).
    - Serializer preserves Markdown headings and formatting while appending or updating resolution annotations (`status:: applied`, `resolution:: ...`, `resolved_slug:: ...`).
    - Round-trip fidelity: parsing $\to$ serializing $\to$ parsing retains all data.
  - **Traceability**: [`changeset-document-model/spec.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/specs/changeset-document-model/spec.md#L53-L82, #L109-L118)

- [ ] **3.5 [Implement] Changeset parser (`parser.ts`)**
  - **File**: `iNNfo/packages/innfo-core/src/changeset/parser.ts`
  - **Description**: Implement `parseChangeset(rawContent: string): ChangesetDocument`:
    - Parse frontmatter with YAML parser.
    - Extract `## NN Change: <id>` headings and parse `key:: value` property lines.
    - Validate required fields according to `op`.
  - **Traceability**: Design Document Section 6.1.

- [ ] **3.6 [Implement] Changeset serializer (`serializer.ts`)**
  - **File**: `iNNfo/packages/innfo-core/src/changeset/serializer.ts`
  - **Description**: Implement `serializeChangeset(doc: ChangesetDocument): string`:
    - Format frontmatter block (`yaml.stringify`), preserving `status`, `proposal_sha`, `applied_at`, `models`.
    - Emit `# NN index` and `# NN Change` section.
    - Emit each `## NN Change: <id>` block with all proposed properties followed by resolution annotations (`status::`, `resolution::`, `resolved_slug::`).
  - **Traceability**: Design Document Section 6.1.

- [ ] **3.7 [Test First] Single-writer lock manager unit tests (`tests/changeset/lock.test.ts`)**
  - **File**: `iNNfo/packages/innfo-core/tests/changeset/lock.test.ts`
  - **Description**: Author unit tests for filesystem mutex at `changes/.lock`:
    - Acquires lock via exclusive file creation (`wx`) writing PID, timestamp, changeset identifier.
    - Second concurrent acquire fails immediately with `CONCURRENT_APPLY_ACTIVE`.
    - Stale lock (> 60,000ms old) is broken safely with console warning, and lock is successfully re-acquired.
    - Calling `handle.release()` unlinks the lock file.
    - Failure inside a transaction guarantees lock release when executed in `finally`.
  - **Traceability**: [`changeset-apply-engine/spec.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/specs/changeset-apply-engine/spec.md#L9-L36)

- [ ] **3.8 [Implement] Single-writer lock manager (`lock.ts`)**
  - **File**: `iNNfo/packages/innfo-core/src/changeset/lock.ts`
  - **Description**: Implement `acquireLock(rootDir: string, changesetName: string, timeoutMs?: number): Promise<LockHandle>` and `releaseLock(handle: LockHandle): Promise<void>`. Implement stale lock recovery (>60s) and clean unlinking.
  - **Traceability**: Design Document Section 3 & 6.1.

- [ ] **3.9 [Module Exports & Verify] Changeset barrel export (`index.ts`) and `innfo-core` integration**
  - **Files**: `iNNfo/packages/innfo-core/src/changeset/index.ts`, [`innfo-core/src/index.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-core/src/index.ts)
  - **Description**: Export all types, parser, serializer, hasher, and lock manager from `changeset/index.ts`, re-export them in root `src/index.ts`. Run `npm --workspace=@cognnitive/innfo-core test -- tests/changeset/` to verify all changeset module tests pass cleanly.

---

### Phase 4: Mutation Engine Enhancements (`mutate.ts`)

**Goal**: Extend core mutation engine with `update_matrix_cell`, slug-aware target resolution, and field citation rewriting helper per decision **D20**.

- [ ] **4.1 [Test First] Matrix cell mutation & slug target tests**
  - **File**: [`tests/mutate.test.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-core/tests/mutate.test.ts) (or create/update)
  - **Description**: Author unit tests verifying:
    - `update_matrix_cell` updates an existing cell's value in a matrix by row and column identifiers.
    - `update_matrix_cell` inserts a new cell if the `{ row, col }` coordinate does not exist.
    - Supports matrix lookup by slug or name.
    - Supports row/col lookup by slug or name.
  - **Traceability**: [`changeset-document-model/spec.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/specs/changeset-document-model/spec.md#L76-L82)

- [ ] **4.2 [Implement] Add `update_matrix_cell` handler in `mutate.ts`**
  - **File**: [`mutate.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-core/src/mutate.ts)
  - **Description**:
    - Implement `updateMatrixCell(model, args, schema): MutationResult` handling `{ matrixName?, matrixSlug?, row, col, value }`.
    - Locate matrix in `model.matrices`.
    - If cell exists for `{ row, col }`, mutate its value. Otherwise, push new cell entry.
    - Register `update_matrix_cell` in `MUTATION_HANDLERS`.
  - **Traceability**: Proposal Section 4, Design Document Section 6.1.

- [ ] **4.3 [Implement] Support slug-aware targeting and D5 address resolution in mutation handlers**
  - **File**: [`mutate.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-core/src/mutate.ts)
  - **Description**: Enhance element and matrix lookup helpers to look up by explicit `slug` property as primary/fallback when matching target elements.
  - **Traceability**: Design Document Section 6.1.

- [ ] **4.4 [Test First & Implement] Field citation rewriting helper per D20**
  - **Files**: [`tests/mutate.test.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-core/tests/mutate.test.ts), [`mutate.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-core/src/mutate.ts) (or `sourceRef.ts`)
  - **Description**:
    - Author test asserting `rewriteFieldCitation(element, fieldName, citationRef)` updates the field-level citation to `changes/<changeset_file>@## NN Change: <id>`, leaves untouched fields on the element unchanged, and records the reference in element sources.
    - Implement and export `rewriteFieldCitation` helper function.
  - **Traceability**: [`field-citation-provenance/spec.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/specs/field-citation-provenance/spec.md#L9-L28), Backlog **D20**.

- [ ] **4.5 [Verify & Refactor] Run `mutate.test.ts` suite**
  - **Command**: `npm --workspace=@cognnitive/innfo-core test -- tests/mutate.test.ts`
  - **Description**: Ensure all mutation handler tests pass.

---

### Phase 5: Two-Phase Apply Transaction & Tool Refactor in MCP (`apply-change.ts`)

**Goal**: Refactor `apply_change` into an atomic two-phase transaction engine guarded by `changes/.lock`, supporting in-memory validation, model snapshot archival to `kNNowledge/archive/`, frontmatter version bumping, D20 citation rewriting, and idempotent replays.

- [ ] **5.1 [Test First] Apply engine integration tests (`test/apply-change.test.ts`)**
  - **File**: [`apply-change.test.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-mcp/test/apply-change.test.ts)
  - **Description**: Author comprehensive integration tests covering:
    - **Single-Writer Lock**: Active lock blocks concurrent execution with `CONCURRENT_APPLY_ACTIVE`; lock is released on error or success.
    - **Tamper Detection**: If proposed changes in changeset do not match `proposal_sha`, transaction fails fast with `PROPOSAL_TAMPERED`.
    - **Precondition Check**: If `from` value does not match current model field value, transaction aborts with `CONFLICT` / `PRECONDITION_FAILED`.
    - **Phase 1 Validation Failure**: When mutation produces invalid schema state, Phase 1 validation aborts: **zero** files written or archived, live files untouched, lock released.
    - **Phase 2 Persistence & Snapshot Archival**: Successful apply moves prior model to `kNNowledge/archive/<model_stem>_<base_version>_<stamp>_<changeset_stem>_NN.md`, creates updated live model with bumped `knowledge_version` (`V_0-1-0` $\to$ `V_0-1-1`), and annotates changeset file with `status: applied`.
    - **Field Citation Rewriting (D20)**: Touched fields cite `changes/<changeset>@## NN Change: <id>`, untouched fields retain their previous citations.
    - **Idempotent Replay**: Re-applying an already applied changeset detects matching model versions and returns success no-op without re-bumping or duplicating archive files.
    - **Bare Operation Synthesis**: Calling `apply_change` with legacy bare arguments (`op`, `args`) synthesizes, seals, and executes a valid changeset file in `changes/`.
  - **Traceability**: [`changeset-apply-engine/spec.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/specs/changeset-apply-engine/spec.md), [`knowledge-version-and-snapshot/spec.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/specs/knowledge-version-and-snapshot/spec.md), Backlog **D8**, **D9**, **D20**.

- [ ] **5.2 [Implement] Phase 1 Transaction: In-Memory Compute, Validation & Citation Rewriting**
  - **File**: [`apply-change.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-mcp/src/tools/apply-change.ts)
  - **Description**:
    - Acquire lock at `changes/.lock` via `acquireLock`.
    - Parse changeset document and verify `proposal_sha` via `verifyProposalSha`.
    - Check replay idempotency: if `status === 'applied'`, compare live model versions with recorded `result_version` and return early if matched.
    - Load affected models into memory.
    - Evaluate preconditions: verify current field values match `from` preconditions.
    - Execute mutations in memory via `innfo-core` mutation engine.
    - Rewrite citations for every touched field to `changes/<changeset_file>@## NN Change: <id>` per **D20**.
    - Bump `knowledge_version` in frontmatter of touched models once per changeset (patch default, or minor/major if requested).
    - Run `validateKnowledge` across all touched models against their blueprints. If any model has errors, abort transaction immediately: release lock and return `VALIDATION_FAILED`.
  - **Traceability**: Design Document Section 5.1 & 6.3.

- [ ] **5.3 [Implement] Phase 2 Transaction: Atomic Persistence & Snapshot Archival**
  - **File**: [`apply-change.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-mcp/src/tools/apply-change.ts)
  - **Description**:
    - Ensure directory `<rootDir>/kNNowledge/archive/` exists.
    - For each touched model:
      - Write mutated content to staging file `kNNowledge/<model_stem>.tmp`.
      - Move previous active model file to archive: `kNNowledge/archive/<model_stem>_<base_version>_<stamp>_<changeset_stem>_NN.md`.
      - Atomically rename `kNNowledge/<model_stem>.tmp` to `kNNowledge/<model_stem>_NN.md`.
    - Update changeset document on disk:
      - Annotate each applied change element with `status:: applied`, `resolution:: Applied successfully`, and `resolved_slug:: <assigned_slug>`.
      - Update frontmatter: `status: applied`, `applied_at: <ISO-stamp>`, and `models: { [slug]: { base_version, result_version } }`.
      - Write updated changeset file back to `changes/`.
    - Always release `changes/.lock` in `finally` block.
    - Return `ChangesetApplyResult`.
  - **Traceability**: Design Document Section 5.1, 5.4 & 6.3.

- [ ] **5.4 [Implement] Idempotent Replay Handling & Bare Argument Synthesis**
  - **File**: [`apply-change.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-mcp/src/tools/apply-change.ts)
  - **Description**:
    - When `status === 'applied'`, perform fast-path verification of target model versions against `result_version`.
    - When called with legacy bare mutation arguments (`op`, `args`), synthesize a valid sealed changeset document (`<workspace_id>_agent_<stamp>_changes_NN.md`), compute `proposal_sha`, write to `changes/`, and execute via the transaction engine.
  - **Traceability**: Proposal Section 6, Backlog **D8**.

- [ ] **5.5 [Implement] Update MCP Tool Registration & Schemas in `server.ts`**
  - **File**: [`server.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-mcp/src/server.ts)
  - **Description**: Update `apply_change` tool definition in MCP server:
    - Add `changeset_path` string parameter.
    - Maintain optional legacy `op` and `args` parameters for programmatic fallback.
    - Update documentation to describe atomic two-phase changeset execution.
  - **Traceability**: Proposal Section 6, Design Document Section 6.3.

- [ ] **5.6 [Verify & Refactor] Run `apply-change.test.ts` suite**
  - **Command**: `npm --workspace=@cognnitive/innfo-mcp test -- test/apply-change.test.ts`
  - **Description**: Confirm all two-phase apply, locking, archival, and idempotency tests pass.

---

### Phase 6: Decouple `knowledge_version` in Scaffolding (`init-knowledge.ts`)

**Goal**: Remove blueprint version coupling in model initialization per decision **D9**, allowing models to declare `knowledge_version: "V_0-1-0"` independently of parent blueprint `spec_version: "V_0-4-0"`.

- [ ] **6.1 [Test First] Scaffolding decoupling tests in `init-knowledge.spec.ts`**
  - **File**: [`init-knowledge.spec.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-mcp/src/tools/init-knowledge.spec.ts)
  - **Description**:
    - Update test `Mismatch refused: a differing explicit version fails with VERSION_MISMATCH` to assert that an explicit differing version (`knowledge_version: "V_0-1-0"` with blueprint `spec_version: "V_0-4-0"`) now **succeeds** and sets `knowledge_version: "V_0-1-0"`.
    - Assert that no `VERSION_MISMATCH` error is returned.
  - **Traceability**: [`knowledge-version-and-snapshot/spec.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/specs/knowledge-version-and-snapshot/spec.md#L85-L101), Backlog **D9**.

- [ ] **6.2 [Implement] Decouple `knowledge_version` in `init-knowledge.ts`**
  - **File**: [`init-knowledge.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-mcp/src/tools/init-knowledge.ts)
  - **Description**:
    - Remove the `VERSION_MISMATCH` validation failure block (lines ~208–234).
    - Set default `knowledgeVersion = requestedVersion || 'V_0-1-0'` independently of `inferredVersion`.
    - Update docstrings and comments.
  - **Traceability**: Proposal Section 7, Design Document Section 6.3.

- [ ] **6.3 [Verify & Refactor] Run `init-knowledge.spec.ts`**
  - **Command**: `npm --workspace=@cognnitive/innfo-mcp test -- src/tools/init-knowledge.spec.ts`
  - **Description**: Confirm model initialization tests pass cleanly with decoupled versions.

---

### Phase 7: Retire Legacy Agent Modification Block & Verbatim-Paste Strings

**Goal**: Completely eliminate `## NN Agent Modification` generation, the `modification` result string, and the verbatim-paste requirement per decision **D8**.

- [ ] **7.1 [Implement & Refactor] Remove `modification` property and `buildAgentModificationBlock` from `applyChange`**
  - **Files**: [`apply-change.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-mcp/src/tools/apply-change.ts), [`ApplyChangeResult`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-mcp/src/tools/apply-change.ts#L20-L33)
  - **Description**:
    - Remove `modification?: string` from `ApplyChangeResult` interface.
    - Remove imports of `buildAgentModificationBlock` in `apply-change.ts`.
    - Remove modification block assembly on mutation success.
    - Return structured changeset apply outcome (`changesetPath`, `status`, `models`, `appliedCount`).
  - **Traceability**: [`changeset-apply-engine/spec.md`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/openspec/changes/2026-10-07-changeset-apply-and-versioning/specs/changeset-apply-engine/spec.md#L101-L114), Backlog **D8**.

- [ ] **7.2 [Verify & Update Tests] Update tests asserting on `modification` block**
  - **Files**: [`test/apply-change.test.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-mcp/test/apply-change.test.ts), [`src/tools/mutate.spec.ts`](file:///D:/Users/lucas/Documents/GitHub/cogNNitive-stable-element-identity/iNNfo/packages/innfo-mcp/src/tools/mutate.spec.ts)
  - **Description**: Update test assertions expecting `result.modification` to assert on structured changeset return properties instead.
  - **Traceability**: Proposal Section 9.

- [ ] **7.3 [Audit] Audit codebase for remaining verbatim-paste references**
  - **Description**: Verify that no production tool prompts or documentation mandate verbatim-pasting markdown blocks into LLM chat responses.

---

### Phase 8: Verification & Integrity Gate Run

**Goal**: Execute comprehensive test suites, TypeScript typechecking, and integrity gates across the entire repository.

- [ ] **8.1 [Package Test Suites] Run test suites across `innfo-core` and `innfo-mcp`**
  - **Command**: `npm --workspace=@cognnitive/innfo-core test && npm --workspace=@cognnitive/innfo-mcp test`
  - **Description**: Confirm all unit and integration tests across both packages execute green.

- [ ] **8.2 [Workspace Typecheck] Run TypeScript typecheck**
  - **Command**: `npm run typecheck`
  - **Description**: Verify zero TypeScript errors across `innfo-core`, `innfo-mcp`, `innfo-editor`, and other workspaces.

- [ ] **8.3 [Integrity Gates] Run repository integrity check**
  - **Command**: `node scripts/check-integrity.js`
  - **Description**: Run repository check-integrity script to verify blueprints, schemas, and naming invariants.

- [ ] **8.4 [Success Criteria Validation] Verify all criteria from `proposal.md`**
  - **Description**: Verify that all checklist items in `proposal.md` Section 9 (Deep archive exclusion, role classification, changeset model, single-writer lock, two-phase apply, idempotency, citation rewriting, and legacy retirement) are satisfied.

---

## Deliverables & Traceability Summary

| File / Component | Primary Task | Spec / Decision Reference |
|---|---|---|
| `iNNfo/packages/innfo-core/src/naming/contract.ts` | Tasks 1.1, 1.2 | D7, D9 (`changeset-document-model`, `knowledge-version-and-snapshot`) |
| `iNNfo/specs/bluepriNNts/changes/spec_NN.md` | Task 2.2 | D7 (`changeset-document-model`) |
| `iNNfo/packages/innfo-core/src/schema/canonical-registry.ts` | Task 2.3 | D7 (`changeset-document-model`) |
| `iNNfo/packages/innfo-core/src/changeset/types.ts` | Task 3.1 | D7, D15 (`changeset-document-model`) |
| `iNNfo/packages/innfo-core/src/changeset/hasher.ts` | Tasks 3.2, 3.3 | D7 (`changeset-document-model`) |
| `iNNfo/packages/innfo-core/src/changeset/parser.ts` | Tasks 3.4, 3.5 | D7, D15 (`changeset-document-model`) |
| `iNNfo/packages/innfo-core/src/changeset/serializer.ts` | Tasks 3.4, 3.6 | D7 (`changeset-document-model`) |
| `iNNfo/packages/innfo-core/src/changeset/lock.ts` | Tasks 3.7, 3.8 | Cross-cutting (`changeset-apply-engine`) |
| `iNNfo/packages/innfo-core/src/mutate.ts` | Tasks 4.2, 4.3, 4.4 | D20 (`changeset-document-model`, `field-citation-provenance`) |
| `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts` | Tasks 5.2, 5.3, 5.4, 7.1 | D8, D9, D20 (`changeset-apply-engine`, `knowledge-version-and-snapshot`, `field-citation-provenance`) |
| `iNNfo/packages/innfo-mcp/src/server.ts` | Task 5.5 | D8 (`changeset-apply-engine`) |
| `iNNfo/packages/innfo-mcp/src/tools/init-knowledge.ts` | Task 6.2 | D9 (`knowledge-version-and-snapshot`) |
