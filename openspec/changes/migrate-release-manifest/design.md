# Design: Migrate Release Manifest to Monorepo

## Overview

Change 2 completes the monorepo consolidation by migrating the release distribution manifest (`manifest/source.yaml`), its generated documentation artifacts (`docs/use/manifest.md`, `docs/use/manifest-next.md`), and the associated validation test suites from the legacy repositories (`cogNNitive/iNNfo` and `cogNNitive/actioNN`) to `cogNNitive/cogNNitive`.

## Architecture & Schema Adjustments

### 1. `manifest/source.yaml`

- **Repository unification**: All skills, templates, and MCP bundles declare `repo: cogNNitive/cogNNitive`.
- **Path prefixes**:
  - Skills: `actioNN/skills/<skill-name>`
  - Templates: `iNNfo/specs/templates/<template-path>`
  - MCP bundle: `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js`
- **Ref keys**:
  - Skills declare `ref_key: skills`.
  - Templates declare `ref_key: templates`.
  - MCP bundle declares `ref_key: innfo-mcp`.
- **Version corrections**:
  - `business-model` template: version corrected to `V_0-1-0` (matching actual file `template_version: V_0-1-0`).
  - `analysis` template: version corrected to `V_0-1-0` (matching actual file `template_version: V_0-1-0`).
- **Channel references**:
  - `stable`:
    - `key: skills`, `repo: cogNNitive/cogNNitive`, `ref: skills-v1.1.3`
    - `key: templates`, `repo: cogNNitive/cogNNitive`, `ref: templates-v0.2.0`
    - `key: innfo-mcp`, `repo: cogNNitive/cogNNitive`, `ref: innfo-mcp-v0.2.4`
  - `preview`:
    - `key: skills`, `repo: cogNNitive/cogNNitive`, `ref: main`
    - `key: templates`, `repo: cogNNitive/cogNNitive`, `ref: main`
    - `key: innfo-mcp`, `repo: cogNNitive/cogNNitive`, `ref: main`

### 2. Git Tagging Strategy on `cogNNitive/cogNNitive`

To satisfy `checkRefResolvesInDeclaredRepo`, `tagShapeViolation`, and `checkReleaseProvenance`:
- `skills-v1.1.3` -> created at current `main` on `cogNNitive/cogNNitive`
- `templates-v0.2.0` -> created at current `main` on `cogNNitive/cogNNitive`
- `innfo-mcp-v0.2.4` -> created at current `main` on `cogNNitive/cogNNitive`

Because these tags target `main`, `checkReleaseProvenance` (`compare/main...${commit}`) succeeds with status `identical`.

### 3. Test Suites Migration

- `scripts/manifest/validate-manifest.test.js`:
  - Update mock repositories from `cogNNitive/iNNfo` to `cogNNitive/cogNNitive`.
  - Update mock paths to include `iNNfo/` prefixes.
- `scripts/manifest/generate-manifest.test.js`:
  - Update test fixtures to use `cogNNitive/cogNNitive`.
- `actioNN/scripts/skills-manager.test.js`:
  - Update test fixtures to use `cogNNitive/cogNNitive`.

### 4. Checker Allowlist Removal

In `iNNfo/scripts/check-spec-version.mjs`:
- Remove all paths from `ALLOWLISTED_EXACT_PATHS`.
- Any residual occurrence of `cogNNitive/iNNfo` in `manifest/source.yaml`, `docs/use/manifest*.md`, or test files will fail CI.
