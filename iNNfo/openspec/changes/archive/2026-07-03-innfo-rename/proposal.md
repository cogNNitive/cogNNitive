# Proposal: innfo-rename

## Executive Summary

Rename the core specification from "FORMAT" to "iNNfo" across the entire iNNfo monorepo. The structural marker changes from `_F` to `_NN`, the file suffix from `_F.md` to `_NN.md`, and all packages, directories, constants, regex patterns, and public APIs are updated accordingly. This is a **breaking change** (MAJOR bump to V_0-2-0) with **no backward compatibility**. Legacy models using `_F.md` syntax are NOT migrated.

## Intent

The name "FORMAT" was always a working title that never adequately distinguished the spec from generic "format" terminology in documentation. "iNNfo" (pronounced "info") is the definitive brand name for the specification â€” it's distinctive, searchable, and aligns with the iNNv0 naming convention (`defiNNe`, `iNNfo`, `traNNsform`).

The `_F` structural marker was a terse abbreviation that became confusing as the ecosystem grew: `_F` could mean "FORMAT", "File", or "False" depending on context. `_NN` is unambiguous, visually distinctive (double-N echoes the iNNv0 brand), and avoids collision with common acronyms.

## Scope

### In Scope

| Category | Items | Change type |
|----------|-------|-------------|
| **Spec name** | "FORMAT" â†’ "iNNfo" everywhere in spec documents, source comments, user-facing strings | Text replace |
| **Structural marker** | `_F` â†’ `_NN` in all current-version source files | Regex + constant replace |
| **File suffix** | `_F.md` â†’ `_NN.md` for: spec file, parser code, validator checks, helpers, recursive parser, resolver | Constant change + tests |
| **Source code** | 14 files in `packages/format-core/src/` | Regex + constant changes |
| **Source code** | 4 files in `packages/format-mcp/src/` | Regex + constant + URL changes |
| **Source code** | ~90 files in `apps/format-editor/src/` | Regex + constant changes |
| **Tests** | ~40 files in `packages/format-core/tests/`, `packages/format-mcp/tests/`, `apps/format-editor/tests/` | String replacements |
| **Package names** | `@cognnitive/format-core` â†’ `@cognnitive/innfo-core`, `@cognnitive/format-mcp` â†’ `@cognnitive/innfo-mcp`, `@cognnitive/format-editor` â†’ `@cognnitive/innfo-editor` | `package.json` + imports |
| **Directory names** | `packages/format-core/` â†’ `packages/innfo-core/`, `packages/format-mcp/` â†’ `packages/innfo-mcp/`, `apps/format-editor/` â†’ `apps/innfo-editor/` | Rename + update refs |
| **Current spec** | `specs/FORMAT_V_0-1-5_F.md` â†’ `specs/iNNfo_V_0-2-0_NN.md` | New file (old stays for history) |
| **Version** | Bump from V_0-1-5 to V_0-2-0 (MAJOR, breaking) | Constants + frontmatter |
| **Docs** | ~20 files in `docs/` | Text replace |
| **Changelogs** | `CHANGELOG.md`, `specs/CHANGELOG.md` | Append V_0-2-0 entries |

### Out of Scope

- **Legacy specs** using `_FORMAT.md` suffix (e.g., `business_V_0-1-1_FORMAT.md`, `defiNNe_V_0-1-0_FORMAT.md`): NOT renamed. They stay as-is with their `_F` syntax.
- **Legacy models** using `_F.md` suffix (e.g., `tests/fixtures/` models, `specs/*/samples/` files): NOT migrated. They continue to use `_F.md` and `# _F ...` syntax.
- **Parser behavior**: No changes to parsing logic, validation rules, or output format. The parser still recognizes `_F` syntax in legacy files.
- **New features**: No feature additions, no behavior changes, no API surface expansion.
- **External URLs**: Public GitHub spec URLs remain at their current paths (redirects or coexistence strategy TBD).

## Files to Rename by Category

### Packages (3 directories + 3 `package.json` name fields)

| Current | New |
|---------|-----|
| `packages/format-core/` | `packages/innfo-core/` |
| `packages/format-mcp/` | `packages/innfo-mcp/` |
| `apps/format-editor/` | `apps/innfo-editor/` |
| `@cognnitive/format-core` (in 3 package.json files) | `@cognnitive/innfo-core` |
| `@cognnitive/format-mcp` (in 1 package.json) | `@cognnitive/innfo-mcp` |
| `@cognnitive/format-editor` (in 1 package.json) | `@cognnitive/innfo-editor` |

### Source: `packages/format-core/src/` (14 files)

`parser.ts` â€” 6 regex patterns (`F_SECTION_RE`, `F_ELEMENT_RE`, `INDEX_F_RE`, 3x inline `_F` in sectionName/sectionTitle functions), serializer emits `_F` in 5 places, `serializeModel` contains `_F` strings. Total: ~25 replacements.

`validator.ts` â€” `SECTION_FM_RE` regex, `visMarkerRe`, `hidMarkerRe`, ~15 string literals referencing `_F`, `_F.md` suffix checks. Total: ~20 replacements.

`helpers.ts` â€” `F_MD_RE` regex, comments referencing `_F.md`. Total: 2 replacements.

`recursiveParser.ts` â€” `FORMAT_FILE_SUFFIX = '_F.md'` constant (key change), `_F.md` in path resolution regexes (3 places), comments. Total: 5 replacements.

`resolver.ts` â€” 1 URL string: `${currentName}_F.md`. Total: 1 replacement.

`types.ts` â€” JSDoc comments referencing `_F.md`, `# _F`. Total: 3 replacements.

Other files (`index.ts`, `driver.ts`, `driver-unified.ts`, `driver-browser.ts`, `browser.ts`, `metamodel.ts`, `identity.ts`, `fs-types.ts`): comments and export path references. Total: ~5 replacements.

### Source: `packages/format-mcp/src/` (4 files)

`spec.ts` â€” `SPEC_BASE_URL` constant, template spec filenames (`business_V_0-1-1_FORMAT.md` â€” legacy, out of scope), `_F.md` in cache paths (2 places). Total: ~5 replacements.

`mutate.ts`, `list-read.ts` â€” `_F.md` path appending. Total: 3 replacements.

### Source: `apps/format-editor/src/` (~90 files, ~30 with actual _F references)

`constants.ts` â€” `DEFAULT_FORMAT_VERSION`, `buildSpecificationUrl()`, `buildDocumentationLocation()`. Total: 3 replacements.

`version.ts` â€” regex patterns, filename construction, JSDoc. Total: 6 replacements.

Components (`Header.vue`, `ModelInfoPanel.vue`, `DirectoryPickerModal.vue`, `BlockSheet.vue`, `BlockFeed.vue`, `ModelInfoPanel.vue`, etc.): Visual `_F` badge, UI strings, URL construction. Total: ~15 replacements.

### Tests (~40 files)

Most changes are string replacements in inline test content (model strings that use `# _F ...`, `_F.md` file names, `_FORMAT.md` URLs). Some test fixture files (`_F.md`) are legacy and out of scope.

### Docs (~20 `.md` files in `docs/`)

Replace references to "FORMAT" with "iNNfo" in prose, update examples showing `_F` syntax with `_NN` syntax where they reference the current version.

## Version Strategy

**V_0-1-5 â†’ V_0-2-0** (MAJOR bump, breaking change)

Rationale for MAJOR:
- File suffix `_F.md` â†’ `_NN.md`: all consumers must update their file patterns
- Structural marker `# _F` â†’ `# _NN`: all model files must use new syntax
- Package names changed: consumers must update imports
- No backward compatibility shims will be provided

The previous rename (`_FORMAT.md` â†’ `_F.md` in V_0-1-5) was a PATCH because the suffix was still `_F`-related. This is a MAJOR because we're changing the fundamental marker character.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Missed `_F` reference in source code | High | Medium | Use comprehensive grep with `_F` pattern across all source files; split by file type |
| Test fixtures still reference old syntax | High | High | Run full test suite after changes; fix failing tests iteratively |
| External consumers break | Medium | High | Publish migration guide; legacy `_F.md` files still parseable by old parser |
| Cross-model wikilinks break | Low | Medium | Legacy models use `[[filename_F.md]]` â€” these still work because filename hasn't changed for legacy files |
| Docsify/doc references outdated | Low | Low | Triage after code changes; docs are informational, not functional |

## Effort Estimate

| Phase | Files | Estimated changes | Person-hours |
|-------|-------|-------------------|-------------|
| Package renames (dirs + package.json) | 6 | 6 | 0.5 |
| Source code regex/constant changes | ~20 files | ~80 replacements | 2 |
| Test fixture updates | ~40 files | ~200 replacements | 3 |
| Spec file creation (V_0-1-5 â†’ V_0-2-0) | 1 new file | Content copy + rename | 1 |
| Documentation updates | ~20 files | ~50 replacements | 1 |
| Build verification + test run | â€” | â€” | 0.5 |
| **Total** | **~85 files** | **~340 changes** | **~8 hours** |

## Recommended Approach

1. **Phase 1 â€” Package infrastructure**: Rename directories, update `package.json` names, update cross-package dependency refs.
2. **Phase 2 â€” Core constants**: Change `FORMAT_FILE_SUFFIX` and all regex patterns in `format-core/src/`. This is the highest-risk change â€” verify with tests before proceeding.
3. **Phase 3 â€” Source tree**: Cascade changes through `format-mcp`, `format-editor`. Update imports, constants, UI strings.
4. **Phase 4 â€” Spec**: Create `iNNfo_V_0-2-0_NN.md` from `FORMAT_V_0-1-5_F.md` with all renames applied.
5. **Phase 5 â€” Tests**: Run full test suite, fix failures. This will catch most missed references.
6. **Phase 6 â€” Docs**: Update docs/ prose, changelogs.
7. **Verification**: `npm test` in all three packages, smoke test editor.

The change exceeds the 800-line review budget (~340 changes Ã— ~2 lines avg = ~680 edited lines across ~85 files, plus file renames). Recommended delivery: **single PR** with commit-slice organization (each phase = one commit) since the work is atomic â€” you can't ship partial rename.

## Success Criteria

- [ ] All `_F.md` â†’ `_NN.md` file suffix references in source code updated
- [ ] All `# _F` / `_F ` marker regex patterns updated to `# _NN` / `_NN `
- [ ] Package names and directories renamed; builds pass
- [ ] Full test suite passes across all three packages
- [ ] format-editor loads and renders iNNfo models correctly
- [ ] Legacy `_F.md` files still parse (no regression in backward-loading)
- [ ] `README.md` and changelogs updated
