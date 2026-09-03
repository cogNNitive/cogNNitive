# Tasks: innfo-rename

Rename **FORMAT** â†’ **iNNfo** across the entire iNNfo monorepo. Breaking change: V_0-1-5 â†’ V_0-2-0 (MAJOR). Structural marker `_F` â†’ `_NN`, file suffix `_F.md` â†’ `_NN.md`, packages `@cognnitive/format-*` â†’ `@cognnitive/innfo-*`.

> **Baseline**: Based on real grep analysis of the codebase. ~65 files modified across 8 phases, plus 1 new spec file (~500 lines). Total diff lines (additions + deletions): ~1,724.

---

## Phase 1 â€” Package Infrastructure

Files: 6 | Modified: ~11 lines | Dependency: none (can go first)

### Task 1.1: Rename directories (git mv)
```
git mv packages/format-core/ packages/innfo-core/
git mv packages/format-mcp/ packages/innfo-mcp/
git mv apps/format-editor/ apps/innfo-editor/
```

### Task 1.2: Update package.json name fields and cross-refs

| File | Change |
|------|--------|
| `packages/innfo-core/package.json` | `"name": "@cognnitive/innfo-core"` |
| `packages/innfo-mcp/package.json` | `"name": "@cognnitive/innfo-mcp"`; dep `@cognnitive/innfo-core`; bin `innfo-mcp` |
| `apps/innfo-editor/package.json` | `"name": "@cognnitive/innfo-editor"`; dep `@cognnitive/innfo-core`; prebuild scripts: `packages/innfo-core/` |

**Verification (after Phase 1):**
- `npm install` at monorepo root succeeds
- `git status` shows 3 directory renames + 3 package.json changes only
- Node modules resolve correctly

---

## Phase 2 â€” Core Regex & Constants (Highest Risk)

Files: 7 | Modified: ~53 lines | Dependency: Phase 1

**IMPORTANT**: This phase changes the parser to ONLY recognize `_NN` syntax. After this commit, no `_F.md` file parses correctly. This is the breaking point.

### Task 2.1: `packages/innfo-core/src/parser.ts` (~14 changes)

| Location | Old | New |
|----------|-----|-----|
| Line 9 | `const INDEX_F_RE = /_F\s+index:\s*(.*)$/` | `const INDEX_NN_RE = /_NN\s+index:\s*(.*)$/` |
| Line 43 | Comment `_F syntax only, V_0-1-1+` | `_NN syntax only, V_0-2-0+` |
| Line 45-46 | `F_SECTION_RE`, regex with `_F` | `NN_SECTION_RE`, regex with `_NN` |
| Line 48-49 | `F_ELEMENT_RE`, regex with `_F` | `NN_ELEMENT_RE`, regex with `_NN` |
| Lines 56-57 | `sectionName()` inline `_F` regex | `_NN` in regex |
| Lines 66-67 | `sectionTitle()` inline `_F` regex | `_NN` in regex |
| Line 185 | Comment `_F index: Name` | `_NN index: Name` |
| Line 191 | `trimmed.match(INDEX_F_RE)` | `trimmed.match(INDEX_NN_RE)` |
| Line 475 | `'# _F index'` | `'# _NN index'` |
| Line 486 | `` `# _F ${conceptName}` `` | `` `# _NN ${conceptName}` `` |
| Line 489 | `` `${prefix} _F ${conceptName}` `` | `` `${prefix} _NN ${conceptName}` `` |
| Line 508 | `` `# _F matrices: ${matrix.name}` `` | `` `# _NN matrices: ${matrix.name}` `` |
| Line 529 | `'# _F matrices: item-markers matrix'` | `'# _NN matrices: item-markers matrix'` |

### Task 2.2: `packages/innfo-core/src/validator.ts` (~25 changes)

Key replacements:
| Pattern | Change |
|---------|--------|
| `SECTION_FM_RE` â†’ `SECTION_NN_RE` | Regex `_F` â†’ `_NN` |
| `visMarkerRe` regex | `_F` â†’ `_NN` |
| `hidMarkerRe` regex | `_F` â†’ `_NN` (only `_F` branch; `block:` branch stays unchanged) |
| All error messages with `_F` | `_F` â†’ `_NN` (~20 string messages) |
| `fileName.endsWith('_F.md')` (Ã—2) | `endsWith('_NN.md')` |
| `* _F` / `- _F` startsWith checks | `* _NN` / `- _NN` |
| Inline `_F` regex checks (lines 310, 343, 365, 379) | All updated to `_NN` |
| Inline `.startsWith` checks (line 320) | Updated |

**âš ï¸ `hidMarkerRe` caution**: The alternation has two branches â€” `_F` (becomes `_NN`) and `block:` (legacy syntax, stays unchanged). Only the `_F` portion of the alternation changes. The `block:` pattern is intentionally preserved.

### Task 2.3: `packages/innfo-core/src/helpers.ts` (~3 changes)
- `F_MD_RE` â†’ `NN_MD_RE` (regex + variable name)
- Comment: `FORMAT model files (*_F.md)` â†’ `iNNfo model files (*_NN.md)`
- Comment example filename: `Ghostbusters_..._F.md` â†’ `Ghostbusters_..._NN.md`

### Task 2.4: `packages/innfo-core/src/recursiveParser.ts` (~5 changes)
- `FORMAT_FILE_SUFFIX = '_F.md'` â†’ `INNFO_FILE_SUFFIX = '_NN.md'`
- `sourcePath.replace(/\/_F\.md$/i, '')` (Ã—2) â†’ `/_NN\.md$/i`
- Comment `wikilinks ending in _F.md` â†’ `_NN.md`
- `target.endsWith(FORMAT_FILE_SUFFIX)` â†’ auto-updates with constant rename

### Task 2.5: `packages/innfo-core/src/resolver.ts` (1 change)
- `cachePath = join(specsDir, \`${currentName}_F.md\`)` â†’ `_NN.md`

### Task 2.6: `packages/innfo-core/src/types.ts` (~3 changes)
- 3 JSDoc comments: `_F.md` â†’ `_NN.md`, `# _F` â†’ `# _NN`

### Task 2.7: `packages/innfo-core/src/metamodel.ts` (~2 changes)
- Comments: `` `format-core`'s `resolveParentChain` `` â†’ `` `innfo-core`'s ``

**Verification (after Phase 2):**
- `npx vitest run packages/innfo-core/tests/` â€” all pass (after updating test content â€” Phase 5)
- `npx tsc --noEmit` in innfo-core passes
- grep for remaining `_F` patterns in `packages/innfo-core/src/` â€” only legacy comments remain

---

## Phase 3 â€” MCP Server Cascade

Files: 4 | Modified: ~13 lines | Dependency: Phase 2

### Task 3.1: `packages/innfo-mcp/src/tools/spec.ts` (~5 changes)
- `SPEC_BASE_URL` comment: `FORMAT spec repository` â†’ `iNNfo spec repository`
- Import `@cognnitive/format-core` â†’ `@cognnitive/innfo-core`
- Template spec filenames in TEMPLATE_SPECS map (line 37-39): these reference `*_FORMAT.md` (legacy files by URL) â€” these stay as-is for backward loading
- Cache path `_F.md` â†’ `_NN.md` (line 130)
- URL construction `FORMAT_V_${version}_FORMAT.md` â†’ `iNNfo_V_${version}_NN.md` (lines 71-72)

### Task 3.2: `packages/innfo-mcp/src/tools/mutate.ts` (~2 changes)
- Import `@cognnitive/format-core` â†’ `@cognnitive/innfo-core`
- `_F.md` in comment + `\`${id}_F.md\`` â†’ `_NN.md`

### Task 3.3: `packages/innfo-mcp/src/tools/list-read.ts` (~3 changes)
- Import `@cognnitive/format-core` â†’ `@cognnitive/innfo-core`
- Comments: `FORMAT model files (*_F.md)` â†’ `iNNfo model files (*_NN.md)`
- `\`${id}_F.md\`` â†’ `\`${id}_NN.md\``

### Task 3.4: `packages/innfo-mcp/src/server.ts` (~5 changes)
- All JSDoc and comments referencing `FORMAT` tools â†’ `iNNfo`, `FORMAT models` â†’ `iNNfo models`
- `process.env.FORMAT_MODELS_DIR` â†’ `process.env.INNFO_MODELS_DIR`
- Tool/parameter descriptions updated

**Verification (after Phase 3):**
- `npm run build` in innfo-mcp succeeds
- MCP smoke test passes

---

## Phase 4 â€” Editor App Cascade

Files: ~20 | Modified: ~45 lines | Dependency: Phase 1

### Task 4.1: `apps/innfo-editor/src/utils/constants.ts` (~3 changes)
- `DEFAULT_FORMAT_VERSION = 'V_0-1-5'` â†’ `DEFAULT_INNFO_VERSION = 'V_0-2-0'`
- URL template: `FORMAT_${version}_F.md` â†’ `iNNfo_${version}_NN.md`
- Comment: `Current FORMAT specification` â†’ `Current iNNfo specification`

### Task 4.2: `apps/innfo-editor/src/utils/version.ts` (~6 changes)
- All regex: `_F.md` â†’ `_NN.md` (3 regex patterns: new-match, old-match, build)
- JSDoc: `FORMAT versioning` â†’ `iNNfo versioning`, file name examples `_F.md` â†’ `_NN.md`
- `buildFormatFilename` output: `_F.md` â†’ `_NN.md`

### Task 4.3: `apps/innfo-editor/src/components/layout/Header.vue` (~3 changes)
- Visual `_F` badge â†’ `_NN`
- `FORMAT Modeler` â†’ `iNNfo Modeler`
- Import `DEFAULT_FORMAT_VERSION` â†’ `DEFAULT_INNFO_VERSION`

### Task 4.4: `apps/innfo-editor/src/components/editor/ModelInfoPanel.vue` (~3 changes)
- Visual `_F` badge â†’ `_NN` (line 6)
- `FORMAT Metadata` â†’ `iNNfo Metadata` (line 67)
- Import `DEFAULT_FORMAT_VERSION` â†’ `DEFAULT_INNFO_VERSION`

### Task 4.5: `apps/innfo-editor/src/components/layout/DirectoryPickerModal.vue` (~6 changes)
- `FORMAT` in UI labels â†’ `iNNfo` (3+ places: subtitle, URL instructions, create instructions)
- `_F.md` in placeholder URL and instructions â†’ `_NN.md`
- `DEFAULT_FORMAT_VERSION` â†’ `DEFAULT_INNFO_VERSION` in import and usage
- Comment: `fetch a FORMAT model` â†’ `fetch an iNNfo model`

### Task 4.6: `apps/innfo-editor/src/components/editor/BlockSheet.vue` (~2 changes)
- `blockPattern` regex: `_F` â†’ `_NN`
- Comment: `first _F marker` â†’ `first _NN marker`

### Task 4.7: `apps/innfo-editor/src/components/editor/BlockFeed.vue` (1 change)
- `<p>` text: `_F block entry` â†’ `_NN block entry`

### Task 4.8: `apps/innfo-editor/src/views/HomeView.vue` (~5 changes)
- Sample description strings: `_F.md` â†’ `_NN.md`
- Sample paths: `_F.md` â†’ `_NN.md`
- `FORMAT folder` â†’ `iNNfo folder`

### Task 4.9: All re-export files (~12 files, 1 import path each)
Imports `@cognnitive/format-core` â†’ `@cognnitive/innfo-core` in:
- `composables/useUrlDocLoader.ts`
- `composables/useConceptVisuals.ts`
- `model/recursiveParser.ts`
- `model/recursiveSerializer.ts`
- `model/types.ts`
- `model/identity.ts`
- `model/metamodel.ts`
- `model/fs-types.ts`
- `shared/validator.ts`
- `shared/validation-types.ts`
- `stores/workspaceStore.ts`
- `stores/metamodelStore.ts`
- `stores/modelStore.ts`

**Verification (after Phase 4):**
- `npm run build` in innfo-editor succeeds
- `npx vue-tsc --noEmit` passes
- Editor loads and shows `_NN` badge

---

## Phase 5 â€” Core Tests

Files: 2 | Modified: ~75 lines | Dependency: Phase 2

### Task 5.1: `packages/innfo-core/tests/index.test.ts` (~50 changes)
All inline `_F` content strings updated to `_NN`:
- `# _F index` â†’ `# _NN index` (Ã—8)
- `* _F ConceptName:` â†’ `* _NN ConceptName:` (Ã—15+)
- `[[file_F.md]]` â†’ `[[file_NN.md]]` (Ã—3)
- Filename strings: `test_F.md` â†’ `test_NN.md` (Ã—10+)
- `validateFormatContent(content, 'test_F.md')` â†’ `'test_NN.md'`
- `'FORMAT (level 1)'` describe block â†’ `'iNNfo (level 1)'`
- Frontmatter references to `_FORMAT.md` specs (e.g., `business_V_0-1-1_FORMAT.md`) â€” these are legacy URLs, keep as-is

### Task 5.2: `packages/innfo-core/tests/recursive-parser.test.ts` (~25 changes)
- Inline `_F` marker strings â†’ `_NN` (Ã—12)
- `fakeFile('xxx_F.md', ...)` â†’ `xxx_NN.md` (Ã—10+)
- `BASE_FM` constant: no `_F` refs, but test content does

**Verification (after Phase 5):**
- `npx vitest run packages/innfo-core/tests/` â€” all pass
- All golden tests pass

---

## Phase 6 â€” Editor Tests

Files: ~20 | Modified: ~150 lines | Dependency: Phases 2, 4

### Task 6.1: Test files with inline model content strings

| File | Approx. changes |
|------|----------------|
| `tests/progressive-smoke.test.ts` | ~20 |
| `tests/unit/file-system-ops.test.ts` | ~12 |
| `tests/unit/validator.test.ts` | ~15 |
| `tests/unit/recursiveParser.test.ts` | ~20 |
| `tests/unit/recursiveSerializer.test.ts` | ~10 |
| `tests/unit/workspaceStore.test.ts` | ~6 |
| `tests/unit/workspaceStore-session.test.ts` | ~5 |
| `tests/unit/metamodel.test.ts` | ~4 (import paths) |
| `tests/integration/workspace.integration.test.ts` | ~8 |
| `tests/integration/catalog.integration.test.ts` | ~10 |
| `tests/unit/metamodelStore-taxonomy.test.ts` | ~2 |
| `tests/unit/out-of-scope-absence.test.ts` | ~2 |
| `tests/golden/roundtrip.synthetic.golden.test.ts` | ~8 |
| `tests/golden/roundtrip.models.golden.test.ts` | ~3 (import + helper) |
| `tests/golden/recursiveParser.models.golden.test.ts` | ~2 |
| `tests/golden/crlf-fidelity.golden.test.ts` | ~4 |
| `tests/golden/catalog-hierarchy.golden.test.ts` | ~15 |

**Pattern for each**: Replace inline `# _F`, `* _F`, `_F.md`, `[[..._F.md]]` with `_NN` equivalents. Update import paths `@cognnitive/format-core` â†’ `@cognnitive/innfo-core` where present.

**âš ï¸ Caution**: Only update **model content strings**, not references to legacy fixture files on disk (e.g., `fixtures/file-model_F.md` â€” these are legacy fixtures, out of scope).

**Verification (after Phase 6):**
- `npx vitest run apps/innfo-editor/tests/` â€” all pass
- Golden file tests pass: `npx vitest run --include='**/*.golden.*'`

---

## Phase 7 â€” Spec & Template Files

Files: 6 | Modified: ~100 lines + 1 new file | Dependency: Phase 2

### Task 7.1: Create `specs/iNNfo_V_0-2-0_NN.md` (~500 lines, new file)
- Copy `specs/FORMAT_V_0-1-5_F.md` â†’ `specs/iNNfo_V_0-2-0_NN.md`
- Apply transforms:
  | Field | Old | New |
  |-------|-----|-----|
  | `spec_version` | `V_0-1-5` | `V_0-2-0` |
  | `title` | `FORMAT Specification` | `iNNfo Specification` |
  | `parent_spec.name` | `defiNNe_V_0-1-0` | `defiNNe_V_0-1-1` |
  | `parent_spec.url` | `.../defiNNe_V_0-1-0_FORMAT.md` | `.../defiNNe_V_0-1-1_NN.md` |
  | `spec_url` | `.../FORMAT_V_0-1-5_F.md` | `.../iNNfo_V_0-2-0_NN.md` |
  | All `# _F` | â†’ `# _NN` | (section headers, elements, index, matrices) |
  | All `FORMAT` prose | â†’ `iNNfo` | (word-boundary aware) |
  | All `V_0-1-5` version | â†’ `V_0-2-0` | (in appropriate places only) |
  | All `_F.md` suffix | â†’ `_NN.md` | (except legacy file references) |
- The original `FORMAT_V_0-1-5_F.md` stays unmodified

### Task 7.2: Migrate `specs/defiNNe_V_0-1-1_F.md` â†’ `defiNNe_V_0-1-1_NN.md` (~50 changes)
- File rename: `_F.md` â†’ `_NN.md`
- Frontmatter `specification_url` updated
- All `_F` markers in body â†’ `_NN`
- Prose `FORMAT` â†’ `iNNfo`
- File naming convention table (Â§6) updated: `_F.md` â†’ `_NN.md`, version examples updated
- Spec resolver protocol (Â§3): cache filenames â†’ `_NN.md`
- `defiNNe_V_0-1-0_FORMAT.md` references â€” these are legacy URLs, keep as-is

### Task 7.3: Migrate `specs/business_V_0-1-1_FORMAT.md` â†’ `business_V_0-1-1_NN.md` (~20 changes)
- File rename: `_FORMAT.md` â†’ `_NN.md`
- Frontmatter:
  - `parent_spec.name`: `FORMAT_V_0-1-1` â†’ `iNNfo_V_0-2-0`
  - `parent_spec.url`: ...`FORMAT_V_0-1-1_FORMAT.md` â†’ ...`iNNfo_V_0-2-0_NN.md`
- Body: `_F` markers in examples â†’ `_NN`
- Prose: `FORMAT` â†’ `iNNfo`
- Document notice: `FORMAT document` â†’ `iNNfo document`

### Task 7.4: Migrate `specs/procedures_V_0-1-1_FORMAT.md` â†’ `procedures_V_0-1-1_NN.md` (~15 changes)
- Same pattern as Task 7.3 â€” file rename, parent update, marker migration
- Parent chain resolution example filenames updated

### Task 7.5: Migrate `specs/catalog_V_0-1-2_FORMAT.md` â†’ `catalog_V_0-1-2_NN.md` (~15 changes)
- Same pattern â€” file rename, parent update (`FORMAT_V_0-1-2` â†’ `iNNfo_V_0-2-0`)
- FOLDER-mode directory structure examples: `_FORMAT.md` filenames in tree diagrams â€” these are LEGACY convention references that stay as-is (they describe how FOLDER mode works historically, not current files)

**Verification (after Phase 7):**
1. `parseModel()` on `iNNfo_V_0-2-0_NN.md` returns clean
2. `parseModel()` on `defiNNe_V_0-1-1_NN.md` returns clean
3. Parent chain from `iNNfo_V_0-2-0_NN.md` resolves up to `defiNNe_V_0-1-1_NN.md`
4. Grep each migrated file for remaining `_F` patterns (excluding legacy URLs)
5. `buildSpecificationUrl('V_0-2-0')` resolves correctly

---

## Phase 8 â€” Documentation, Changelogs & Skills

Files: ~20 | Modified: ~170 lines | Dependency: none (can be last)

### Task 8.1: Root CHANGELOG.md (~5 lines added)
- Append V_0-2-0 entry: "Renamed FORMAT â†’ iNNfo (V_0-1-5 â†’ V_0-2-0 MAJOR). Structural marker `_F` â†’ `_NN`, packages renamed."

### Task 8.2: `specs/CHANGELOG.md` (~10 lines added)
- Append V_0-2-0 entry with all breaking changes documented
- Historical changelog entries (pre-V_0-2-0) stay as-is

### Task 8.3: Documentation files â€” prose replacements

| File | Key changes (example) |
|------|----------------------|
| `docs/index.md` | `FORMAT ecosystem` â†’ `iNNfo ecosystem`, `_F.md` â†’ `_NN.md` |
| `docs/about.md` | Same pattern |
| `docs/readme.md` | `FORMAT ecosystem` â†’ `iNNfo ecosystem` |
| `docs/documentation/README.md` | `FORMAT ecosystem` â†’ `iNNfo ecosystem` |
| `docs/documentation/ecosystem.md` | `FORMAT` â†’ `iNNfo`, `_F.md` â†’ `_NN.md` |
| `docs/documentation/format-core.md` | `FORMAT document` â†’ `iNNfo document`, `_F.md` references |
| `docs/documentation/format-editor.md` | `FORMAT validation` â†’ `iNNfo validation`, `_F.md` node descriptions |
| `docs/documentation/launcher.md` | `FORMAT ecosystem` â†’ `iNNfo ecosystem` |
| `docs/documentation/usage.md` | `FORMAT model` â†’ `iNNfo model`, `_F` markers in examples |
| `docs/documentation/specifications.md` | Spec name table, OKF compatibility section |
| `docs/documentation/opencode-format-agent.md` | `FORMAT Agent` â†’ `iNNfo Agent`, tool descriptions |
| `docs/documentation/_sidebar.md` | Link text `FORMAT Agent` â†’ `iNNfo Agent` |
| `docs/spec_consolidation.md` | ~50+ replacements â€” heavy FORMAT references throughout |
| `docs/conversation-handoff_2026-07-02.md` | Prose FORMAT â†’ iNNfo, `_F.md` â†’ `_NN.md` |
| `docs/SESSION_HANDOFF.md` | Spec chain references, hierarchy diagrams |
| `docs/resolver-protocol-test-plan.md` | Filename suffixes in test plans, cache paths |
| `docs/antigravityanalysis.md` | Spec filenames, formatting markers |

**âš ï¸ Caution for docs**: Many docs files are historical/archival in nature (conversation handoffs, session handoffs, consolidation docs). Only update references that describe CURRENT-version behavior. Historical references (e.g., `FORMAT_V_0-1-0_FORMAT.md` as a frozen spec URL) stay as-is.

### Task 8.4: `.agents/skills/spec-version-propagator/SKILL.md` (~10 changes)
- `FORMAT spec` â†’ `iNNfo spec` (title, purpose, hierarchy)
- `FORMAT ecosystem` â†’ `iNNfo ecosystem`
- `DEFAULT_FORMAT_VERSION` â†’ `DEFAULT_INNFO_VERSION` (in example)
- Template spec references in propagation map: `business_V_0-1-1_FORMAT.md` â†’ `business_V_0-1-1_NN.md`
- File pattern references: `_F.md` â†’ `_NN.md`

**âš ï¸ `docs/iNNfo/_F.md`**: This is a LEGACY model file in FOLDER mode with `_F.md` suffix. **Out of scope** â€” do NOT modify. The same applies to `docs/iNNfo/launcher/_F.md`.

**Verification (after Phase 8):**
- No code changes â€” documentation only
- `npm test` still passes (docs are not functional)
- All docs files render correctly in markdown viewers

---

## Execution Order

```
Phase 1 (Package infra)
    â”‚
    â”œâ”€â”€â–¶ Phase 2 (Core regex) â”€â”€â”€â”€â–¶ Phase 5 (Core tests)
    â”‚                                      â”‚
    â–¼                                      â”‚
Phase 3 (MCP cascade) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
    â”‚                                       â”‚
    â–¼                                       â–¼
Phase 4 (Editor cascade) â”€â”€â”€â”€â–¶ Phase 6 (Editor tests)
    â”‚
    â–¼
Phase 7 (Spec files)
    â”‚
    â–¼
Phase 8 (Docs & changelogs)
```

**Parallel groups (within a phase, tasks are parallel unless noted):**
- Phase 1: Task 1.1 first, then Tasks 1.1â†’1.2 (sequential â€” dirs must exist before package.json paths resolve)
- Phase 2: Tasks 2.1â€“2.7 can be done in any order (they are independent files)
- Phase 3: Tasks 3.1â€“3.4 parallel
- Phase 4: Tasks 4.1â€“4.9 parallel
- Phase 5: Tasks 5.1â€“5.2 parallel
- Phase 6: All test files can be updated in any order
- Phase 7: Tasks 7.1â€“7.5 parallel (independent spec files)
- Phase 8: Tasks 8.1â€“8.4 parallel

**Sequential gates (between phases):**
- Phase 3 depends on Phase 2 (imports change)
- Phase 4 depends on Phase 1 (directory renamed) and Phase 2 (new package name)
- Phase 5 depends on Phase 2 (regex changes must be in place for tests to pass)
- Phase 6 depends on Phase 4 (editor code must match test expectations)
- Phase 7 can be done after Phase 2 (spec files are content, not code)

---

## Verification Gates

### Gate A: After Phase 1 (Package infra)
- [ ] `git status` shows 3 directory renames + package.json changes
- [ ] `npm install` succeeds at monorepo root
- [ ] `node -e "require('@cognnitive/innfo-core')"` resolves (if build-able at this stage)

### Gate B: After Phase 2 + 5 (Core + core tests)
- [ ] `npx vitest run packages/innfo-core/tests/` â€” all pass
- [ ] `npx tsc --noEmit` in innfo-core
- [ ] `grep -rn '_F' packages/innfo-core/src/` â€” only legacy comments remain
- [ ] Grep for `_F` in core tests â€” only legacy fixture refs remain

### Gate C: After Phases 3, 4, 6 (MCP + Editor + tests)
- [ ] `npm run build` in innfo-mcp and innfo-editor
- [ ] `npx vitest run apps/innfo-editor/tests/` â€” all pass
- [ ] UI smoke test: editor shows `_NN` badge, validation messages use iNNfo

### Gate D: After Phase 7 (Spec files)
- [ ] `parseModel()` on `iNNfo_V_0-2-0_NN.md` returns clean
- [ ] `parseModel()` on `defiNNe_V_0-1-1_NN.md` returns clean
- [ ] Parent chain resolves: `iNNfo_V_0-2-0_NN.md` â†’ `defiNNe_V_0-1-1_NN.md`
- [ ] 3 templates parse cleanly with new parent chain

### Gate E: Final (all phases)
- [ ] `npm run build` across entire monorepo
- [ ] `npm test` â€” all tests pass
- [ ] Stale `_F` reference audit passes (custom grep per design.md Â§7.3)
- [ ] Legacy `_FORMAT.md` files in `archive/` untouched (grep verification)

---

## Review Workload Forecast

| Metric | Value |
|--------|-------|
| **Total files modified** | ~65 |
| **Total lines modified** | ~612 (modifications in existing files) |
| **Total lines added** | ~500 (new `iNNfo_V_0-2-0_NN.md`) |
| **Total diff lines** | ~1,724 (modified count Ã—2 + new file) |
| **400-line budget risk** | **High** â€” nearly 2Ã— over with new spec file alone |
| **800-line budget risk** | **High** â€” significantly exceeds even accounting for mechanical nature |
| **Chained PRs recommended** | **No** â€” change is atomic. A partial rename anywhere breaks the build. A single PR with work-unit commits is the only viable strategy. |
| **Decision needed before apply** | **Yes** â€” the 800-line review budget is exceeded. See options below. |

### Options to stay within review budget

1. **Accept `size:exception`** â€” The change is mechanical (find-and-replace, not logic changes). The diff noise is high but review complexity is low. If the reviewer understands the mapping table, the actual cognitive load is ~30 minutes, not proportional to line count.
2. **Split the new spec file** â€” Create the `iNNfo_V_0-2-0_NN.md` in a separate preparatory PR (just the spec file, no code changes). Then the rename PR covers code + tests + docs only (~1,024 diff lines).
3. **Drop the migration script** â€” Remove the `scripts/migrate-innfo.mts` from scope. It was planned in the design but not required for core rename. Saves ~1 file.

### Recommended path

**Option 1**: Accept as a single PR with `size:exception`. Rationale:
- The diff is ~1,724 lines but ~80% is mechanical string replacements in test content
- Core logic changes (~53 lines in parser/validator) are the only high-risk area
- Each commit has its own verification gate that proves correctness
- Reviewers can focus on Phase 2 (real logic), then skim remaining phases for missed patterns

---

## Key Notes for Implementation

1. **Import paths**: All `@cognnitive/format-core` imports become `@cognnitive/innfo-core`. The workspace hoisting from `npm workspaces` resolves correctly after directory rename + `npm install`.
2. **Legacy fixtures untouched**: Model files with `_F.md` suffix in `tests/fixtures/`, `specs/*/samples/` are NOT migrated. Tests that reference them by filename keep the old path.
3. **`hidMarkerRe` preservation**: The `block:` branch in `validator.ts` line 301 is legacy syntax from V_0-1-0 era that pre-dates `_F`. It stays as `block:` â€” do NOT rename.
4. **`_FORMAT.md` vs `_F.md`**: Files with the `_FORMAT.md` suffix (legacy) are generally out of scope. The 3 templates are the exception â€” they use `_FORMAT.md` suffix now but the user explicitly included them. Their suffix changes from `_FORMAT.md` to `_NN.md` directly.
5. **Docs are tricky**: Many docs contain historical references â€” frozen spec URLs, legacy filenames, archive discussions. Only update references that describe the CURRENT version. Historical references stay as-is.
