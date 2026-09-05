# Specification: Documentation Template and Docsify Generator

## 1. Documentation L2 Template Definition
The `documentation` template package is housed at `iNNfo/specs/templates/documentation/V_0-1-0/`:
- **Template Spec**: `spec_NN.md`
  - Spec version: `V_0-2-0`
  - Level: `2`
  - Parent spec: `iNNfo_V_0-2-0`
  - Index concepts: `DocSite`, `Section`, `Page`, `Asset`
- **Concept Definitions**:
  - `DocSite`: Root container for the site (fields: `site_title`, `site_description`, `base_path`).
  - `Section`: Category for grouping pages in the sidebar (fields: `section_order`, `parent`).
  - `Page`: Document unit backed by a markdown file (fields: `title`, `source`, `route`, `order`, `description`, `parent`).
    - `source` field MUST have `type:: markdown_file`.
    - `parent` is a `reference` field; `target_concepts:: [DocSite, Section]` (a Section for a nested page, the DocSite for a top-level page).
  - `Asset`: Static media/diagrams (fields: `asset_path`).
- **Field Definitions** (`# NN Field Definition` block): `title`, `source`, `route`, `order`, `description`, `parent` (Page); `section_order`, `parent` (Section); `site_title`, `site_description`, `base_path` (DocSite); `asset_path` (Asset).
- **Concept Guidance Documentation**: one `## <Concept>` subsection per index concept (`DocSite`, `Section`, `Page`, `Asset`), each with `### Summary` and `### Description` for the Modeler right sidebar.
- **Procedures**:
  - Bundles `generate_docsify_sidebar_NN.md` under `procedures/`.

## 2. Deterministic Docsify Sidebar Generator
`scripts/generate-docsify-sidebar.mjs`:
- Invocation: `node scripts/generate-docsify-sidebar.mjs <model-path> [--output <sidebar-path>]`
- Default output: writes to `_sidebar.md` in the directory of the model file if not specified.
- Validation:
  - For each `Page`, resolves `source` relative to the model directory.
  - Verifies that each `source` file exists on disk; aborts with nonzero code if not found.
  - Formats output as markdown unordered list, nesting pages under sections when hierarchical parents exist.

## 3. Dogfooding Model `docs/innfo/documentation/documentation_NN.md`
- Level 3 instance conforming to the `documentation` template.
- One `DocSite` (`iNNfo Documentation`, `base_path:: docs/innfo/documentation/`) with a single top-level `Page` parented directly to the DocSite:
  - `Home`: `README.md`
- Organizes the remaining technical documentation pages into three ordered sections:
  - `Components` (`section_order:: 1`): `innfo-editor.md`, `innfo-core.md`, `innfo-mcp.md`, `opencode-innfo-agent.md`
  - `Architecture` (`section_order:: 2`): `ecosystem.md`, `specifications.md`, and `ecosystem.md#open-knowledge-format-compatibility` (OKF Compatibility)
  - `Guides` (`section_order:: 3`): `usage.md` (Usage), `relationships.md` (Relationships & Connections)
- Relationship and usage guidance lives under `Guides`, not under `Architecture`.
