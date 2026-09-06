# Exploration: migrate-release-manifest

## Context & Objectives

Following Change 1 (`migrate-spec-hosting-to-monorepo`), which migrated canonical raw specification hosting and introduced strict CI enforcement with a temporary allowlist, Change 2 addresses the distribution manifest infrastructure:
1. `manifest/source.yaml` and its generated distribution files (`docs/use/manifest.md` for stable, `docs/use/manifest-next.md` for preview).
2. Manifest validation and generation scripts (`scripts/manifest/*`, `actioNN/scripts/skills-manager.test.js`).
3. Release tags on `cogNNitive/cogNNitive` corresponding to the stable channel snapshots.
4. Removal of the temporary allowlist from `iNNfo/scripts/check-spec-version.mjs`.

## 1. Inventory of Current Manifest State

### 1.1 `manifest/source.yaml` Analysis

- **Skills section** (`skills:`):
  - 7 skills: `nn-router`, `nn-trannsform`, `nn-innfo`, `nn-preflight`, `nn-site-generator`, `nn-design-presets`, `nn-skills-lifecycle`.
  - Currently declared with `repo: cogNNitive/actioNN` and `path: skills/<name>`.
  - `nn-innfo` embeds `mcp[0]` for `innfo-mcp`:
    - `repo: cogNNitive/iNNfo` (archived)
    - `path: packages/innfo-mcp/bin/innfo-mcp.bundle.js`
    - `version: "0.2.4"`
    - `ref_key: innfo-mcp`
- **Templates section** (`templates:`):
  - 10 templates (plus 2 legacy entries): `workspace_spec_NN`, `projects`, `procedures`, `organization`, `business`, `business-model`, `analysis`, `innovation`, `blank`, `cogNNitive`, `documentation`, `base`.
  - All currently declare `repo: cogNNitive/iNNfo` and paths under `specs/templates/...`.
  - Note: In preview channel, `business-model` and `analysis` had `version: "V_0-2-0"`, causing a version mismatch failure against actual file headers declaring `template_version: V_0-1-0`.
- **Channel refs** (`channels:`):
  - `stable`:
    - `key: cogNNitive/actioNN`, `repo: cogNNitive/actioNN`, `ref: skills-v1.1.3`
    - `key: cogNNitive/iNNfo`, `repo: cogNNitive/iNNfo`, `ref: templates-v0.2.0`
    - `key: innfo-mcp`, `repo: cogNNitive/iNNfo`, `ref: innfo-mcp-v0.2.4`
  - `preview`:
    - All pointing to `branch: main` across the respective repos.

### 1.2 Path Relocation in Monorepo

| Asset | Path in archived repo | Canonical path in monorepo (`cogNNitive/cogNNitive`) |
|---|---|---|
| MCP bundle | `packages/innfo-mcp/bin/innfo-mcp.bundle.js` | `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js` |
| Templates | `specs/templates/<path>` | `iNNfo/specs/templates/<path>` |
| Skills (if migrated) | `skills/<name>` | `actioNN/skills/<name>` |

## 2. Release Engineering & Tagging Analysis

### 2.1 Enforcement Rules in `scripts/manifest/lib/manifest-rules.js`

Validation imposes strict constraints for the `stable` channel:
1. **Tag Shape**: `TAG_SHAPE_RE` (`/^[a-z][a-z0-9-]*-v\d+\.\d+\.\d+$/`). E.g. `templates-v0.2.0`, `innfo-mcp-v0.2.4`.
2. **Ref Kind**: Must resolve as a git `tag` (annotated or lightweight commit ref), not a `branch`.
3. **Release Provenance**: Commit pointed to by the tag must be reachable from `main` in the declared repo (`/repos/${repo}/compare/main...${commit}` status `identical` or `behind`). No orphan commits allowed.
4. **Path Verification**: File at `path` must exist at the target commit in the repository.
5. **Version Parity**: Template frontmatter `template_version` at that commit must match `version` in manifest.
6. **No GitHub Release Object Required**: The validator verifies git tags and commit reachability via the GitHub REST API; an official GitHub Release object is optional for CI validation, though beneficial for release notes.

### 2.2 Tag State on `cogNNitive/cogNNitive`

- Currently `cogNNitive/cogNNitive` has **0 git tags** (`404 Not Found` on `git/refs/tags`).
- To validate `stable` against `cogNNitive/cogNNitive`, tags matching `templates-v0.2.0` and `innfo-mcp-v0.2.4` (and `skills-v1.1.3` if skills are migrated) must be created on `cogNNitive/cogNNitive` at a commit on `main`.
- **CRITICAL GATE**: Pushing git tags to `origin` represents a production release on the distribution channel and requires explicit user sign-off.

## 3. Tooling & Test Updates

### 3.1 Tests Asserting `repo: cogNNitive/iNNfo`

- `scripts/manifest/validate-manifest.test.js`:
  - Contains mock fixtures asserting `cogNNitive/iNNfo` repo strings in unit tests.
- `scripts/manifest/generate-manifest.test.js`:
  - Fixtures use `cogNNitive/iNNfo`.
- `actioNN/scripts/skills-manager.test.js`:
  - Tests referencing `cogNNitive/iNNfo` in mock manifests.

### 3.2 CI Checker Allowlist Removal

In `iNNfo/scripts/check-spec-version.mjs`:
- Remove `ALLOWLISTED_EXACT_PATHS` (or empty the set) so `manifest/source.yaml`, `docs/use/manifest*.md`, and tooling tests are strictly checked and must contain zero references to `cogNNitive/iNNfo`.

## 4. Skills Repository (`cogNNitive/actioNN`) Decision

- `cogNNitive/actioNN` is archived (verified via `gh api repos/cogNNitive/actioNN` -> `archived: true`).
- However, `skills-v1.1.3` resolves cleanly on `cogNNitive/actioNN` today.
- Two paths:
  - **Option A (Minimal)**: Keep `skills:` pointing to `cogNNitive/actioNN` @ `skills-v1.1.3` for now, only migrating `templates` and `innfo-mcp` to `cogNNitive/cogNNitive`.
  - **Option B (Complete Monorepo Distribution)**: Migrate skills to `cogNNitive/cogNNitive` (path `actioNN/skills/<name>`), tag `skills-v1.1.3` on `cogNNitive/cogNNitive`.
