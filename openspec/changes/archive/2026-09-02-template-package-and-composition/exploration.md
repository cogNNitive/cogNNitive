# Exploration Report: `template-package-and-composition`

## Executive Summary

This report explores the architectural design and implementation strategy for **Template Package Structure & Composition** (`template-package-and-composition`) across the cogNNitive ecosystem—specifically `iNNfo` (metamodeling core & MCP server), `actioNN` (skills lifecycle & procedures), and `eNNvironment` (bootstrap manifest validation).

As cogNNitive models evolve beyond simple standalone Level 2 specs into modular, composable domain frameworks (e.g. `business`, `projects`, `procedures`, `cogNNitive`), templates require structured packaging, robust local cache management, explicit collision resolution during `includes` composition, dynamic procedure/skill discovery, and automated orphaned spec migration/pruning with user backup prompts.

---

## 1. Investigation & Findings by Scope Item

### Scope 1: Template Package Structure & Local Cache Download

#### Current State
* Currently, `iNNfo/specs/templates` contains a hybrid structure: some templates exist as flat single files (e.g., `specs/templates/workspace_spec_NN.md`), while others use non-standardized subdirectories containing side-by-side versions (e.g., `specs/templates/business/business_V_0-1-0_NN.md` and `business_V_0-2-0_NN.md`) alongside a shared `samples/` directory.
* `innfo-mcp`'s [`resolver-node.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts#L173-L201) fetches remote single-file specs via HTTP and saves them as flat versioned files directly into `specs/${specName}_NN.md` using `saveSpecOnce()`.
* Resolution precedence in [`resolver.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-core/src/resolver.ts#L87-L135) walks three tiers:
  1. Workspace local (`./templates/`, `./specs/`, `./`)
  2. Global user store (`~/.agents/templates/`)
  3. Installed skill directories (`~/.agents/skills/*/templates/`)

#### Target Package Specification (`specs/templates/<name>/<version>/`)
To support self-contained, versioned template distribution, template packages must follow a canonical directory structure:

```
specs/templates/<template-name>/<version>/
├── spec_NN.md                # Canonical Level 2 spec template file (or <name>_V_<version>_NN.md)
├── samples/                  # Level 3 sample model files demonstrating template usage
│   ├── SampleModel_A_NN.md
│   └── SampleModel_B_NN.md
├── procedures/               # Standard Operating Procedure (SOP) specs bundled with template
│   └── Relevamiento_V_0-1-0_procedures_NN.md
└── skills/                   # Agent skill manifests or references attached to template
    └── SKILL.md
```

#### Multi-Tier Local Cache & Remote Fetch Strategy
When `innfo-mcp` or `innfo-core` resolves a template URL (e.g., `https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/business/V_0-2-0/spec_NN.md`):
1. **Local Lookup Order**:
   - Workspace package directory: `./specs/templates/<name>/<version>/`
   - Workspace flat fallback: `./templates/<name>_V_<version>_NN.md`
   - Global user cache: `~/.agents/templates/<name>/<version>/`
   - Installed skill templates: `~/.agents/skills/*/templates/<name>/<version>/`
2. **Remote Hydration**:
   - If not found locally, `innfo-mcp` downloads the template package (as single files or package archive/tarball) into `specs/templates/<name>/<version>/`.
   - Immutable write-once rule: cached version folders in `specs/templates/<name>/<version>/` are write-once and atomically populated via temporary directory renames to prevent partial state corruption.

---

### Scope 2: Orphaned Spec Clean Up & Backup Prompt

#### Current State
* In [`mutate.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-mcp/src/tools/mutate.ts#L263-L426), `bumpVersion()` updates a model's `model_version`, renames the model file, updates parent references, and writes the bumped parent template to `specs/`.
* **Gaps**:
  * Old spec versions in `specs/` or `specs/templates/` are left orphaned on disk after version migrations.
  * There is no reference-counting or reachability analysis across workspace models to identify which spec versions are still in use.
  * There is no safety backup or git working tree clean check before version migrations, risking unintended spec loss or broken historical references.

#### Target Clean Up & Backup Workflow
1. **Pre-Migration Safety & Backup Consent**:
   - Before executing `bump_version` or a spec migration operation, the engine checks git status or prompts the user for backup consent.
   - If uncommitted changes exist or `--backup` is specified, create an archive snapshot (e.g., `.backup/specs_<timestamp>.zip` or a git commit checkpoint).
2. **Workspace Spec Reference Graph**:
   - Crawl all Level 3 models in `models/`, root workspace entrypoints (`workspace_NN.md`, `index.md`), and Level 2 templates in `templates/`.
   - Collect all required parent specs and transitive `includes` dependencies into a set of active spec versions: $\mathcal{S}_{\text{active}}$.
3. **Orphan Identification & Pruning Engine**:
   - Scan `specs/` and `specs/templates/` for any template package or spec file whose name/version is not in $\mathcal{S}_{\text{active}}$.
   - Expose a new MCP operation: `prune_orphaned_specs` with parameters:
     ```json
     {
       "dry_run": true,
       "backup": true
     }
     ```
   - Returning a detailed report of pruned vs preserved spec versions.

---

### Scope 3: Template Composition (`includes`) Collision Handling

#### Current State
* `innfo-core` [`tests/includes-composition.test.ts`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/iNNfo/packages/innfo-core/tests/includes-composition.test.ts#L89-L100) tests basic additive composition. When two included templates define the same `Concept Definition` (e.g., `Alpha`), `resolveTemplateSchema()` flags a collision error naming both source templates.
* **Gaps**:
  * There is currently no mechanism for template authors to explicitly resolve collisions when composing base templates that happen to share concept or field names.
  * Without explicit aliasing/renaming, composing two domain templates with overlapping primitive names fails validation completely.

#### Explicit Renaming & Aliasing Specification
To resolve collisions deterministically, `includes` declarations in template YAML frontmatter support explicit renaming rules:

```yaml
---
level: 2
title: "Composite Project Business"
parent_spec:
  name: "iNNfo_V_0-2-0"
  url: "https://cognnitive.com/innfo/specs/iNNfo_V_0-2-0_NN.md"
includes:
  - name: "business"
    url: "https://cognnitive.com/innfo/specs/templates/business/V_0-2-0/spec_NN.md"
    alias:
      concepts:
        "Task": "BusinessTask"
  - name: "projects"
    url: "https://cognnitive.com/innfo/specs/templates/projects/V_0-2-0/spec_NN.md"
    alias:
      concepts:
        "Task": "ProjectTask"
---
```

#### Validation & Resolution Rules in `validate_template`
1. **Alias Application**: When loading an included template, `resolveTemplateSchema()` applies declared `alias` maps to concept names, field scopes, and matrix row/column concepts before merging into the composite schema.
2. **Strict Collision Enforcement**: If two included templates define identical concept or field names *without* explicit aliasing, `validate_template` emits a blocking validation error:
   `[COMPOSITION_COLLISION] Concept "Task" defined in both "business" and "projects". Explicit renaming required via frontmatter 'alias' map.`

---

### Scope 4: Dynamic Procedure & Skill Discovery

#### Current State
* Procedures and skills are defined statically or referenced ad-hoc within skill repositories (`actioNN/skills/`).
* Level 2 templates lack a uniform mechanism for declaring and exposing associated SOP procedures and agent skills to `nn-innfo` or MCP clients.

#### Declaration & Discovery Mechanism
1. **Template Package Declarations**:
   A Level 2 template declares attached procedures and skills in its frontmatter:
   ```yaml
   procedures:
     - id: "relevar-vivienda"
       name: "Relevamiento de Vivienda"
       path: "procedures/relevamiento_vivienda_NN.md"
   skills:
     - name: "nn-reforma-casa"
       repo: "cogNNitive/actioNN"
       path: "skills/nn-reforma-casa"
   ```
2. **Transitive Discovery Across `includes` Tree**:
   - When a workspace adopts a composite template, `innfo-mcp` resolves the full `includes` inheritance tree.
   - Aggregate all `procedures` and `skills` declared across the host template and all transitively included base templates.
3. **MCP Tool & `nn-innfo` Integration**:
   - Enhance `innfo-mcp` tools:
     - `list_template_procedures`: Returns all procedures declared in active workspace templates.
     - `list_template_skills`: Returns all skills declared across active templates.
   - `nn-innfo` skill dynamically discovers available workflows/procedures when interacting with a model, providing prompt suggestions and automated execution routes.

---

### Scope 5: Documentation Updates Across Repositories

#### Required Documentation Changes

| Repository | File / Section | Proposed Updates |
|---|---|---|
| `iNNfo` | `docs/template-package-spec.md` | Formalize `specs/templates/<name>/<version>/` folder structure, package asset manifests (`spec_NN.md`, `samples/`, `procedures/`, `skills/`). |
| `iNNfo` | `packages/innfo-mcp/README.md` | Document updated MCP tools (`list_templates`, `hydrate_template`, `prune_orphaned_specs`) and composition `alias` schema. |
| `actioNN` | `docs/skills-manager.md` & `AGENTS.md` | Document dynamic procedure/skill discovery from Level 2 templates and template hydration. |
| `eNNvironment` | `docs/use/manifest.md` | Update `agent-bootstrap` manifest specification for template package bundling and resolution rules. |

---

## 2. Evaluation of Architectural Options

### Option A: Flat Versioned Files vs. Structured Package Directories

* **Flat Files (`specs/business_V_0-1-0_NN.md`)**:
  * *Pros*: Simple single-file reads; easy to store in single directory.
  * *Cons*: Cannot bundle samples, SOP procedures, or skill manifests; poor organization as template ecosystems grow.
* **Structured Package Directories (`specs/templates/<name>/<version>/`) [RECOMMENDED]**:
  * *Pros*: Self-contained bundles holding specs, samples, procedures, and skills; scalable; clean versioning.
  * *Cons*: Requires folder creation and recursive package hydration logic.

### Option B: Automatic Auto-Renaming vs. Explicit Frontmatter Aliasing for Composition Collisions

* **Automatic Auto-Renaming (e.g. `business_Task`, `projects_Task`)**:
  * *Pros*: Zero manual configuration needed by template authors.
  * *Cons*: Obscures domain model terminology; breaks explicit model reference semantics; hard to predict.
* **Explicit Frontmatter Aliasing (`alias: concepts: { "Task": "BusinessTask" }`) [RECOMMENDED]**:
  * *Pros*: Explicit, predictable, self-documenting; allows domain modelers full control over composed names.
  * *Cons*: Fails validation if two base templates clash until author adds explicit alias.

---

## 3. Implementation Plan & Strategy

1. **`iNNfo` Metamodeling Core (`innfo-core`)**:
   - Update `resolveTemplateSchema()` in `taxonomy.ts` to support `alias` maps for concepts, fields, and matrices during `includes` composition.
   - Enhance collision diagnostic error messages with explicit alias guidance.

2. **`iNNfo` MCP Server (`innfo-mcp`)**:
   - Update `resolver-node.ts` to fetch and store template packages into `specs/templates/<name>/<version>/`.
   - Implement `prune_orphaned_specs` tool in `mutate.ts` with reference graph construction and `--backup` archive option.
   - Add `list_template_procedures` and `list_template_skills` endpoints in `spec.ts`.

3. **`actioNN` Integration**:
   - Update `nn-innfo` skill and `skills-manager` to discover procedures/skills exposed via template composition.

4. **Documentation**:
   - Update documentation across `iNNfo`, `actioNN`, and `eNNvironment`.

---

## 4. Risks & Mitigations

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| **Accidental Spec Deletion during Pruning** | High (Loss of historical spec definitions) | Require explicit `--backup` flag (or create `.backup/` archive automatically) before pruning, and enforce dry-run default. |
| **Breaking Existing Flat Template References** | Medium (Resolution failure for legacy workspaces) | Maintain backwards-compatible fallback in `resolver.ts` to search flat `./templates/` and `./specs/` files if package directory is absent. |
| **Complex Nesting Cycles in Composed `includes`** | Medium (Infinite resolution loops) | Enforce maximum recursion depth (default 10) and maintain visit sets (`seen`) in `buildIncludeContentMap()`. |

---

## 5. Recommended Next Steps

1. Create OpenSpec change proposal and delta spec artifacts for `template-package-and-composition`.
2. Implement schema `alias` resolution and validation in `innfo-core`.
3. Implement `specs/templates/<name>/<version>/` package resolver and orphan pruning in `innfo-mcp`.
4. Update `actioNN` and ecosystem documentation.
