# Tasks: Canonical Template Package Distribution

## Review Workload Forecast
| Field | Value |
| Estimated changed lines | ~650–850 lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Repo Source & MCP Hydration) → PR 2 (CI Guards & Manifest Pipeline) → PR 3 (OpenSpec & Integration Verification) |

## Implementation Phases

### Phase 1: Canonical Filenames & Frontmatter in Repository Source (`iNNfo/specs/templates/`)
- [ ] 1.1 Rename root workspace template `workspace_V_0-3-0_spec_NN.md` to canonical unversioned filename `workspace_spec_NN.md`.
- [ ] 1.2 Remove orphaned historical root templates (`workspace_V_0-1-0_spec_NN.md`, `workspace_V_0-2-0_spec_NN.md`).
- [ ] 1.3 Normalize subdirectory template specifications to canonical `spec_NN.md`:
  - `projects/projects_V_0-2-0_NN.md` → `projects/spec_NN.md`
  - `business/business_V_0-2-1_NN.md` → `business/spec_NN.md`
  - `procedures/procedures_V_0-2-0_NN.md` → `procedures/spec_NN.md`
  - `organization/organization_V_0-2-0_NN.md` → `organization/spec_NN.md`
  - `business-model/business-model_V_0-1-0_NN.md` → `business-model/spec_NN.md`
  - `analysis/analysis_V_0-1-0_NN.md` → `analysis/spec_NN.md`
  - `innovation/innovation_V_0-2-0_NN.md` → `innovation/spec_NN.md`
  - `blank/blank_V_0-2-0_NN.md` → `blank/spec_NN.md`
  - `documentation/V_0-1-0/spec_NN.md` → `documentation/spec_NN.md`
  - `base/base_V_0-1-0_spec_NN.md` → `base/spec_NN.md`
  - `cogNNitive/cogNNitive_V_0-2-0_NN.md` → `cogNNitive/spec_NN.md`
- [ ] 1.4 Standardize and verify YAML frontmatter across all canonical templates, ensuring `template_version: "<semver>"` (e.g. `"0.3.0"`, `"0.2.1"`) is declared authoritatively.
- [ ] 1.5 Normalize accompanying SOP execution procedures (`procedures/`), sample models (`samples/`), and static reference assets (`assets/`, e.g. `assets/master.html`) to unversioned canonical filenames.
- [ ] 1.6 Update `scripts/template-catalog.mjs` to index canonical template file paths and regenerate `iNNfo/specs/templates/catalog.json`.

### Phase 2: Resolver & Full-Package Hydration in `innfo-mcp`
- [ ] 2.1 Update `findSpecInPackageDir` in `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts` to prioritize canonical `spec_NN.md`, retaining backward-compatible fallbacks for `<base>_V_<version>_NN.md`, `<base>_NN.md`, `spec.md`, and `<base>.md`.
- [ ] 2.2 Refactor `hydrateTemplatePackageAtomically` in `resolver-node.ts` to accept a full package payload (primary specification plus asset dictionary for `procedures/`, `samples/`, and `assets/`).
- [ ] 2.3 Implement atomic staging and write-once immutability in `hydrateTemplatePackageAtomically`:
  - Write package assets into staging directory `specs/templates/<base>/.staging-<pid>-<time>/`.
  - Write canonical `spec_NN.md` and backward-compatible alias `${base}_${verSegment}_NN.md`.
  - Populate `procedures/`, `samples/`, and `assets/` subdirectories within staging.
  - Atomically rename staging directory to `specs/templates/<base>/${verSegment}/`.
  - Skip write if target package directory already exists and contains files.
- [ ] 2.4 Implement remote package fetcher in `resolver-node.ts` to retrieve complete template packages from tag-pinned release assets (`templates-v<version>`).
- [ ] 2.5 Retire the deprecated `prune_orphaned_specs` MCP tool definition and handler from `innfo-mcp`.
- [ ] 2.6 Update `resolver-node.spec.ts` and `spec.spec.ts` unit tests to verify:
  - Multi-tier resolution precedence (workspace package directory → workspace flat fallback → global cache → installed skills → tag-pinned remote hydration).
  - Full-package hydration with canonical `spec_NN.md`, backward-compatible alias, procedures, samples, and static layout assets.
  - Write-once immutability preventing overwrite of existing populated directories.

### Phase 3: Modernize CI Verification Guard & Update `scripts/verify.js`
- [ ] 3.1 Modernize `scripts/guard-template-immutability.js` to replace in-place file mutation blocking with CI frontmatter version bump validation:
  - Inspect git diff against base ref (`--base <ref>`, default `origin/main` with fallback to `HEAD~1` or `HEAD`).
  - For modified templates (`status === 'M'`): retrieve base version via `git show <base>:<path>`, parse frontmatter `template_version`, and assert that the working version is strictly greater than the base version under semver rules.
  - For newly added templates (`status === 'A'`): assert presence of valid semantic version in frontmatter `template_version` without requiring version tokens in the filename.
  - Retain `--diff-file <path>` CLI option for zero-dependency unit tests without invoking git.
- [ ] 3.2 Update `scripts/guard-template-immutability.test.js`:
  - Test modified template with unchanged `template_version` fails with diagnostic error (exit 1).
  - Test modified template with incremented `template_version` passes (exit 0).
  - Test added template with valid frontmatter `template_version` passes (exit 0).
  - Test added template with missing/invalid frontmatter fails (exit 1).
  - Test deleted templates and modifications to non-template files pass (exit 0).
- [ ] 3.3 Update `scripts/verify.js` to ensure the modernized template immutability guard and inventory check execute cleanly in the deterministic pre-check pipeline.

### Phase 4: Update Manifest Generation & Developer Release Scripts
- [ ] 4.1 Update `manifest/source.yaml`:
  - Update `templates:` entries to canonical unversioned paths (e.g. `iNNfo/specs/templates/workspace_spec_NN.md`, `iNNfo/specs/templates/business/spec_NN.md`).
  - Update `frozen_templates:` entries to point to canonical paths for legacy templates.
  - Verify `channels.stable.refs` maps `key: templates` to immutable release tag `templates-v<version>`.
  - Align workflow and skill template references with canonical names.
- [ ] 4.2 Update `scripts/manifest/check-parity.js` and `scripts/manifest/check-parity.test.js` to validate unversioned paths against disk without expecting filename version suffixes.
- [ ] 4.3 Update `scripts/manifest/lib/manifest-rules.js` and `scripts/manifest/validate-manifest.js`:
  - Verify canonical template paths exist at the pinned release tag commit.
  - Update `checkTemplateMainCoherence` to compare pinned commit against `main` using canonical paths.
  - Ensure release integrity rules enforce tag naming pattern `templates-v<version>`.
- [ ] 4.4 Update `scripts/manifest/generate-manifest.js` and `scripts/manifest/generate-manifest.test.js`:
  - Regenerate rendered stable manifest doc (`docs/use/manifest.md`).
  - Validate `generate-manifest.js --channel stable --check` succeeds.
- [ ] 4.5 Update developer release procedures and skill instructions (`actioNN/skills/nn-skills-lifecycle/SKILL.md` / release guidelines) to document `templates-v<version>` and `v<version>` tag creation workflows.

### Phase 5: OpenSpec Specification Updates
- [ ] 5.1 Create active specification `openspec/specs/template-release-tagging/spec.md` establishing standardized Git release tagging (`templates-v<version>`, `v<version>`), tag-pinned remote spec URLs, and end-to-end upstream traceability (L3 → L2 → L1 → L0).
- [ ] 5.2 Update active specification `openspec/specs/template-package-structure/spec.md` to incorporate canonical source paths, versioned workspace hydration (`specs/templates/<name>/<version>/`), 5-tier resolution precedence, and atomic write-once hydration.
- [ ] 5.3 Mark active specification `openspec/specs/template-version-pruning/spec.md` as RETIRED, documenting replacement by isolated versioned workspace caching.
- [ ] 5.4 Mark legacy requirements in `openspec/specs/template-immutability-guard/spec.md` as RETIRED, superseding file-cloning checks with frontmatter version bump CI validation.
- [ ] 5.5 Validate OpenSpec metadata consistency and specification links.

### Phase 6: Integration Verification & Backward Compatibility Tests
- [ ] 6.1 Execute all unit and script test suites:
  - `node scripts/guard-template-immutability.test.js`
  - `node scripts/manifest/check-parity.test.js`
  - `node scripts/manifest/validate-manifest.test.js`
  - `node scripts/manifest/generate-manifest.test.js`
  - `npm --prefix iNNfo run test`
- [ ] 6.2 Execute workspace verification pipeline via `node scripts/verify.js` to ensure all 10 deterministic gates pass green.
- [ ] 6.3 Test backward-compatible resolution of legacy model references (e.g. `parent_spec: "projects_V_0-2-0"`, `parent_spec: "workspace_V_0-3-0_spec_NN"`).
- [ ] 6.4 Test fallback resolution for workspaces with legacy flat template files (`./templates/<name>_V_<version>_NN.md`).
- [ ] 6.5 Verify that hydrated packages provide both canonical `spec_NN.md` and backward-compatible alias `${base}_${verSegment}_NN.md`.
