# Proposal: Documentation V_0-2-0 Template Package and Docsify Suite Generator

## Intent
Evolve the existing Level 2 `documentation` template package to `V_0-2-0`, adding first-class primitives for web navigation headers (`NavbarItem`), enhanced page metadata (`tags`, `badge`), and a formal executable SOP procedure (`generate_docsify_suite_NN.md`). Build a deterministic zero-dependency generator (`scripts/generate-docsify-suite.mjs`) to produce the complete Docsify publication suite (`_sidebar.md`, `_navbar.md`, `llms.txt`, `ai-index.yaml`), and dogfood the architecture by turning `docs/` into a formal cogNNitive workspace (`docs/workspace_NN.md`) with models for both `iNNfo` and `actioNN`.

## Scope

### In Scope
1. **Level 2 Template Package `documentation_V_0-2-0`**:
   - `iNNfo/specs/templates/documentation/V_0-2-0/spec_NN.md`:
     - Concept `DocSite`: `site_title`, `site_description`, `base_path`, `site_logo`, `repo_url`, `nav_enabled`.
     - Concept `Section`: `section_order`, `parent`.
     - Concept `Page`: `title`, `source` (`type:: markdown_file`), `route`, `order`, `description`, `parent`, `tags`.
     - Concept `NavbarItem`: `label`, `url`, `order`, `parent`.
     - Concept `Asset`: `asset_path`, `type`.
   - `iNNfo/specs/templates/documentation/V_0-2-0/procedures/generate_docsify_suite_NN.md`:
     - Standard Operating Procedure conforming to `procedures_V_0-2-0` modeling:
       - Model validation
       - Source file existence auditing
       - Docsify sidebar compilation (`_sidebar.md`)
       - Docsify navbar compilation (`_navbar.md`)
       - AI index and LLM summary generation (`llms.txt`, `ai-index.yaml`)
       - Suite verification
   - `iNNfo/specs/templates/documentation/V_0-2-0/samples/Ghostbusters_V_0-2-0_documentation_NN.md`:
     - Canonical Level 3 demonstration model.
2. **Deterministic Generator Script**:
   - `scripts/generate-docsify-suite.mjs`:
     - Node.js ESM script parsing `documentation_NN.md` and producing `_sidebar.md`, `_navbar.md`, `llms.txt`, and `ai-index.yaml`.
     - Supports `--sidebar-only`, `--navbar-only`, `--llms-only`, `--all`, `--dry-run`.
     - Validates on-disk existence of all referenced `source` markdown files.
   - Retain `scripts/generate-docsify-sidebar.mjs` as a backwards-compatible wrapper calling the new suite generator.
3. **Workspace Dogfooding in `docs/`**:
   - `docs/workspace_NN.md`: Level 3 workspace entrypoint conforming to `workspace_V_0-2-0_spec_NN.md`.
   - Update `docs/innfo/documentation/documentation_NN.md` to `V_0-2-0` with `NavbarItem` definitions.
   - Author `docs/actionn/documentation/documentation_NN.md` conforming to `V_0-2-0` modeling all `actioNN` documentation pages and navbar.
   - Compile both suites deterministically.
4. **Integration**:
   - Update `scripts/build-docs.mjs` to execute the suite generator for both doc sites during CI and staging.
   - Update `scripts/verify.js` to ensure the workspace and doc models are strictly validated.

### Out of Scope
- Replacing Docsify with VitePress, Astro, or Docusaurus.
- Modifying the GitHub Pages CNAME or deployment hosting mechanism.

## Risks & Mitigations
| Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| Broken navigation in live Docsify | High | Generator verifies all `source` files exist on disk before writing and uses exact markdown link formats expected by Docsify. |
| GitHub Pages build break | High | Verification step in CI (`npm run build:docs`) runs locally and in GitHub Actions before deploying. |
