# Tasks: FORMAT V_0-1-5 Compact Conventions

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~530 |
| 800-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Suffix rename + source constant updates | PR 1 | `git mv` all `_FORMAT.md`ΓåÆ`_F.md` (71 files) + update `FORMAT_FILE_SUFFIX`, validator naming checks, resolver cache, version.ts patterns, check-spec-version.mjs patterns |
| 2 | Frontmatter field rename `specification_version`ΓåÆ`spec_version`, `specification_url`ΓåÆ`spec_url` | PR 1 | Source type defs, parser serialization, validator checks, ModelInfoPanel.vue, all FORMAT file frontmatter, all test inline frontmatter |
| 3 | Version bump V_0-1-4ΓåÆV_0-1-5 | PR 1 | Update `FORMAT_V_0-1-4_F.md` frontmatter, `DEFAULT_FORMAT_VERSION`, `parent.name`/`parent.url` on dependent templates, CHANGELOGs |
| 4 | Docs + skills update | PR 1 | ~15 doc/skill files referencing old names |
| 5 | Build + verify | PR 1 | `npm run build` in format-editor, run all tests, verify bundle |

## Phase 1: File Suffix Rename + Source Constant Updates

- [x] 1.1 `git mv` all `*_FORMAT.md` ΓåÆ `*_F.md` across specs/, tests/fixtures/, apps/*/tests/fixtures/, docs/iNNfo/, Sandbox/ (71 files). Use a script to batch it. Verify with `git diff --stat`.
- [x] 1.2 Update `FORMAT_FILE_SUFFIX` in `packages/format-core/src/recursiveParser.ts`: `'_FORMAT.md'` ΓåÆ `'_F.md'`
- [x] 1.3 Update naming validation in `packages/format-core/src/validator.ts`: lines 399-411 (`_FORMAT.md` checks ΓåÆ `_F.md`), line 494 label
- [x] 1.4 Update cache path in `packages/format-core/src/resolver.ts`: line 49 (`${currentName}_FORMAT.md` ΓåÆ `${currentName}_F.md`)
- [x] 1.5 Update version.ts in `apps/format-editor/src/utils/version.ts`: comments (lines 8-11), regex patterns (lines 43, 59), `buildFormatFilename` (line 84) ΓÇö all `_FORMAT.md` ΓåÆ `_F.md`
- [x] 1.6 Update `apps/format-editor/src/views/HomeView.vue`: sample paths and descriptions (lines 27, 29, 35, 45)
- [x] 1.7 Update `apps/format-editor/src/components/editor/ModelInfoPanel.vue`: line 191 ΓÇö `extractFrontmatterField('specification_version')` ΓåÆ `extractFrontmatterField('spec_version')`
- [x] 1.8 Update `scripts/check-spec-version.mjs`: classification patterns (lines 72, 76, 77, 89) for `_FORMAT.md` ΓåÆ `_F.md`; frontmatter regexes (lines 117, 125) for `specification_version`/`specification_url` ΓåÆ `spec_version`/`spec_url`
- [x] 1.9 Update JSDoc in `packages/format-core/src/types.ts`: lines 324, 364 ΓÇö `_FORMAT.md` ΓåÆ `_F.md`
- [x] 1.10 **Test**: Update all test file references to renamed filenames (e.g. `'gb_FORMAT.md'` ΓåÆ `'gb_F.md'`, `'_FORMAT.md'` ΓåÆ `'_F.md'`) in `tests/recursive-parser.test.ts`, `tests/index.test.ts`, `apps/format-editor/tests/unit/*.test.ts`, `apps/format-editor/tests/golden/*.test.ts`, `apps/format-editor/tests/integration/*.test.ts`, `apps/format-editor/tests/progressive-smoke.test.ts`

## Phase 2: Frontmatter Field Rename

- [x] 2.1 Update type definitions in `packages/format-core/src/types.ts`: lines 54-55 ΓÇö `specification_version` ΓåÆ `spec_version`, `specification_url` ΓåÆ `spec_url`
- [x] 2.2 Update serialization in `packages/format-core/src/parser.ts`: lines 415-416
- [x] 2.3 Update validation in `packages/format-core/src/validator.ts`: lines 124-125 (JSDoc), 220-243 (checks + messages)
- [x] 2.4 Update `apps/format-editor/src/components/editor/ModelInfoPanel.vue`: line 191 ΓÇö field name in `extractFrontmatterField` call (already covered in 1.7 if using `spec_version`)
- [x] 2.5 Bulk replace `specification_version` ΓåÆ `spec_version` and `specification_url` ΓåÆ `spec_url` in ALL FORMAT file frontmatter (specs, templates, samples, fixtures, Sandbox models, Music History catalog). **CRITICAL**: Do NOT change URL path values containing `_FORMAT.md` ΓÇö only change field names.
- [x] 2.6 **Test**: Update all test inline frontmatter strings (`specification_version` ΓåÆ `spec_version`, `specification_url` ΓåÆ `spec_url`) in every `.test.ts` file. Do NOT change version values (they test against fixed versions).

## Phase 3: Version Bump V_0-1-4 ΓåÆ V_0-1-5

- [x] 3.1 Updated `specs/FORMAT_V_0-1-5_F.md` to reflect its own version (6 body references updated: code examples, self-reference, template example parent chain). Frozen `FORMAT_V_0-1-4_FORMAT.md` kept unchanged.
- [ ] 3.2 Update `apps/format-editor/src/utils/constants.ts`: `DEFAULT_FORMAT_VERSION = 'V_0-1-0'` ΓåÆ `'V_0-1-5'` ΓÇö **Note**: value is 'V_0-1-0' which was never updated from initial value. Needs user confirmation since this affects how the editor resolves spec URLs by default.
- [x] 3.3 Template parent.name/parent.url references: only `FORMAT_V_0-1-5_F.md` template code example had FORMAT references (updated to V_0-1-5). Frozen template specs (business_V_0-1-1, procedures_V_0-1-1, catalog_V_0-1-2) point to older FORMAT versions and are untouched.
- [x] 3.4 CHANGELOGs: added V_0-1-5 entry to `specs/CHANGELOG.md`

## Phase 4: Documentation and Skills Update

- [x] 4.1 Update `docs/*.md` files referencing `_FORMAT.md`, `specification_version`, `specification_url` (affected: `docs/index.md`, `docs/about.md`, `docs/spec_consolidation.md`, `docs/iNNfo/_FORMAT.md`ΓåÆ`_F.md`, etc.)
- [x] 4.2 Update `.agents/skills/*/SKILL.md` files referencing old conventions ΓÇö **skipped**: no `.agents/skills/` dir exists in repo; `spec-version-propagator` skill not found at `~/.agents/skills/` or repo
- [x] 4.3 Update `docs/documentation/*.md` files referencing `_FORMAT.md`, `specification_version`, `specification_url`
- [ ] 4.4 Update `docs/changesets/*.md` files ΓÇö **skipped**: historical records referencing frozen files that still use `_FORMAT.md` suffix on disk

## Phase 5: Build and Verify

- [x] 5.1 Build format-editor bundle (`npm run build` ΓåÆ `dist/assets/index-Dpe-n6AO.js`), synced to `docs/app/assets/` + updated `docs/app/index.html`
- [x] 5.2 Full test suite: format-core 47/47 Γ£à + format-editor 110/110 Γ£à = 157/157 total
- [x] 5.3 `node scripts/check-spec-version.mjs --version V_0-1-4 --check` ΓÇö only expected frozen references remain (Sandbox models, FORMAT_V_0-1-4_FORMAT.md, proposal.md). `--version V_0-1-5 --check` confirms all V_0-1-5 references are correct in source code.
- [x] 5.4 Smoke tests on built JS bundle: `_F.md` found Γ£à, `specification_version` = 0 occurrences Γ£à, `specification_url` = 0 occurrences Γ£à, `spec_version` = 3 occurrences Γ£à. Only frozen historical files retain old patterns.
- [x] 5.5 Build successful, JS/CSS deployed to docs/app/assets/, all 157 tests pass, smoke tests clean
