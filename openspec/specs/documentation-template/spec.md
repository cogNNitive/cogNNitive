# Specification: Documentation Template and Docsify Generator

## Purpose

Defines the `documentation` Level 2 template package (concepts, fields and bundled procedure), the deterministic Docsify sidebar generator that consumes models conforming to it, the dogfooding model that documents the iNNfo ecosystem, and the Collaboration Git guide page. The package now lives at `iNNfo/specs/bluepriNNts/documentation/` (current `spec_version` `V_0-3-0`); the first-generation description below was written for the `V_0-2-0` package, and the `V_0-2-0` successor is covered by the `documentation-template-v2` capability.

## Requirements

### Requirement: Documentation Level 2 Template Definition

The `documentation` template package MUST define its Template Spec as `spec_NN.md` (the `V_0-2-0` package was originally housed at `iNNfo/specs/templates/documentation/V_0-1-0/`; it now lives at `iNNfo/specs/bluepriNNts/documentation/`) with spec version `V_0-2-0`, level `2`, parent spec `iNNfo_V_0-2-0`, and index concepts `DocSite`, `Section`, `Page` and `Asset`. It MUST bundle the procedure `generate_docsify_sidebar_NN.md` under `procedures/`.

- `DocSite`: root container for the site (fields: `site_title`, `site_description`, `base_path`).
- `Section`: category for grouping pages in the sidebar (fields: `section_order`, `parent`).
- `Page`: document unit backed by a markdown file (fields: `title`, `source`, `route`, `order`, `description`, `parent`).
  - The `source` field MUST have `type:: markdown_file`.
  - `parent` is a `reference` field with `target_concepts:: [DocSite, Section]` (a Section for a nested page, the DocSite for a top-level page).
- `Asset`: static media or diagrams (fields: `asset_path`).

The template MUST declare Field Definitions (`# NN Field Definition` blocks) for `title`, `source`, `route`, `order`, `description`, `parent` (Page); `section_order`, `parent` (Section); `site_title`, `site_description`, `base_path` (DocSite); and `asset_path` (Asset). It MUST provide Concept Guidance Documentation with one `## <Concept>` subsection per index concept, each containing `### Summary` and `### Description` for the Modeler right sidebar.

#### Scenario: Page source is a markdown file

- **GIVEN** the `documentation` template spec
- **WHEN** the `source` field of `Page` is read
- **THEN** it declares `type:: markdown_file`

#### Scenario: Page parent targets DocSite or Section

- **GIVEN** the `documentation` template spec
- **WHEN** the `parent` field of `Page` is read
- **THEN** it is a `reference` field with `target_concepts:: [DocSite, Section]`

### Requirement: Deterministic Docsify Sidebar Generator

`scripts/generate-docsify-sidebar.mjs` SHALL be invoked as `node scripts/generate-docsify-sidebar.mjs <model-path> [--output <sidebar-path>]`. When `--output` is not given, it MUST write `_sidebar.md` in the directory of the model file. For each `Page` it MUST resolve `source` relative to the model directory and verify that the file exists on disk, aborting with a nonzero code if it does not. It MUST format its output as a markdown unordered list, nesting pages under sections when hierarchical parents exist.

#### Scenario: Default output location

- **GIVEN** a model file and no `--output` argument
- **WHEN** the generator runs
- **THEN** `_sidebar.md` is written in the directory of the model file

#### Scenario: Missing page source aborts

- **GIVEN** a `Page` whose `source` file does not exist relative to the model directory
- **WHEN** the generator runs
- **THEN** it aborts with a nonzero code

#### Scenario: Hierarchical pages are nested

- **GIVEN** pages whose `parent` is a `Section`
- **WHEN** the generator runs
- **THEN** those pages appear nested under their section in the unordered list

### Requirement: Dogfooding Model

`docs/documentation/documentation_NN.md` MUST be a Level 3 instance conforming to the `documentation` blueprint, with one `DocSite` (`cogNNitive Documentation`, `base_path:: docs/documentation/`) and a single top-level `Page` parented directly to the DocSite (`Home`: `README.md`). It MUST organize the documentation into five ordered sections following the Diátaxis framework:

- `Tutorials` (`section_order:: 1`): `content/tutorials/first-domain.md`, `content/tutorials/domain-from-scratch.md`
- `How-To Guides` (`section_order:: 2`): task-oriented recipes under `content/how-to/`.
- `Architecture & Concepts` (`section_order:: 3`): explanatory pages under `content/concepts/`.
- `Reference` (`section_order:: 4`): `content/reference/mcp-tools.md`, `content/reference/blueprints.md`, `content/reference/cli.md`, `content/reference/glossary.md`
- `Canonical Skills` (`section_order:: 5`): one Page per skill declared in `manifest/source.yaml` (`content/skills/<name>.md`).

This single model replaces the former `docs/innfo/documentation/` and `docs/skills/documentation/` sites.

#### Scenario: Guidance pages sit under their Diátaxis section

- **GIVEN** the dogfooding model
- **WHEN** the `collaborate-git` and `domain-console` pages are read
- **THEN** their parent is the `How-To Guides` section, not `Architecture & Concepts`

### Requirement: Collaboration Git Guide Page

The `documentation_NN.md` model MUST declare a `Page` for Git collaboration: `source:: content/how-to/collaborate-git.md`, `parent:: [[How-To Guides]]`, with a unique `order` among the how-to pages. The page content MUST be English-only. The sidebar MUST list the page. The `source` file MUST exist on disk so suite generation validates.

#### Scenario: Guide renders under How-To Guides

- **GIVEN** the updated `documentation_NN.md` and existing `content/how-to/collaborate-git.md`
- **WHEN** the Docs site renders the How-To Guides section
- **THEN** a Collaborate with Git entry appears linking to the new route

#### Scenario: Suite generation validates the source

- **GIVEN** the new `Page` declaration
- **WHEN** `generate-docsify-suite.mjs` runs
- **THEN** it exits zero AND the sidebar contains the new entry

#### Scenario: Missing source aborts generation

- **GIVEN** the `Page` declaration without its `source` file on disk
- **WHEN** `generate-docsify-suite.mjs` runs
- **THEN** it aborts with a nonzero code
