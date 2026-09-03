# Proposal: format-v0-1-3-unified

> Eliminate the FILE/FOLDER mode dichotomy from FORMAT V_0-1-3. One model = one file. A workspace `index.md` is the single entry point — no filesystem scanning.

## Intent

FORMAT V_0-1-2 defined two representation modes (FILE, FOLDER) with separate body syntax and parsing pipelines. The FOLDER mode added complexity (~650-line recursive parser, parallel serializer, folder driver, special fixtures) for negligible user benefit — every real model in the repo is single-file. This change **removes FOLDER mode entirely**, simplifies the codebase by ~700 lines, and replaces filesystem-driven discovery with a declarative `index.md` that lists all workspace models via `_F index` wikilinks.

## Scope

### In Scope

1. **V_0-1-3 spec patch** — remove §2 (Representation Modes), rename §5 → "Model Body Syntax", replace §6 with "Workspace Structure" (index.md), add `asset_mode` and `slug` to frontmatter, update all examples and naming conventions
2. **Parser simplification** — rewrite `recursiveParser.ts` from ~650 lines to ~100 lines: read index.md → parse listed models. Remove `ensureFolderNode`, `parseFolderNode`, `createConceptNode`, `parseFileNode`. Keep `parseModel`, `normalizeElementsIntoGraph`, `IdentityRegistry`
3. **Serializer trim** — rewrite `recursiveSerializer.ts` from ~175 lines to ~50 lines: write root model file only, no FOLDER tree walk
4. **Remove FOLDER across the stack** — types.ts (rm `'FOLDER'` from Mode/StorageMode), driver.ts (rm FolderDriver), delete driver-folder.ts, validator.ts (rm FOLDER checks), workspaceStore.ts (rm FOLDER detection), modelStore.ts (rm `'FOLDER'` default)
5. **Fixtures & tests** — remove `catalog-distributed/` and `folder-model/` fixtures. Keep and adapt `catalog-single-file_FORMAT.md`. Create `index.md` workspace fixture. Rewrite all tests — remove FOLDER-mode tests, adapt remainder to new parser API

### Out of Scope

- defiNNe meta-spec updates (separate change)
- Migration tooling (no backward compat)
- Widget changes (already mode-agnostic)
- ConceptTableView (separate feature)
- Workspace editor UI for index.md editing (manual editing only in this change)

## Capabilities

### New Capabilities

- **`format-workspace-index`**: Workspace-level `index.md` that declares model membership via `_F index` wikilinks. Resolved by the simplified parser as the single entry point.

### Modified Capabilities

- **`format-core-parser`** (from `format-core`): `recursiveParser.ts` rewritten — removes all FOLDER-walk logic, reads `index.md` → resolves each wikilink to a model file → parses individually. IdentityRegistry enforces global uniqueness.
- **`format-core-types`** (from `format-core`): Mode union narrowed from `'FILE' | 'FOLDER'` to just `'FILE'`. `StorageMode` simplified. Frontmatter gains `asset_mode` and `slug` fields.

## Approach

Four independent PRs merging to `main` (no chaining needed — each is safe to merge independently):

| PR | Scope | Risk |
|----|-------|------|
| **PR 1: Spec** | Write `specs/FORMAT_V_0-1-3_FORMAT.md` as a patch over V_0-1-2. Freeze V_0-1-2 untouched | Low — spec-only, no code |
| **PR 2: Core removal** | Remove FOLDER from types.ts, delete driver-folder.ts, strip driver.ts, simplify validator.ts | Medium — types change affects consumers |
| **PR 3: Parser & serializer** | Rewrite recursiveParser.ts + recursiveSerializer.ts. Create index.md fixture. Adapt tests | High — biggest refactor, largest test surface |
| **PR 4: App cleanup** | Remove FOLDER from workspaceStore.ts + modelStore.ts. Remove folder fixtures. Update app tests | Low — dead code removal |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `specs/FORMAT_V_0-1-3_FORMAT.md` | **New** | Patch from V_0-1-2, removes §2+§2.2+§6, renames §5, adds asset_mode+slug |
| `packages/format-core/src/recursiveParser.ts` | **Rewritten** | ~650→~100 lines, index.md-driven |
| `apps/format-editor/src/model/recursiveSerializer.ts` | **Rewritten** | ~175→~50 lines, no FOLDER walk |
| `packages/format-core/src/types.ts` | **Modified** | Remove `'FOLDER'` from Mode/StorageMode |
| `packages/format-core/src/driver.ts` | **Modified** | Remove FolderDriver |
| `packages/format-core/src/driver-folder.ts` | **Deleted** | Entire file |
| `packages/format-core/src/validator.ts` | **Modified** | Remove FOLDER checks |
| `apps/format-editor/src/stores/workspaceStore.ts` | **Modified** | Remove FOLDER detection |
| `apps/format-editor/src/stores/modelStore.ts` | **Modified** | Remove `'FOLDER'` default |
| Test fixtures | **Modified** | Remove FOLDER fixtures, adapt single-file, add index.md |
| All test files | **Modified** | Remove FOLDER tests, adapt parser tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| High test surface (~61 FOLDER references to recursiveParse) | High | PR 3 isolated; rewrite tests alongside parser, not after |
| IdentityRegistry global uniqueness may surface collisions in existing single-file fixtures | Medium | Add collision detection with "Name (Concept)" suggestion — catch early in PR 3 |
| Parser simplification could miss edge cases in existing single-file models | Low | Keep existing `parseModel()` + `normalizeElementsIntoGraph` unchanged; only the entry point logic changes |

## Rollback Plan

Each PR is independently revertible. No data migration exists — models are single-file Markdown, and V_0-1-3 parsers will not read V_0-1-2 FOLDER models. Rollback means reverting all four PRs. The V_0-1-2 spec and parser remain in git history and can be restored by reverting.

## Success Criteria

- [ ] `specs/FORMAT_V_0-1-3_FORMAT.md` published — no FOLDER mode, no §2.2 or §6, has `asset_mode` + `slug` frontmatter
- [ ] `recursiveParser.ts` produces correct `ModelNode[]` from a workspace with `index.md`
- [ ] `recursiveSerializer.ts` writes the root model file with no FOLDER tree walk
- [ ] No `'FOLDER'` string literal remains in types, drivers, validators, or stores
- [ ] `driver-folder.ts` deleted
- [ ] FOLDER-mode fixtures removed
- [ ] All tests pass — zero FOLDER-mode references
- [ ] Existing single-file models parse correctly with the simplified parser
- [ ] Existing single-file fixtures render correctly in format-editor
