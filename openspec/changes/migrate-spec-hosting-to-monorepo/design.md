# Design: Migrate Canonical Spec Hosting to Monorepo

## Overview

Following the consolidation of `cogNNitive/iNNfo` into the monorepo, canonical specification hosting is migrated from the archived read-only repository (`cogNNitive/iNNfo`) to the active monorepo (`cogNNitive/cogNNitive`).

This design establishes:
1. A reproducible, committed Node.js codemod script (`scripts/migrate-spec-urls.mjs`) to perform deterministic, LF-safe rewrites across all in-scope buckets.
2. An editor runtime refactoring that introduces `REMOTE_SPEC_BASE` in `src/config/samples.ts` to deduplicate canonical L1 spec references.
3. A strict repo-wide CI gate in `iNNfo/scripts/check-spec-version.mjs` that verifies canonical URL local resolution, fails on any residual `cogNNitive/iNNfo` references, and emits loud warnings for allowlisted manifest paths pending Change 2.
4. Immediate deletion of the dead root `specs/**` folder.
5. Corrections for folded-in documentation staleness (`iNNfo_V_0-2-1`, `V_0-1-2` skill, `v0.2.4` MCP, org slug, UTF-8 mojibake).

## Architecture & Components

### 1. Codemod Script (`scripts/migrate-spec-urls.mjs`)

The migration is implemented as a standalone, committed ESM script executed via `node scripts/migrate-spec-urls.mjs`.

- **Scope & Targets**:
  - Bucket A: All Level 1, defiNNe, Level 2 template, Level 3 sample, procedure sub-model, HTML sample, docs model, and actioNN/skill template/model files.
  - Bucket B: Documentation prose in `docs/**` (excluding `docs/use/manifest*.md`).
  - Bucket C: Skill documentation, `provenance-model.js`, `CONTRIBUTING.md`, and `AGENTS.md`.
  - Bucket E-active: `openspec/specs/submodel-conformance-validation/spec.md`.
- **Transformation Rules**:
  - `https://raw.githubusercontent.com/cogNNitive/iNNfo/(?:main|v[\d.]+)/(specs/[^\s"')\]]+)` -> `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/$1`
  - `https://github.com/cogNNitive/iNNfo/blob/main/(specs/[^\s"')\]]+)` -> `https://github.com/cogNNitive/cogNNitive/blob/main/iNNfo/$1`
  - Tag pins (`v0.1.x`) collapse to `main`.
- **Safety & Hygiene**:
  - Preserves exact LF (`\n`) line endings.
  - Skips exclusions: `archive/**`, `node_modules/**`, `dist/**`, `*.bundle.js`, `tests/fixtures/models/**`, `temp/**`, and `manifest/**`.
  - Dry-run mode (`--dry-run`) supported.

### 2. Editor Runtime Refactoring

In `iNNfo/apps/innfo-editor/src/config/samples.ts`:
```typescript
export const REMOTE_SPEC_BASE = 'https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs';
```
Consumed in:
- `iNNfo/apps/innfo-editor/src/components/editor/ModelInfoPanel.vue`
- `iNNfo/apps/innfo-editor/src/views/StandaloneProcedureView.vue`
- `iNNfo/apps/innfo-editor/src/ai-guide/procedure_NN.md`

### 3. CI Checker Rework (`iNNfo/scripts/check-spec-version.mjs`)

`check-spec-version.mjs` runs in CI under `npm --prefix iNNfo run check:spec-urls`:
- **Root**: re-rooted to repository root (`resolve(__dirname, '../..')` when checking URLs).
- **Extension Filter**: widened to `.ts`, `.vue`, `.md`, `.mjs`, `.js`, `.yaml`, `.yml`, `.json`, `.html`.
- **Target URL Regex**:
  `/https:\/\/raw\.githubusercontent\.com\/cogNNitive\/cogNNitive\/(?:main|v[\d.]+)\/iNNfo\/(specs\/[^\s"')\]]+)/g`
  Captures path under monorepo root, resolving against `join(REPO_ROOT, 'iNNfo', capture)`.
- **Strict Scan**:
  Searches for `/cogNNitive\/iNNfo(?![\w-])/g`.
  - Exclusions: `node_modules/`, `archive/`, `dist/`, `.git/`, `*.bundle.js`, `tests/fixtures/models/`, `temp/`.
  - Allowlist:
    - `manifest/source.yaml`
    - `docs/use/manifest.md`
    - `docs/use/manifest-next.md`
    - `scripts/manifest/validate-manifest.test.js`
    - `scripts/manifest/generate-manifest.test.js`
    - `actioNN/scripts/skills-manager.test.js`
  - Allowlist Behavior: Emits loud `[WARN] Allowlisted legacy reference: <path>:<line> (tracked for Change 2)` on every run.
  - Any non-allowlisted match fails with exit code 1.

### 4. Root Specs Removal

`specs/` at the repository root contains 6 orphaned files:
- `specs/iNNfo_V_0-2-0_NN.md`
- `specs/defiNNe_V_0-1-0_NN.md`
- `specs/templates/innfo/V_0-2-0/innfo_V_0-2-0_NN.md`
- `specs/templates/innfo/V_0-2-0/spec_NN.md`
- `specs/templates/definne/V_0-1-0/definne_V_0-1-0_NN.md`
- `specs/templates/definne/V_0-1-0/spec_NN.md`
These are deleted directly via git.

### 5. Documentation & Staleness Alignment

- Adopt `iNNfo_V_0-2-1` as current L1 specification in `docs/innfo/documentation/specifications.md`, `docs/specifications.md`, and `docs/innfo/template-package-spec.md`.
- Bump `nn-innfo` doc references from `V_0-1-0` to `V_0-1-2` in `docs/actionn/documentation/README.md` and `docs/actionn/documentation/skills/nn-innfo.md`.
- Fix MCP bundle reference from `v0.2.1` to `v0.2.4` in `docs/innfo/mcp-setup.md`.
- Replace erroneous `github.com/iNNfo/iNNfo` links with `github.com/cogNNitive/cogNNitive`.
- Fix UTF-8 encoding mojibake in `docs/innfo/changesets/format-repo.md` and `docs/innfo/changesets/innfo-repo.md`.
