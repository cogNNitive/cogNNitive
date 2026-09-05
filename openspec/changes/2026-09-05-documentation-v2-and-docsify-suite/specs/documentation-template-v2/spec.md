# Specification: Documentation V_0-2-0 Template Package & Docsify Suite Generator

## 1. Documentation L2 Template Package Definition
The `documentation` Level 2 template package is housed at `iNNfo/specs/templates/documentation/V_0-2-0/`:

### 1.1 Specification Header (`spec_NN.md`)
- `spec_version`: `V_0-2-0`
- `level`: `2`
- `parent_spec`: `iNNfo_V_0-2-0`
- `title`: `Documentation Specification Template`
- `template_version`: `V_0-2-0`
- `procedures`:
  - `id`: `generate-docsify-suite`
  - `name`: `Generate Docsify Suite`
  - `path`: `procedures/generate_docsify_suite_NN.md`

### 1.2 Concepts and Fields
- **DocSite**: Root container representing the documentation site.
  - `site_title` (`type:: string`): Human-readable name.
  - `site_description` (`type:: string`): Summary / SEO description.
  - `base_path` (`type:: string`): Workspace-relative path to docs directory.
  - `site_logo` (`type:: string`): Relative path or URL to logo asset.
  - `repo_url` (`type:: string`): URL to GitHub repository.
  - `nav_enabled` (`type:: select`, options: `[true, false]`): Whether top navbar is rendered.
- **Section**: Category container grouping pages in the sidebar.
  - `section_order` (`type:: string`): Sort index.
  - `parent` (`type:: reference`, target: `DocSite`): Owning site container.
- **Page**: Individual documentation document backed by a Markdown file.
  - `title` (`type:: string`): Display title in sidebar and breadcrumbs.
  - `source` (`type:: markdown_file`): Relative path to local `.md` file.
  - `route` (`type:: string`): Routing path or slug used by Docsify.
  - `order` (`type:: string`): Ordering index within section.
  - `description` (`type:: string`): Summary text.
  - `parent` (`type:: reference`, target: `[DocSite, Section]`): Parent section or top-level site.
  - `tags` (`type:: string`): Comma-separated or inline tags.
- **NavbarItem**: Header navigation item.
  - `label` (`type:: string`): Text or markdown label (supports emojis/badges).
  - `url` (`type:: string`): Target link or route.
  - `order` (`type:: string`): Sequence index.
  - `parent` (`type:: reference`, target: `[DocSite, NavbarItem]`): Top-level or sub-menu dropdown.
- **Asset**: Static assets referenced by documentation.
  - `asset_path` (`type:: string`): Relative path to asset.
  - `type` (`type:: select`, options: `[image, diagram, file, config]`): Asset classification.

---

## 2. Docsify Suite Generation Procedure (`generate_docsify_suite_NN.md`)
Housed under `iNNfo/specs/templates/documentation/V_0-2-0/procedures/`:
- Conforms to `procedures_V_0-2-0`.
- Tasks:
  1. `Verify Documentation Model`: Validate syntax and concepts using `@cognnitive/innfo-core`.
  2. `Audit Source Markdown Files`: Ensure every `Page.source` exists on disk.
  3. `Compile Docsify Sidebar`: Generate `_sidebar.md` respecting section hierarchies and page orders.
  4. `Compile Docsify Navbar`: Generate `_navbar.md` from `NavbarItem` entries.
  5. `Compile AI Summary & Index`: Generate `llms.txt` and `ai-index.yaml` for LLM consumption.
  6. `Verify Output Suite`: Check file non-emptiness and format correctness.

---

## 3. Deterministic CLI Generator (`scripts/generate-docsify-suite.mjs`)
- Accepts `<model-path>` as input.
- Validates file existence on disk for each referenced page source.
- Emits:
  - `_sidebar.md`
  - `_navbar.md` (when `NavbarItem` entries are present)
  - `llms.txt`
  - `ai-index.yaml`
- CLI Flags:
  - `--output-dir <path>`: Destination directory for artifacts.
  - `--sidebar-only`: Generate only `_sidebar.md`.
  - `--navbar-only`: Generate only `_navbar.md`.
  - `--llms-only`: Generate only `llms.txt` and `ai-index.yaml`.
  - `--all` (default): Generate all supported artifacts.
  - `--dry-run`: Validate and print output without writing to disk.
  - `--skip-file-check`: Skip checking if source files exist on disk.

---

## 4. Workspace Dogfooding Requirements
- Root `docs/workspace_NN.md` MUST conform to `workspace_V_0-2-0_spec_NN.md`.
- `docs/innfo/documentation/documentation_NN.md` MUST conform to `documentation_V_0-2-0` and declare its navbar items.
- `docs/actionn/documentation/documentation_NN.md` MUST be created, conforming to `documentation_V_0-2-0`, mapping its 7 documentation pages and navbar.
- `npm run build:docs` MUST invoke the suite generator for both doc sites during the build.
