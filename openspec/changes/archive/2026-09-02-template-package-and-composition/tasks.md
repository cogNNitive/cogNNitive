# Implementation Tasks: Template Package Structure & Composition

This document defines the discrete implementation task batches, estimated line budgets, and review workload forecast for the `template-package-and-composition` change.

---

## Task Batches

### Batch 1: Data Model & Types
**Scope**: Frontmatter `alias` types, package asset structures, and core interfaces in `innfo-core`.
**Files**:
- `iNNfo/packages/innfo-core/src/types.ts`
- `iNNfo/packages/innfo-core/src/schema.ts`
- `iNNfo/packages/innfo-core/src/index.ts`
- `iNNfo/packages/innfo-core/src/types.spec.ts`

**Tasks**:
- [x] 1.1 Define `AliasMap` (`concepts?: Record<string, string>`, `fields?: Record<string, string>`) and update `IncludedTemplateRef` interface in `types.ts`.
- [x] 1.2 Define `TemplateProcedure`, `TemplateSkill`, `ResolvedTemplatePackage`, and `ReachabilityGraph` interfaces in `types.ts`.
- [x] 1.3 Update Zod/YAML parsing schemas in `schema.ts` to parse `alias`, `procedures`, and `skills` frontmatter blocks.
- [x] 1.4 Re-export all new types and schemas in `innfo-core/src/index.ts`.
- [x] 1.5 Add unit tests in `types.spec.ts` verifying parsing of `alias`, `procedures`, and `skills` frontmatter blocks.

---

### Batch 2: Validation & Collision Engine
**Scope**: Collision detection and explicit frontmatter alias map resolution in `resolveTemplateSchema` and `validate_template`.
**Files**:
- `iNNfo/packages/innfo-core/src/resolver.ts`
- `iNNfo/packages/innfo-core/src/validator/index.ts`
- `iNNfo/packages/innfo-core/src/resolver.spec.ts`
- `iNNfo/packages/innfo-core/src/validator.spec.ts`

**Tasks**:
- [x] 2.1 Implement frontmatter `alias` map application in `resolver.ts` renaming concept definitions, field scopes (`Concept.field`), matrix row/column concepts, and constraint expressions prior to schema merging.
- [x] 2.2 Implement multi-level inheritance resolution up to depth 10 with cycle detection using a `seen` path tracker set.
- [x] 2.3 Add composition collision detection logic in `validate_template` and `resolver.ts` that throws a blocking `[COMPOSITION_COLLISION]` error when un-aliased concept or field collisions occur across base templates.
- [x] 2.4 Add comprehensive unit tests in `resolver.spec.ts` and `validator.spec.ts` covering aliased concept resolution, matrix renaming, cycle rejection, and `[COMPOSITION_COLLISION]` diagnostic reporting.

---

### Batch 3: Multi-tier Package Resolver & Hydration
**Scope**: 4-tier package directory resolution and immutable local hydration in `innfo-mcp / resolver-node.ts`.
**Files**:
- `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts`
- `iNNfo/packages/innfo-mcp/src/tools/spec.ts`
- `iNNfo/packages/innfo-mcp/src/tools/resolver-node.spec.ts`
- `iNNfo/packages/innfo-mcp/src/tools/spec.spec.ts`

**Tasks**:
- [x] 3.1 Implement 4-tier template package resolution in `resolver-node.ts` checking:
  1. Workspace package directory: `./specs/templates/<name>/<version>/`
  2. Workspace flat fallback: `./templates/<name>_V_<version>_NN.md` or `./specs/`
  3. Global user cache: `~/.agents/templates/<name>/<version>/`
  4. Installed skills directory: `~/.agents/skills/*/templates/<name>/<version>/`
- [x] 3.2 Implement atomic remote download and hydration (download to staging directory $\rightarrow$ atomic rename to `specs/templates/<name>/<version>/`).
- [x] 3.3 Enforce write-once cache immutability (preserve existing package directory contents without redundant re-downloads).
- [x] 3.4 Expose `hydrate_template` MCP tool endpoint in `spec.ts`.
- [x] 3.5 Add unit and integration tests in `resolver-node.spec.ts` and `spec.spec.ts` verifying 4-tier resolution order and atomic hydration.

---

### Batch 4: Version Migration, Backup & Pruning Tooling
**Scope**: `prune_orphaned_specs` MCP tool, spec reachability analysis graph, and zip backup archive creation.
**Files**:
- `iNNfo/packages/innfo-mcp/src/tools/mutate.ts`
- `iNNfo/packages/innfo-mcp/src/tools/mutate.spec.ts`

**Tasks**:
- [x] 4.1 Implement workspace reference reachability graph calculation in `mutate.ts` traversing L3 models (`models/`), root entrypoints (`workspace_NN.md`), and L2 templates (`templates/`) to build active vs orphaned spec sets.
- [x] 4.2 Build backup zip creation module packaging orphan spec candidates into `.backup/specs_<timestamp>.zip` before mutation.
- [x] 4.3 Implement `prune_orphaned_specs` MCP tool supporting parameters `dry_run` (default `true`) and `backup` (default `true`).
- [x] 4.4 Update `bump_version` workflow to verify git working tree cleanliness and prompt for backup consent before modifying specs.
- [x] 4.5 Add test suite in `mutate.spec.ts` covering reachability graph calculation, dry-run safety reporting, zip archive generation, and safe spec deletion.

---

### Batch 5: Dynamic SOP & Skill Discovery
**Scope**: Transitive procedures and skills discovery endpoints across composite template inheritance trees.
**Files**:
- `iNNfo/packages/innfo-mcp/src/tools/spec.ts`
- `actioNN/skills/nn-innfo/`
- `iNNfo/packages/innfo-mcp/src/tools/spec.spec.ts`

**Tasks**:
- [x] 5.1 Implement transitive procedure and skill discovery traversing `includes` trees up to depth 10, deduplicating entries by procedure `id` and skill `name`.
- [x] 5.2 Expose `list_template_procedures` and `list_template_skills` MCP endpoints in `innfo-mcp`.
- [x] 5.3 Integrate procedure and skill endpoint resolution into the `nn-innfo` skill in `actioNN`.
- [x] 5.4 Add tests in `spec.spec.ts` verifying transitive procedure and skill aggregation across multi-level inheritance trees.

---

### Batch 6: Documentation & Ecosystem Alignment
**Scope**: Synchronize technical documentation across `iNNfo`, `actioNN`, and `eNNvironment`.
**Files**:
- `iNNfo/docs/template-package-spec.md`
- `iNNfo/packages/innfo-mcp/README.md`
- `actioNN/docs/documentation/skills/skills-manager.md`
- `actioNN/AGENTS.md`
- `eNNvironment/docs/use/manifest.md`

**Tasks**:
- [x] 6.1 Create `iNNfo/docs/template-package-spec.md` documenting the standardized `specs/templates/<name>/<version>/` directory layout and asset subdirectories (`samples/`, `procedures/`, `skills/`).
- [x] 6.2 Update `iNNfo/packages/innfo-mcp/README.md` documenting all new MCP tools (`list_templates`, `hydrate_template`, `prune_orphaned_specs`, `list_template_procedures`, `list_template_skills`), default safety parameters (`dry_run: true`, `backup: true`), and composition `alias` YAML frontmatter syntax.
- [x] 6.3 Update `actioNN` documentation (`skills-manager.md` and `AGENTS.md`) detailing dynamic procedure and skill discovery via `nn-innfo`.
- [x] 6.4 Update `eNNvironment` documentation (`manifest.md`) specifying `agent-bootstrap` manifest integration with template versioning, multi-tier lookup, and local cache paths.

---

## Line Budget Estimate

| Task Batch | Target Files | Estimated Line Delta |
|---|---|---|
| **Batch 1: Data Model & Types** | `types.ts`, `schema.ts`, `index.ts`, `types.spec.ts` | ~180 lines |
| **Batch 2: Validation & Collision Engine** | `resolver.ts`, `validator/index.ts`, test files | ~350 lines |
| **Batch 3: Multi-tier Package Resolver & Hydration** | `resolver-node.ts`, `spec.ts`, test files | ~320 lines |
| **Batch 4: Version Migration, Backup & Pruning Tooling** | `mutate.ts`, `mutate.spec.ts` | ~380 lines |
| **Batch 5: Dynamic SOP & Skill Discovery** | `spec.ts`, `nn-innfo` integration, test files | ~240 lines |
| **Batch 6: Documentation & Ecosystem Alignment** | `iNNfo` docs, `actioNN` docs, `eNNvironment` docs | ~280 lines |
| **Total Estimated Delta** | **~18 files across core packages & docs** | **~1,750 lines** |

---

## Review Workload Forecast

- **Total Files**: 18 files (modified or created across `iNNfo`, `actioNN`, and `eNNvironment`).
- **High Impact Modules**:
  - `innfo-core` schema resolver & composition collision validator engine.
  - `innfo-mcp` multi-tier resolver node & disk mutation reachability/backup engine.
- **Risk Assessment**:
  - **Medium**: High surface area across 3 ecosystem repositories, but risk is strongly mitigated by:
    1. Mandatory backup archive generation (`.backup/specs_<timestamp>.zip`).
    2. Default `dry_run: true` on destructive pruning operations.
    3. Strict 4-tier fallback order preserving backward compatibility with legacy flat template files.
- **Estimated Review Effort**: 45 - 60 minutes.
