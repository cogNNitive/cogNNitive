# Verify Report: Codebase Quality Remediation

**Date**: 2026-07-01  
**Verifier**: SDD Verify phase  
**Package**: iNNfo monorepo  

---

## Executive Summary

| Metric | Result |
|--------|--------|
| Tasks verified | 11/11 |
| **Pass** | 7 tasks (T1, T2, T3, T4, T6, T7, T8) |
| **Warning** | 4 tasks (T5, T9, T10, T11) |
| **Critical** | 0 tasks |
| Test suite | 15/18 passed (3 pre-existing failures â€” not caused by this change) |
| format-core `tsc --noEmit` | 12 errors â€” **FAILS** |
| launcher `tsc --noEmit` | 1 error â€” **FAILS** |

### Key Issues

1. **TypeScript compilation fails in format-core (12 errors)**: The `parseYaml` internal typing uses a `Record<string, unknown> | unknown[]` union that TypeScript cannot narrow without explicit guards. The `parseYamlValue` return type does not include `(string | number | boolean | null)[]` for array literals.
2. **TypeScript compilation fails in launcher (1 error)**: `collectDirectoryEntries` expects `FileSystemDirectoryEntry` but `webkitGetAsEntry()` returns `FileSystemEntry`.
3. **T11c â€” Tautology assertion not fixed**: `expect(rels.length).toBeGreaterThanOrEqual(0)` at test line 235 remains unchanged.
4. **T10 â€” `LauncherConfig` kept with `@todo`**: Acceptable per spec, but the task suggested removal as an option.

---

## Test Suite Results

**Command**: `npm run test -w packages/format-core`

| Suite | Tests | Passed | Failed |
|-------|-------|--------|--------|
| defiNNe (level 0) | 1 | 1 | 0 |
| FORMAT (level 1) | 1 | 1 | 0 |
| business template (level 2) | 3 | 3 | 0 |
| Ghostbusters model (level 3) | 7 | 4 | **3** |
| procedures template (level 2) | 1 | 1 | 0 |
| kb template (level 2) | 1 | 1 | 0 |
| validator | 2 | 2 | 0 |
| extended parser features | 2 | 2 | 0 |
| **Total** | **18** | **15** | **3** |

### Pre-existing Failures (NOT caused by this change)

All 3 failures are in Ghostbusters model tests and relate to the `* _F index: Name` taxonomy format using `_F` syntax instead of `[[wikilinks]]` â€” `parseIndexBlock` doesn't support this format. Confirmed by apply-progress memory (#275).

1. `parses taxonomy from index block` â€” `model.taxonomy.length` is 0 (expects >20)
2. `parses concept elements` â€” `model.elements.has('Stakeholders')` is false
3. `serializes and re-parses correctly` â€” serialized output doesn't contain `# _F Stakeholders`

---

## TypeScript Compilation Results

### format-core (`npx -w packages/format-core tsc --noEmit`)

**Result: 12 errors â€” FAIL**

| File | Lines | Error |
|------|-------|-------|
| `driver-folder.ts` | 57-60 | Property `type`/`fields`/`markers`/`graph_edges` does not exist on type `{}`. `fm` is `SpecFrontmatter \| {}` after `?? {}` fallback, and `{}` has no index signature. |
| `parser.ts` | 76, 77, 103, 104, 106 | `parent.data` is `Record<string, unknown> \| unknown[]` â€” can't index with `string`. |
| `parser.ts` | 83, 91, 94 | `parent.data.push` is of type `unknown`. |
| `parser.ts` | 116 | `parseYamlValue` returns array literals `[...]` but return type `string \| number \| boolean \| null` doesn't include arrays. |

### launcher (`npx -w apps/launcher tsc --noEmit`)

**Result: 1 error â€” FAIL**

| File | Line | Error |
|------|------|-------|
| `detector.ts` | 21 | `entry` is `FileSystemEntry` (narrowed from `FileSystemEntry \| null`), not assignable to `FileSystemDirectoryEntry` parameter of `collectDirectoryEntries`. |

---

## Per-Task Verification Results

### T1 â€” Fix FORMAT Model Spec Compliance âœ… **PASS**

| Check | Result | Detail |
|-------|--------|--------|
| `template:` block removed from frontmatter | âœ… | No frontmatter `template:` block. `template:` occurrences are element-level YAML fields (valid). |
| Frontmatter closes with bare `---` | âœ… | Line 13: bare `---` |
| `specification_url` points to FORMAT level-1 | âœ… | `https://raw.githubusercontent.com/cogNNitive/cogNNitive/v0.1.1/specs/FORMAT_V_0-1-1_FORMAT.md` |
| Zero `<!-- block:` occurrences | âœ… | `Select-String` found zero matches. All markers use `<!-- _F -->` hidden form. |
| Hidden `_F` syntax used | âœ… | e.g. `# <!-- _F --> Business summary`, `* <!-- _F Segments: --> Ops & Compliance` |

---

### T2 â€” Fix Vite Browser Build Config âœ… **PASS**

| Check | Result | Detail |
|-------|--------|--------|
| `conditions: ['browser']` added | âœ… | Line 9 |
| `@` alias uses `path.resolve(__dirname, 'src')` | âœ… | Line 11 |
| `import { resolve } from 'node:path'` | âœ… | Line 2 |

---

### T3 â€” Fix collectDirectoryEntries Async Bug âœ… **PASS**

| Check | Result | Detail |
|-------|--------|--------|
| `collectDirectoryEntries` is `async` returns `Promise<File[]>` | âœ… | Line 34 |
| `collectFiles` is `async` | âœ… | Line 14 |
| Do-while loop for batch `readEntries` | âœ… | Lines 46-59 |
| Max-iteration guard (100) | âœ… | Lines 37-38, 57-58 |
| Entry parameter typed `FileSystemDirectoryEntry` | âœ… | Line 34 |
| `onFilesDropped` awaits `collectFiles` | âœ… | Line 53 |
| Subdirectory files properly collected via `await` | âœ… | Line 51 |

---

### T4 â€” Fix serializeModel Matrix Round-Trip âœ… **PASS**

| Check | Result | Detail |
|-------|--------|--------|
| Matrix declarations serialized in frontmatter | âœ… | Lines 344-354 |
| Concept declarations serialized | âœ… | Lines 357-366 |
| Marker declarations serialized | âœ… | Lines 369-377 |
| Node markers (item-markers matrix) serialized | âœ… | Lines 436-456 |
| Round-trip test added | âœ… | Lines 117-151 of `index.test.ts` |

---

### T5 â€” Improve Type Safety Across format-core âš ï¸ **WARNING**

| Check | Result | Detail |
|-------|--------|--------|
| `parseYaml` returns `Record<string, unknown>` (not `any`) | âœ… | Line 57 |
| `parseYamlValue` returns `string \| number \| boolean \| null` (not `any`) | âœ… | Line 113 |
| resolver.ts: zero `as any` casts on `fm.parent` | âœ… | Lines 63-64 use `fm.parent?.name` / `fm.parent?.url` |
| driver-folder.ts: typed access instead of `as any` | âœ… | Lines 57-60 use `as string` / `as Record<string, unknown>` etc. |
| **Zero `any` type assertions remain in parser.ts** | âš ï¸ | Line 82 still has `const obj: any = {};` â€” internal variable |
| **`tsc --noEmit` passes with zero errors** | âŒ | **12 errors** (see compilation report) |

**Note**: The TypeScript errors stem from the union type `Record<string, unknown> | unknown[]` for the internal stack `data` field â€” TypeScript cannot narrow array-vs-object access without explicit type guards. Also, `parseYamlValue` line 116 returns an array literal but the return type union doesn't include arrays. These are deeper type safety issues than the design anticipated.

---

### T6 â€” Fix RecentFolders/History UX âœ… **PASS**

| Check | Result | Detail |
|-------|--------|--------|
| `addToHistory` deduplicates by `path` not `name` | âœ… | `history.filter(e => e.path !== path)` (line 17) |
| `removeFromHistory` uses `path` | âœ… | Line 23-25 |
| No `defineExpose` in `RecentFolders.vue` | âœ… | Not present |
| No `recentFoldersRef` in `App.vue` | âœ… | Not present; uses `historyKey` |
| `handleReopen(path)` logs the path | âœ… | Line 66: `console.log('Reopening folder:', path)` |
| `handleOpenExample(sample)` logs the path | âœ… | Line 72: `console.log('Opening sample:', sample.path)` |
| `historyKey` incremented after `addToHistory` | âœ… | Line 26: `historyKey.value++` |
| RecentFolders emits `reopen` with `entry.path` | âœ… | Line 40 |

---

### T7 â€” Extract useAppUrls Composable âœ… **PASS**

| Check | Result | Detail |
|-------|--------|--------|
| `composables/useAppUrls.ts` created | âœ… | Exists with `fileUrl()` and `folderUrl()` |
| `FolderExplorer.vue` imports `useAppUrls` | âœ… | Line 6 |
| `ResultCard.vue` imports `useAppUrls` | âœ… | Line 5 |
| No duplicate URL base definitions in components | âœ… | Both use `useAppUrls()` |

---

### T8 â€” Fix Dangling setTimeout in useToast âœ… **PASS**

| Check | Result | Detail |
|-------|--------|--------|
| Timeout IDs stored in `Map<number, ReturnType<typeof setTimeout>>` | âœ… | Line 12, set at line 19 |
| `clearTimeout` called on manual dismiss | âœ… | Lines 23-27 |
| `clearAll` clears timeout map | âœ… | Lines 32-35 |
| No memory leaks from timeouts Map | âœ… | Entries removed on dismiss |

---

### T9 â€” Optimize ValidationReport Computed Filters âš ï¸ **WARNING**

| Check | Result | Detail |
|-------|--------|--------|
| `checksByCategory` computed property | âœ… | Lines 25-32 |
| `passedCountByCategory` computed property | âœ… | Lines 34-42 |
| Zero `.filter()` calls in template | âœ… | Confirmed â€” no `.filter(c => c.category` found |
| Template uses `checksByCategory[cat.key]` | âœ… | Lines 81, 86 |
| Template uses `passedCountByCategory[cat.key]` | âœ… | Line 81 |

**Warning**: The `hasVisibleIssues` function (line 44) still uses `props.report.checks.some(c => c.category === cat.key && !c.passed)` â€” this iterates checks on every render. Could be optimized into a computed property (minor, not in scope of T9).

---

### T10 â€” Clean Up Dead Code âš ï¸ **WARNING**

| Check | Result | Detail |
|-------|--------|--------|
| `el.markers` validation loop removed from `validator.ts` | âœ… | Confirmed â€” no `el.markers` iteration (lines 73-74 are blank after removal) |
| Unused `Marker` import removed from `validator.ts` | âœ… | Not in imports (line 1-4) |
| `LauncherConfig` handled in `types.ts` | âš ï¸ | Kept with `/** @todo Connect to actual configuration store */` comment. Valid per spec (either remove OR document), but task suggested "remove or add `@unused`" â€” chosen option is acceptable. |

---

### T11 â€” Apply Minor Fixes âš ï¸ **WARNING**

| Check | Result | Detail |
|-------|--------|--------|
| DropZone button shows "Open folder" (not "Abrir carpeta") | âœ… | Line 59 |
| No dynamic `import('node:fs/promises')` in `driver-folder.ts` | âœ… | Zero matches. Static imports: `import { readFile, readdir, access }` (line 1) |
| `expect(rels.length).toBeGreaterThanOrEqual(0)` tautology fixed | âŒ | **Line 235 still has this assertion unchanged** â€” the fix was not applied. Comment says "Ghostbusters model has no wikilinks currently" |

---

## Issues Found

### TypeScript Compilation Failures (format-core) â€” 12 errors

These affect the `tsc --noEmit` compilation and would block strict CI pipelines:

1. **`driver-folder.ts:57-60`**: `fm` is typed `SpecFrontmatter | {}` after `?? {}`. `SpecFrontmatter` has `[key: string]: unknown` index signature but `{}` doesn't. Fix: use `?? ({} as Record<string, unknown>)` or narrow the type.

2. **`parser.ts:76-106`**: The internal stack typed `Record<string, unknown> | unknown[]` (union) cannot be indexed by string without narrowing. Fix: split into separate typed stacks for objects and arrays, or add runtime type guards.

3. **`parser.ts:116`**: `parseYamlValue` return type doesn't include array literal results (`[...]`). Fix: widen return type to include the array: `string | number | boolean | null | (string | number | boolean | null)[]`.

### TypeScript Compilation Failures (launcher) â€” 1 error

4. **`detector.ts:21`**: `entry` narrowed to `FileSystemEntry` after null check, but `collectDirectoryEntries` expects `FileSystemDirectoryEntry`. Fix: add explicit cast `as FileSystemDirectoryEntry` or add type guard.

### Test Weakness (not applied)

5. **`tests/index.test.ts:235`**: `expect(rels.length).toBeGreaterThanOrEqual(0)` remains a tautology. Fix was explicitly specified in T11c but not applied.

### Pre-existing Test Failures (3)

6. Ghostbusters model tests fail because `_F index:` taxonomy format is not supported by `parseIndexBlock`. These pre-date this change.

---

## File-by-File Change Summary

| File | Status | Notes |
|------|--------|-------|
| `models/FORMAT_V_0-1-1_business_FORMAT.md` | âœ… | Spec-compliant, no legacy syntax |
| `apps/launcher/vite.config.ts` | âœ… | Browser conditions, correct alias |
| `apps/launcher/src/utils/detector.ts` | âœ… **+âš ï¸** | Async fix correct; TS error at line 21 |
| `apps/launcher/src/App.vue` | âœ… | Handlers pass args, no recentFoldersRef |
| `apps/launcher/src/utils/history.ts` | âœ… | Dedup by path |
| `apps/launcher/src/components/RecentFolders.vue` | âœ… | No defineExpose |
| `apps/launcher/src/components/DropZone.vue` | âœ… | Locale fixed |
| `apps/launcher/src/composables/useAppUrls.ts` | âœ… | New composable |
| `apps/launcher/src/components/FolderExplorer.vue` | âœ… | Uses useAppUrls |
| `apps/launcher/src/components/ResultCard.vue` | âœ… | Uses useAppUrls |
| `apps/launcher/src/composables/useToast.ts` | âœ… | Timeout tracking |
| `apps/launcher/src/components/ValidationReport.vue` | âœ… | Computed filters |
| `apps/launcher/src/types.ts` | âš ï¸ | LauncherConfig kept with @todo |
| `packages/format-core/src/parser.ts` | âš ï¸ | Type fixes applied but tsc fails (12 errors) |
| `packages/format-core/src/resolver.ts` | âœ… | No as any casts |
| `packages/format-core/src/driver-folder.ts` | âš ï¸ | Type fixes applied but tsc fails |
| `packages/format-core/src/validator.ts` | âœ… | Dead code removed |
| `packages/format-core/tests/index.test.ts` | âš ï¸ | Tautology not fixed (line 235) |
