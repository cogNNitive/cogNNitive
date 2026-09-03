# Exploration Report: `bundle-templates-and-skills`

## Executive Summary

This report evaluates strategies and architectural requirements for **bundling templates and skills** across the cogNNitive ecosystem components: `actioNN` (skills lifecycle & management), `iNNfo` (metamodeling core, editor, & MCP), and `eNNvironment` (bootstrap manifest definition & verification).

Currently, `actioNN/scripts/skills-manager.js` and `eNNvironment/scripts/validate-manifest.js` only pin, download, and validate **skills** (`agent-bootstrap.skills`). However, practical workflows (such as `Simulacro/manifest.md` and Level 3 workspace entrypoint initializations) require both **skills** (e.g. `nn-innfo`, `nn-reforma-casa`) and **Level 2 templates** (e.g. `workspace_spec_NN`, `projects`, `Casa_Template_V_0-1-0_spec_NN`).

This exploration formulates **2 distinct architectural approaches** for template and skill bundling, details the required changes across all three repositories, and outlines a comprehensive verification plan.

---

## 1. Investigation of Current Infrastructure

### A. actioNN (`actioNN/scripts/skills-manager.js`)
* **Current State**:
  * Downloads skill tarballs from GitHub releases/commits (`codeload.github.com/${skill.repo}/tar.gz/${skill.commit}`).
  * Installs skills to `~/.agents/skills/${skill.name}`.
  * Tracks installed skill states (pinned commit vs installed commit) in `~/.agents/skills-state.json`.
  * Commands supported: `status`, `install`, `update`, `sync`.
* **Gaps**:
  * No awareness of `templates`. Cannot parse, pin, install, or sync template files.
  * Assumes skills are standalone code/markdown directories without bundled template assets or dependencies on external Level 2 spec templates.

### B. eNNvironment (`eNNvironment/docs/use/manifest.md` & `eNNvironment/scripts/validate-manifest.js`)
* **Current State**:
  * `docs/use/manifest.md` defines `agent-bootstrap` frontmatter containing `skills: [...]` and `workflows: [...]`.
  * `validate-manifest.js` validates `skills` for structural integrity, commit existence on GitHub API, path/`SKILL.md` presence, version parity with `SKILL.md` frontmatter, and `requires` dependency closure.
* **Gaps**:
  * `validate-manifest.js` fails or ignores `agent-bootstrap.templates` blocks if present.
  * `Simulacro/manifest.md` already defines a prototype schema featuring `entrypoint`, `skills`, `templates`, and `workflows`, but `eNNvironment` lacks formal schema validation for `templates` and bundled assets.

### C. iNNfo Workspace Entrypoints & Templates (`iNNfo`)
* **Current State**:
  * `innfo-core` parses workspace entrypoints (`workspace_NN.md` / `index.md`).
  * `innfo-editor` and `innfo-mcp` resolve Level 2 spec templates (such as `workspace_spec_NN.md`) to establish concept hierarchies, taxonomy rules, and field validation.
* **Gaps**:
  * Template resolution is limited to local workspace `./templates/` or hardcoded paths.
  * Lacks automatic fetching/hydration of required templates declared in `manifest.md` during workspace bootstrap or skill execution.

---

## 2. Bundling Approaches Formulations

### Approach 1: Decoupled Manifest Bundle (Dual-Registry Peer Model)

#### Architectural Model
Skills and Templates are defined as peer top-level registries within the `agent-bootstrap` manifest (`agent-bootstrap.skills` and `agent-bootstrap.templates`). Skills explicitly declare required templates in a `templates: [...]` field.

#### Manifest Schema Extension (`eNNvironment/docs/use/manifest.md`)
```yaml
agent-bootstrap:
  version: "2.0"
  entrypoint: "workspace_NN.md"
  skills:
    - name: nn-innfo
      repo: cogNNitive/actioNN
      path: skills/nn-innfo
      version: "V_1-0-0"
      commit: "d60a7109315820085ab127b70412992db6986c88"
      templates: ["workspace_spec_NN", "projects"]
  templates:
    - name: workspace_spec_NN
      repo: cogNNitive/iNNfo
      path: specs/templates/workspace_spec_NN.md
      version: "V_1-0-0"
      commit: "a1b2c3d4e5f678901234567890abcdef12345678"
    - name: projects
      repo: cogNNitive/iNNfo
      path: specs/templates/projects/projects_V_0-1-0_NN.md
      version: "V_0-1-0"
      commit: "a1b2c3d4e5f678901234567890abcdef12345678"
  workflows:
    - id: relevar-casa
      name: Relevamiento de Vivienda
      skill: nn-reforma-casa
    - id: planificar-obra
      name: Planificación de Obra
      template: projects
```

#### Management & Execution Lifecycle
1. **`skills-manager.js` Updates**:
   * Parses both `agent-bootstrap.skills` and `agent-bootstrap.templates`.
   * Installs templates into `~/.agents/templates/${template.name}.md` (or workspace `./templates/`).
   * Tracks template states in `~/.agents/templates-state.json` (or combined `~/.agents/bootstrap-state.json`).
2. **`validate-manifest.js` Updates**:
   * Validates `templates` entries (commit SHA existence, template file existence at path, version parity, and template reference closure from skills/workflows).
3. **Pros & Cons**:
   * **Pros**: High reusability; templates can be updated independently of skill code; clean separation of concerns.
   * **Cons**: Potential version drift between skill logic and template definitions; requires managing two state registries.

---

### Approach 2: Skill-Encapsulated Bundling (Autonomous Skill Package Containers)

#### Architectural Model
Templates are co-located directly inside the skill directory structure (e.g. `skills/nn-innfo/templates/*.md`). The `agent-bootstrap` manifest only pins skills; each skill package encapsulates its required templates, assets, and workflows.

#### Skill Directory Layout (`actioNN`)
```
actioNN/skills/nn-innfo/
├── SKILL.md                          # Frontmatter lists bundled_templates & workflows
├── templates/
│   ├── workspace_spec_NN.md          # Level 2 spec template for workspaces
│   └── projects_V_0-1-0_NN.md        # Level 2 spec template for projects
└── scripts/
```

#### Manifest Schema (`eNNvironment/docs/use/manifest.md`)
```yaml
agent-bootstrap:
  version: "2.0"
  skills:
    - name: nn-innfo
      repo: cogNNitive/actioNN
      path: skills/nn-innfo
      version: "V_1-0-0"
      commit: "d60a7109315820085ab127b70412992db6986c88"
      # Bundled templates declared inside SKILL.md frontmatter
```

#### Management & Execution Lifecycle
1. **`skills-manager.js` Updates**:
   * Downloading a skill tarball automatically extracts its embedded `templates/` directory to `~/.agents/skills/${skill.name}/templates/`.
   * Adds a `hydrate-workspace` subcommand or sync step that projects skill templates into target workspace `./templates/`.
2. **`validate-manifest.js` Updates**:
   * When checking a skill at its commit, verifies that all `bundled_templates` declared in `SKILL.md` exist within the skill's `templates/` directory.
3. **Pros & Cons**:
   * **Pros**: Zero version drift between skill and template; atomic single-commit updates; simpler manifest file.
   * **Cons**: Duplicate template files across different skills if multiple skills use the same base template.

---

## 3. Recommended Hybrid Architecture

To combine the strengths of both models, the recommended design adopts **Approach 2 (Skill-Encapsulated Bundling)** as the primary distribution method for skill-specific templates, while supporting **Approach 1 (Decoupled Manifest Templates)** for global ecosystem-wide templates (such as `workspace_spec_NN.md`).

### Key Capabilities Required Across Repositories:

| Repository | File Path | Required Modifications |
|---|---|---|
| `actioNN` | `scripts/skills-manager.js` | Add support for template discovery, installation to `~/.agents/templates/` & workspace `./templates/`, state tracking in `bootstrap-state.json`, and template sync direction. |
| `actioNN` | `skills/*/SKILL.md` | Standardize `bundled_templates` frontmatter array for embedded templates. |
| `eNNvironment` | `scripts/validate-manifest.js` | Expand parser to validate both `agent-bootstrap.skills` and `agent-bootstrap.templates` (commit existence, path validation, version parity, and closure). |
| `eNNvironment` | `docs/use/manifest.md` | Formalize the updated `agent-bootstrap` schema including `entrypoint`, `skills`, `templates`, and `workflows`. |
| `iNNfo` | `packages/innfo-core/src/recursiveParser/workspace.ts` | Resolve Level 2 templates from workspace `./templates/`, global `~/.agents/templates/`, and skill-bundled template directories. |
| `iNNfo` | `packages/innfo-mcp/src/tools/` | Expose tools for listing and hydrating bundled templates into active workspaces. |

---

## 4. Verification & Test Plan

1. **Manifest Validation (`eNNvironment`)**:
   * Test `node scripts/validate-manifest.js` against manifests with:
     * Valid skills and templates.
     * Invalid template commit SHAs or missing template file paths.
     * Version mismatches in template frontmatter.
2. **Skill & Template Manager (`actioNN`)**:
   * Unit tests for `skills-manager.js status`, `install`, `update`, and `sync` handling both skills and templates.
   * Verify TTY consent gates (`needs decision: ...`, `--yes` flag) work properly for template operations.
3. **Workspace Template Resolution (`iNNfo`)**:
   * Test `innfo-core` recursive parsing and template taxonomy resolution when templates are loaded from `./templates/` vs `~/.agents/templates/`.
