# Spec: Canonical Spec Hosting

## ADDED Requirements

### Requirement: Canonical Spec Hosting Base URL

All canonical iNNfo specifications (Level 1 core specs, Level 2 templates, Level 3 sample models, and procedure sub-models) MUST use `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/` as their canonical raw hosting base URL, and `https://github.com/cogNNitive/cogNNitive/blob/main/iNNfo/` as their browsing blob base URL.
No canonical specification, template, sample model, or documentation MAY reference `cogNNitive/iNNfo` (including legacy `raw.githubusercontent.com/cogNNitive/iNNfo/(main|v0.1.x)/` or `github.com/cogNNitive/iNNfo/blob/main/`).

#### Scenario: Level 1 and defiNNe spec frontmatter
- GIVEN any Level 1 or defiNNe specification file (`iNNfo_V_0-2-1_NN.md`, `iNNfo_V_0-2-0_NN.md`, `iNNfo_V_0-1-0_NN.md`, `defiNNe_V_0-1-0_NN.md`)
- WHEN its frontmatter is inspected
- THEN `spec_url`, `parent.url`, `spec.url`, and any `includes[].url` declare URLs rooted at `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/`
- AND no legacy URL referencing `cogNNitive/iNNfo` remains in frontmatter or descriptive prose

#### Scenario: Level 2 template spec frontmatter
- GIVEN any Level 2 template specification file under `iNNfo/specs/templates/` (e.g. `workspace_V_0-2-0_spec_NN.md`, `business_V_0-2-0_NN.md`, `business_V_0-1-0_NN.md`)
- WHEN its frontmatter is inspected
- THEN `spec_url`, `parent.url`, and `includes[].url` declare URLs rooted at `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/`

#### Scenario: Level 3 sample model and procedure submodel frontmatter
- GIVEN any Level 3 sample model under `iNNfo/specs/templates/**/samples/` or procedure sub-model under `iNNfo/specs/templates/documentation/**/procedures/`
- WHEN its frontmatter is inspected
- THEN `parent_spec.url` declares a URL rooted at `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/`

### Requirement: Editor Runtime Spec Base Constant

The `innfo-editor` application MUST define a single shared constant `REMOTE_SPEC_BASE` in `src/config/samples.ts` alongside `REMOTE_SAMPLE_BASE`, pointing to `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs`. All editor components and views displaying or linking to canonical specifications MUST consume `REMOTE_SPEC_BASE` rather than duplicating the URL string literal.

#### Scenario: Editor displays canonical L1 spec link
- GIVEN the `ModelInfoPanel` or `StandaloneProcedureView` component in `innfo-editor`
- WHEN rendering links to the canonical specification
- THEN the link target is constructed using `REMOTE_SPEC_BASE`

### Requirement: Strict Repo-Wide Spec URL Checker

The CI URL validation script (`iNNfo/scripts/check-spec-version.mjs --check-urls`) MUST:
1. Scan across the entire repository root across extensions `.ts`, `.vue`, `.md`, `.mjs`, `.js`, `.yaml`, `.yml`, `.json`, `.html`.
2. Verify local file existence for canonical URLs matching `https://raw.githubusercontent.com/cogNNitive/cogNNitive/(?:main|v[\d.]+)/iNNfo/([^\s"')\]]+)`.
3. Perform a strict scan that fails (exit code 1) on ANY residual occurrence of `cogNNitive/iNNfo` outside permanent exclusions (`archive/**`, `node_modules/**`, `dist/**`, `*.bundle.js`, golden fixtures) and explicit temporary allowlisted files.
4. Emit a loud WARNING on every run for allowlisted manifest paths (`manifest/source.yaml`, `docs/use/manifest.md`, `docs/use/manifest-next.md`, `scripts/manifest/*.test.js`, `actioNN/scripts/skills-manager.test.js`) documenting that they are temporary debt tracked for Change 2.

#### Scenario: Valid repository tree passes check:spec-urls
- GIVEN the migrated repository tree
- WHEN `npm --prefix iNNfo run check:spec-urls` is executed
- THEN the process exits with code 0
- AND loud warnings are emitted for allowlisted manifest paths

#### Scenario: Seeded legacy URL fails check:spec-urls
- GIVEN any non-allowlisted tracked file containing a legacy `cogNNitive/iNNfo` string
- WHEN `npm --prefix iNNfo run check:spec-urls` is executed
- THEN the process exits with code 1 and prints the offending file path and line

### Requirement: Removal of Dead Root Specs Island

The dead legacy root `specs/**` directory (6 files) unconsumed by CI or documentation builds MUST be removed from the repository.

#### Scenario: Root specs directory does not exist
- GIVEN the repository root
- WHEN file tree is inspected
- THEN no directory named `specs/` exists at the workspace root
