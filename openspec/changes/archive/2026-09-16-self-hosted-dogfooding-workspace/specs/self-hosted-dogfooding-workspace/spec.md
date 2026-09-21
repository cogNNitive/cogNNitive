# Specification: Self-Hosted Dogfooding Workspace & Modular Template Packages

## 1. Overview
This specification defines the formal metamodel, package layout, and parser behaviors for a self-hosted iNNfo workspace. It unifies templates, models, agent skills, and tools into a single navigable graph rooted at workspace_NN.md.

## 2. Metamodel Extensions (workspace_spec_NN.md)

### 2.1 Concept Definitions
The Level 2 Workspace specification defines the following concepts:

| Concept | Type | PROV Role | Purpose |
|---|---|---|---|
| **Workspace** | text | — | Workspace metadata, environment settings, and directory conventions. |
| **Specs** | model | Plan | Formal Level 0 and Level 1 language specifications. |
| **Templates** | model | Plan | Level 2 domain templates available for instantiation. |
| **Models** | model | Entity | Level 3 domain model instances in the workspace. |
| **Sources** | model | Entity | Normalized sources catalog (sources_NN.md). |
| **Procedures** | model | Activity | Executable transformation pipelines catalog (procedures_NN.md). |
| **Artifacts** | model | Entity | Generated outputs and reports catalog (rtifacts_NN.md). |
| **Skills** | file | Agent | Standard AI agent skill definitions (SKILL.md). |
| **Tools** | file | Agent | Executable scripts and runtime tool runners. |
| **Tag** | category | — | Centralized taxonomy tags. |

### 2.2 Field Definitions

#### Workspace Fields
- 
ame (	ype:: string): Human-readable workspace name.
- environment (	ype:: select [development, staging, production]): Execution environment.
- models_dir (	ype:: string): Default directory for domain models (default: models/).
- sources_dir (	ype:: string): Default directory for sources (default: sources/nn/).
- 	emplates_dir (	ype:: string): Default directory for template packages (default: 	emplates/).
- skills_dir (	ype:: string): Default directory for agent skills (default: skills/).

#### Specs & Templates Fields
- path (	ype:: model): Workspace-relative path to the specification or template spec_NN.md.
- level (	ype:: select [0, 1, 2]): Specification abstraction level (Specs only).
- category (	ype:: string): Domain category classification (Templates only).

#### Skills & Tools Fields
- path (	ype:: file): Workspace-relative path to the SKILL.md or executable script.
- ole (	ype:: string): Functional role or agent purpose (Skills only).
- 	arget_agents (	ype:: string): Target agent platforms (Skills only).
- untime (	ype:: select [node, python, bash, powershell]): Execution runtime (Tools only).

## 3. Modular Template Package Layout

Each template in 	emplates/<template_name>/ MUST follow the modular package structure:

`
templates/<template_name>/
├── spec_NN.md            # Level 2 specification (Mandatory)
├── samples/              # Level 3 canonical reference models (Mandatory)
├── procedures/           # Template-specific transformation procedures (Optional)
├── assets/               # Consoles, visualizers, styles, icons (Optional)
├── skills/               # Template-specific agent skills (Optional)
└── rules/                # Agent prompts and domain rules (Optional)
`

## 4. Repository Template Specification (epository/spec_NN.md)

A Level 2 template for GitHub repository lifecycle management:
- **Concepts**:
  - Repository: Metadata, remote URL, default branch, owner, description.
  - State: Branch postures, dirty status, synchronization state.
  - Releases: Version tags, release dates, changelogs, assets.
  - Changes: Conventional commits, author, scope, impact.
  - Metrics: CI build posture, coverage, line counts.
- **Evaluable Matrices**:
  - Change-Release Relations: Maps which commits belong to which release tag.
  - State-Release Relations: Maps current branch HEAD to release milestones.

## 5. Parser & Runtime Contract (innfo-core)

1. **Opaque 	ype:: file**: The recursive parser MUST record 	ype:: file references as leaf metadata nodes without attempting to parse their contents as iNNfo AST.
2. **Local Path Resolution**: When traversing 	ype:: model references targeting specs/ or 	emplates/, the parser MUST resolve them relative to workspace_NN.md.
3. **Identity & Cycle Detection**: Workspace submodel parsing rules apply uniformly across all 	ype:: model concepts.
