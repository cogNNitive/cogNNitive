# Design: Codebase Quality Remediation

Fix 29 issues across the iNNfo monorepo. Pure remediation â€” no new features, no architectural rewrites.

## Quick path

1. **Critical (FORMAT)** â€” Fix the level-3 model frontmatter: remove inline `template:` block, fix closing delimiter, update `specification_url` (1 file)
2. **High (Build + UX)** â€” Fix Vite config for browser builds, fix `collectDirectoryEntries` async, fix RecentFolders argument passing
3. **Medium (Quality + Types)** â€” Add matrix serialization, replace `any` types, extract shared composable, add tests
4. **Low (Cleanup)** â€” Cancel setTimeout on dismiss, computed filter, dead code removal, minor fixes

## Priority Order & Dependencies

| Order | Group | Depends On |
|-------|-------|-----------|
| 1 | G1: FORMAT Spec Fixes | None |
| 2 | G2: Vite Build Fix | None |
| 3 | G3: collectDirectoryEntries Async | G2 (same package) |
| 4 | G4: serializeModel Round-trip | None |
| 5 | G5: Type Safety | None |
| 6 | G6: RecentFolders/History UX | None |
| 7 | G7: useAppUrls Composable | None |
| 8 | G8: Toast Cleanup | None |
| 9 | G9: ValidationReport Performance | None |
| 10 | G10: Dead Code Cleanup | None |
| 11 | G11: Minor Fixes | None |

All groups are independent â€” no ordering constraints between them. Can be implemented and tested in any order.

---

## G1 â€” FORMAT Spec Fixes

### Approach

Edit the level-3 business model to conform to FORMAT Â§3 for models:

1. **Remove inline `template:` block**: Lines 10â€“314 of `models/FORMAT_V_0-1-1_business_FORMAT.md` contain a full `template:` block with concepts, markers, and matrices â€” this is level-2 data that belongs in the template spec (`specs/business_V_0-1-1_FORMAT.md`), not in the model. The model's parent template reference is already correct via `parent.name`/`parent.url`.

2. **Fix frontmatter closing delimiter**: Line 317 uses `---> [!NOTE]` as the closing delimiter, but YAML frontmatter must close with a bare `---` on its own line. The `> [!NOTE]` blockquote must be in the body, separated from the frontmatter.

3. **Fix `specification_url`**: Line 4 points to the business template spec (level 2). For a level-3 model it should point to the FORMAT spec (level 1) that defines the specification version.

4. **Migrate `<!-- block: -->` syntax to `_F` markers**: Replace all `<!-- block: concepts -->` with `_F`-style markers. Use the **hidden form** (`<!-- _F ...: -->`) for backward compatibility with other tools that might render the raw Markdown.

### Files Affected

| File | Lines | Change |
|------|-------|--------|
| `models/FORMAT_V_0-1-1_business_FORMAT.md` | 1â€“9 | Keep spec_version, model_version, level, parent, mode, title; remove `specification_url` value (update to FORMAT level-1 URL) |
| `models/FORMAT_V_0-1-1_business_FORMAT.md` | 10â€“314 | **Delete** entire `template:` block (inline concept/marker/matrix schema) |
| `models/FORMAT_V_0-1-1_business_FORMAT.md` | 315â€“317 | Replace `---\n\n---> [!NOTE]` with `---\n\n> [!NOTE]` |
| `models/FORMAT_V_0-1-1_business_FORMAT.md` | 320â€“1618 | Migrate all section markers and element markers |

### Syntax Migration Map

| Current | Target (hidden `_F` form) |
|---------|--------------------------|
| `# <!-- block: concepts --> ConceptName` | `# <!-- _F --> ConceptName` |
| `# <!-- block: matrices --> Name` | `# <!-- _F matrices: --> Name` |
| `* <!-- block: ConceptName --> Element` | `* <!-- _F ConceptName: --> Element` |

### Dependencies

None. This file is consumed by `format-core` parsing â€” tests should be run after changes to verify.

### Test Strategy

- Run existing format-core tests: `npx vitest run` â€” the Ghostbusters model test still parses correctly
- Manually parse the fixed file: run `parseModel()` and verify `frontmatter.template` is undefined

### Risks

| Risk | Mitigation |
|------|-----------|
| Removing `template:` breaks some downstream consumer | Check all consumers â€” the template data is level-2 info accessible via `resolveParentChain`, not from the model itself |
| Syntax migration misses some markers | Do a regex scan: count `<!-- block:` occurrences before/after and ensure zero remain |

### Acceptance

- [ ] `parseFrontmatter(content)` returns a valid result (no YAML parse error from `--->`)
- [ ] `fm.template` is `undefined` after parse
- [ ] `fm.specification_url` points to FORMAT level-1 spec (not business template)
- [ ] Zero instances of `<!-- block:` remain in file
- [ ] All `_F` markers use hidden form (`<!-- _F ... -->`)
- [ ] `parseModel()` produces same elements/matrices/taxonomy as before

---

## G2 â€” Vite Build Fix

### Approach

The Vite config for the launcher app has two issues that prevent browser builds:

1. **Missing `resolve.conditions`**: Without `['browser']`, Vite may resolve Node-only exports when bundling for the browser, causing runtime errors (e.g., `node:fs/promises`).

2. **Unresolved alias path**: `'@': '/src'` is a literal string path from filesystem root, not resolved relative to the project. Should use `path.resolve(__dirname, 'src')` so the `@` alias works regardless of the working directory.

### Files Affected

| File | Lines | Change |
|------|-------|--------|
| `apps/launcher/vite.config.ts` | 7â€“10 | Add `conditions: ['browser']` and fix alias path |

### Code Change

```ts
// Before
resolve: {
  alias: {
    '@': '/src',
  },
},

// After
resolve: {
  conditions: ['browser'],
  alias: {
    '@': path.resolve(__dirname, 'src'),
  },
},
```

Add `import { resolve } from 'node:path'` or `import path from 'node:path'` at top.

### Dependencies

None. This is a build configuration change only.

### Test Strategy

- Run `npx vite build` in `apps/launcher/` and verify it succeeds without module-resolution errors
- Run `npx vite build --mode=browser` for browser target
- Verify `@/` imports resolve correctly in built output

### Risks

| Risk | Mitigation |
|------|-----------|
| `resolve.conditions: ['browser']` breaks Node-mode builds | Vite uses conditions per target â€” only affects browser builds. Node mode uses `['node']` by default |

### Acceptance

- [ ] `vite build` succeeds in `apps/launcher/`
- [ ] No `node:fs/promises` or Node-only module errors in browser bundle
- [ ] `@/` alias resolves to `src/` directory

---

## G3 â€” `collectDirectoryEntries` Async Fix

### Approach

`collectDirectoryEntries` in `detector.ts` is a synchronous function that wraps an asynchronous callback API (`FileSystemEntry.createReader().readEntries()`). The recursive call for subdirectories is made without awaiting â€” `files.push(...collectDirectoryEntries(e))` fires the sub-reader but does NOT wait for its results.

Fix:
1. Make `collectDirectoryEntries` `async` and return `Promise<File[]>`
2. Properly await recursive calls
3. Convert the callback-based `readEntries` to a promise-based loop
4. Make `collectFiles` `async` since it calls `collectDirectoryEntries`
5. Update the caller in `App.vue` `onFilesDropped` to await the async call
6. Use `DetectionResult` type (or a typed return) instead of `any` for the entry parameter

The key fix is that the reader must be called repeatedly until `entries.length === 0` (the File System API requires multiple reads to get all entries), and each batch must be awaited.

### Files Affected

| File | Lines | Change |
|------|-------|--------|
| `apps/launcher/src/utils/detector.ts` | 14â€“31 | Make `collectFiles` async, await `collectDirectoryEntries` |
| `apps/launcher/src/utils/detector.ts` | 34â€“59 | Make `collectDirectoryEntries` async, add promise loop for readEntries, await recursive calls |
| `apps/launcher/src/utils/detector.ts` | 34 | Change parameter type from `entry: any` to `entry: FileSystemDirectoryEntry` |
| `apps/launcher/src/App.vue` | 51â€“57 | Update `onFilesDropped` to await `collectFiles` |

### Code Change (core logic)

```ts
async function collectDirectoryEntries(entry: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = []
  const reader = entry.createReader()

  const readAllEntries = (): Promise<FileSystemEntry[]> => {
    return new Promise((resolve) => {
      reader.readEntries((entries) => resolve(entries as FileSystemEntry[]))
    })
  }

  let entries: FileSystemEntry[]
  do {
    entries = await readAllEntries()
    for (const e of entries) {
      if (e.isDirectory) {
        files.push(...await collectDirectoryEntries(e as FileSystemDirectoryEntry))
      } else if (e.isFile) {
        const file = await new Promise<File>((resolve) => (e as FileSystemFileEntry).file(resolve))
        files.push(file)
      }
    }
  } while (entries.length > 0)

  return files
}
```

### Dependencies

G2 must be implemented first or in parallel â€” Vite needs `resolve.conditions: ['browser']` for `detector.ts` to compile in browser context.

### Test Strategy

- Add a unit test for `collectDirectoryEntries` with a mock `FileSystemDirectoryEntry`
- Test that the function resolves all entries (the File System API requires multiple `readEntries` calls)
- Test with a nested directory structure (subdirectories with files)

### Risks

| Risk | Mitigation |
|------|-----------|
| Infinite loop if `readEntries` never returns empty | Add a max-iteration guard (e.g., 100 iterations) |
| Drag-and-drop uses different API (`DataTransferItem`) vs file input (`FileList`) | Both paths now properly async â€” test both |

### Acceptance

- [ ] `collectDirectoryEntries` is `async` and returns `Promise<File[]>`
- [ ] Subdirectory files are properly collected (not missed)
- [ ] Multiple `readEntries` calls are handled (batch processing)
- [ ] `collectFiles` is `async` and awaits `collectDirectoryEntries`
- [ ] No `any` type for the directory entry parameter â€” uses `FileSystemDirectoryEntry`

---

## G4 â€” `serializeModel` Round-trip Fix

### Approach

`serializeModel` (`parser.ts` lines 460â€“532) serializes frontmatter + elements + taxonomy + matrix tables (body), but does NOT serialize matrix **declarations** (the `matrices:` array in frontmatter). This breaks round-trip: after `parse â†’ serialize â†’ re-parse`, the matrix declarations are lost, so matrix source/target metadata is missing and the validator can't match cells to declarations.

Fix: Add serialization of `fm.matrices` (and other missing metadata fields like `concepts`, `markers`) to the frontmatter output in `serializeModel`.

The frontmatter section should include:
- `specification_version`, `specification_url`, `level`
- `parent` (name + url)
- `model_version`, `title`, `mode`
- `matrices:` array (declarations with name, source, target, params)
- Only if present: `concepts:`, `markers:`

### Files Affected

| File | Lines | Change |
|------|-------|--------|
| `packages/format-core/src/parser.ts` | 460â€“532 | Add matrix declaration serialization in the frontmatter block |

### Code Change (in `serializeModel`)

```ts
// After mode line, add matrices declarations
if (fm.matrices && fm.matrices.length > 0) {
  lines.push('matrices:');
  for (const m of fm.matrices) {
    lines.push(`  - name: "${m.name}"`);
    lines.push(`    source: "${m.source}"`);
    lines.push(`    target: "${m.target}"`);
    lines.push(`    params: "${m.params}"`);
  }
}
```

Also serialize `concepts` and `markers` if present (for level-2 templates that may be serialized):

```ts
if (fm.concepts && fm.concepts.length > 0) {
  // serialize concept array
}
if (fm.markers && fm.markers.length > 0) {
  // serialize marker array
}
```

### Dependencies

None. Works independently.

### Test Strategy

- Add a round-trip test: `parseModel â†’ serializeModel â†’ parseModel` and assert deep equality of frontmatter, elements, taxonomy, matrices, and nodeMarkers
- Specifically test that matrix declarations survive the round-trip

### Risks

| Risk | Mitigation |
|------|-----------|
| YAML serialization uses custom parser, may produce invalid YAML for edge cases | Use simple string serialization that matches the custom parser's expectations â€” avoid `JSON.stringify` for objects |
| Very large concept arrays inflate the file | These only apply to templates (level 2), not models (level 3) â€” acceptable size |

### Acceptance

- [ ] `parseModel(serializeModel(model))` produces equal matrices (same declarations, same cells)
- [ ] Round-trip preserves frontmatter fields: title, mode, level, parent, specification_version
- [ ] Round-trip preserves taxonomy edges
- [ ] Round-trip preserves element nodes (names, descriptions, fields)
- [ ] Round-trip preserves nodeMarkers

---

## G5 â€” Type Safety Improvements

### Approach

Three areas of type unsafety:

**1. `parser.ts` â€” Replace `any` returns**

| Location | Current | Fix |
|----------|---------|-----|
| `parseYaml(line 57)` | returns `any` | Return `Record<string, unknown>` |
| `parseYamlValue(line 245)` | returns `any` | Return `string \| number \| boolean \| null` (union type) |
| `parseFrontmatter(line 263)` | casts with `as SpecFrontmatter` | Already typed â€” just ensure `parseYaml` returns compatible type |
| `parseFencedYaml(line 309)` | returns `Record<string, unknown>` | Already correct |
| Internal stack in `parseYaml` | Uses `any` for `data` | Use `Record<string, unknown> \| unknown[]` |

**2. `resolver.ts` â€” Remove `(fm.parent as any)`**

Lines 63â€“64:
```ts
parentName: (fm.parent as any)?.name,
parentUrl: (fm.parent as any)?.url,
```
`fm.parent` is already typed as `ParentRef | undefined` by `SpecFrontmatter`. The `as any` cast is unnecessary and hides type errors. Remove the cast â€” TypeScript will correctly narrow the type.

**3. `driver-folder.ts` â€” Type-safe access to fm properties**

Lines 59â€“62:
```ts
type: (fm as any).type || '',
fields: (fm as any).fields || {},
markers: (fm as any).markers || {},
graphEdges: (fm as any).graph_edges || [],
```
`parseFrontmatter` returns `SpecFrontmatter | null` (lines 19, 40). After `?? {}` the type is already `SpecFrontmatter` with optional fields. Access these via proper optional chaining instead of `as any`:
```ts
type: fm?.type || '',
fields: fm?.fields || {},
```
But `type`, `fields`, `markers`, `graph_edges` are not typed on `SpecFrontmatter` â€” the `folderDriver` model uses a different schema than the standard FORMAT frontmatter. These should be added to the `SpecFrontmatter` interface or accessed via index signature. Since `SpecFrontmatter` already has `[key: string]: unknown`, the fix is:
```ts
type: (fm?.type as string) || '',
```

### Files Affected

| File | Lines | Change |
|------|-------|--------|
| `packages/format-core/src/parser.ts` | 57â€“128 | Type `parseYaml` return to `Record<string, unknown>` |
| `packages/format-core/src/parser.ts` | 245â€“258 | Type `parseYamlValue` return to union type |
| `packages/format-core/src/parser.ts` | 306â€“309 | Already typed, verify |
| `packages/format-core/src/resolver.ts` | 63â€“64 | Remove `as any` casts on `fm.parent` |
| `packages/format-core/src/driver-folder.ts` | 59â€“62 | Replace `as any` with typed access |

### Dependencies

None. Independent type changes.

### Test Strategy

- TypeScript compilation must pass with no new errors (`npx tsc --noEmit`)
- Existing tests must pass (no behavioral changes)
- The `as any` removals may expose genuine type mismatches â€” fix them rather than adding casts

### Risks

| Risk | Mitigation |
|------|-----------|
| Removing `as any` exposes deep type issues | Fix the root cause at each location rather than re-adding casts |
| `parseYaml` recursive structure makes exact typing hard | Use `unknown` and narrow with type guards at call sites |

### Acceptance

- [ ] Zero `any` type assertions remain in `parser.ts`
- [ ] Zero `as any` casts remain in `resolver.ts`
- [ ] Zero `as any` casts remain in `driver-folder.ts`
- [ ] `tsc --noEmit` passes with zero errors
- [ ] All existing tests pass

---

## G6 â€” RecentFolders/History UX Fix

### Approach

**1. `App.vue` handlers ignore their arguments**

`handleReopen(name)` and `handleOpenExample(sample)` both just click the hidden file input, ignoring the path data. This means clicking a recent folder or sample never opens that specific folder â€” it just re-opens the file picker.

Fix: The handlers should pass the `name`/`sample` data through to the folder-opening flow. Since the current architecture uses a file input (`webkitdirectory`), the simplest fix is to use the `path` from history/samples to programmatically open the folder. However, browsers don't allow setting `input.files` programmatically. The real fix requires:
- Storing the path and using it to display info
- Or, for RecentFolders, re-opening from a cached path using the File System Access API (out of scope)

**Minimal fix** for this remediation: Change the handlers to emit events that pass the actual argument, and use it for UI feedback (even if the actual file picking still goes through the input). At minimum, don't ignore the argument â€” log it or use it to update state.

**2. `RecentFolders.vue` `defineExpose`**

`defineExpose({ refresh })` (line 28) exposes `refresh` to the parent. The parent accesses it via `recentFoldersRef.value?.refresh()`. This is a valid pattern but the `defineExpose` call is unnecessary if the `refresh` function is called internally (on mount). The exposed `refresh` is only used after `addToHistory` in `App.vue` â€” this could be refactored to emit an event instead, or keep `defineExpose` but document it.

**Minimal fix**: Remove `defineExpose` and have `App.vue` re-mount the component or use a `key` to force refresh. OR keep it but document why.

Actually, the better approach: Remove the `recentFoldersRef` and `defineExpose` pattern, and have `RecentFolders` re-fetch on `onMounted` (which it already does). After adding to history, just increment a `historyKey` in `App.vue` to force re-mount.

Even simpler: make `onMounted` observe an event or use a `watch` on a prop.

**3. `history.ts` â€” Deduplicate by path**

```ts
const filtered = history.filter(e => e.name !== name)
```
This filters by `name`, but two different folders could have the same name at different paths. Should filter by `path`:
```ts
const filtered = history.filter(e => e.path !== path)
```

### Files Affected

| File | Lines | Change |
|------|-------|--------|
| `apps/launcher/src/utils/history.ts` | 17 | Change `e.name !== name` to `e.path !== path` |
| `apps/launcher/src/App.vue` | 63â€“69 | Fix handler signatures to pass actual argument, remove `recentFoldersRef` |
| `apps/launcher/src/App.vue` | 15 | Remove `recentFoldersRef` ref |
| `apps/launcher/src/App.vue` | 26 | Remove `recentFoldersRef.value?.refresh()` call |
| `apps/launcher/src/components/RecentFolders.vue` | 28 | Remove `defineExpose({ refresh })` |

### Dependencies

None. Independent.

### Test Strategy

- Test `addToHistory` with same path, different names: should deduplicate
- Test `addToHistory` with same name, different paths: should keep both
- Verify RecentFolders list updates after adding new entry

### Risks

None â€” small, well-scoped changes.

### Acceptance

- [ ] `addToHistory` deduplicates by `path`, not `name`
- [ ] No `defineExpose` in `RecentFolders.vue`
- [ ] No `recentFoldersRef` in `App.vue`
- [ ] Event handlers in `App.vue` don't silently ignore their arguments

---

## G7 â€” `useAppUrls` Composable

### Approach

Extract duplicate URL construction logic from `FolderExplorer.vue` and `ResultCard.vue` into a shared composable.

Both components define:
```ts
const baseFileUrl = import.meta.env.VITE_FILE_FORMAT_URL ?? 'http://localhost:5175'
const baseFolderUrl = import.meta.env.VITE_FOLDER_FORMAT_URL ?? 'http://localhost:5174'
```

And both construct search-param URLs. Extract to a composable:
```ts
// apps/launcher/src/composables/useAppUrls.ts
export function useAppUrls() {
  const baseFileUrl = import.meta.env.VITE_FILE_FORMAT_URL ?? 'http://localhost:5175'
  const baseFolderUrl = import.meta.env.VITE_FOLDER_FORMAT_URL ?? 'http://localhost:5174'

  function fileUrl(fileName: string): string {
    const url = new URL(baseFileUrl)
    url.searchParams.set('file', fileName)
    return url.toString()
  }

  function folderUrl(folderName: string): string {
    const url = new URL(baseFolderUrl)
    url.searchParams.set('folder', folderName)
    return url.toString()
  }

  return { fileUrl, folderUrl }
}
```

### Files Affected

| File | Lines | Change |
|------|-------|--------|
| `apps/launcher/src/composables/useAppUrls.ts` | New | Create composable with `fileUrl` and `folderUrl` functions |
| `apps/launcher/src/components/FolderExplorer.vue` | 10â€“11, 17â€“25 | Remove hardcoded URLs, use `useAppUrls()` |
| `apps/launcher/src/components/ResultCard.vue` | 10â€“11, 13â€“23 | Remove hardcoded URLs, use `useAppUrls()` |

### Dependencies

None. New file, no existing code depends on it.

### Test Strategy

- Manual: both components should generate identical URLs before and after refactor
- Unit test: `useAppUrls()` returns correct URLs with and without VITE_ env vars

### Risks

Low. Pure extraction, no logic change.

### Acceptance

- [ ] `useAppUrls.ts` exists and exports `fileUrl(fn)` and `folderUrl(fn)`
- [ ] `FolderExplorer.vue` imports from `useAppUrls`
- [ ] `ResultCard.vue` imports from `useAppUrls`
- [ ] No duplicate URL base definitions remain in the two components
- [ ] URL output is identical to before

---

## G8 â€” Toast Cleanup

### Approach

`useToast.ts` creates a `setTimeout` for auto-dismiss but never cancels it on manual dismiss. If the user calls `dismiss(id)` manually, the pending timeout still fires (and becomes a no-op since the toast was already removed).

Fix: Store timeout IDs in a `Map<number, ReturnType<typeof setTimeout>>` and clear them on manual dismiss.

### Files Affected

| File | Lines | Change |
|------|-------|--------|
| `apps/launcher/src/composables/useToast.ts` | 14â€“17 | Store timeout ID in map |
| `apps/launcher/src/composables/useToast.ts` | 20â€“22 | Clear timeout on manual dismiss |

### Code Change

```ts
const timeouts = new Map<number, ReturnType<typeof setTimeout>>()

function show(message: string, type: Toast['type'] = 'warning') {
  const id = nextId++
  toasts.value.push({ id, message, type })
  const timer = setTimeout(() => dismiss(id), TOAST_DURATION)
  timeouts.set(id, timer)
}

function dismiss(id: number) {
  const timer = timeouts.get(id)
  if (timer) {
    clearTimeout(timer)
    timeouts.delete(id)
  }
  toasts.value = toasts.value.filter(t => t.id !== id)
}
```

### Dependencies

None.

### Test Strategy

- Create a toast, manually dismiss before timeout â€” verify the timeout doesn't fire
- Create a toast, let it auto-dismiss â€” verify timeout fires once
- No memory leaks in timeouts Map

### Risks

None.

### Acceptance

- [ ] `clearTimeout` is called on manual dismiss
- [ ] No phantom `dismiss` calls after manual dismiss
- [ ] Timeout map is properly cleaned up

---

## G9 â€” ValidationReport Performance

### Approach

The template in `ValidationReport.vue` calls `report.checks.filter(...)` inline, which runs the filter on every render. For validation reports with many checks (50+), this creates unnecessary work.

Fix: Extract `checksByCategory` as a computed property that groups checks by category, and use it in the template.

### Files Affected

| File | Lines | Change |
|------|-------|--------|
| `apps/launcher/src/components/ValidationReport.vue` | 57â€“75 | Replace inline `.filter()` calls with computed property |

### Code Change

```ts
const checksByCategory = computed(() => {
  const grouped: Record<string, ValidationCheck[]> = {}
  for (const check of props.report.checks) {
    if (!grouped[check.category]) grouped[check.category] = []
    grouped[check.category].push(check)
  }
  return grouped
})
```

In template:
```vue
<div v-for="cat in categories" :key="cat.key">
  <button ...>
    <span class="category__count">
      {{ categoryPassed[cat.key] }}/{{ checksByCategory[cat.key]?.length ?? 0 }}
    </span>
  </button>
  <div v-if="!collapsed[cat.key]" class="category__body">
    <div v-for="check in checksByCategory[cat.key] || []" :key="check.id" ...>
```

### Dependencies

None.

### Test Strategy

- Functional: all checks display correctly, counts match
- Performance: computed property only re-evaluates when `props.report.checks` changes

### Risks

None â€” pure optimization, no behavioral change.

### Acceptance

- [ ] No inline `.filter()` calls in the template
- [ ] Checks are grouped by category via computed property
- [ ] Counts are accurate
- [ ] Expand/collapse behavior unchanged

---

## G10 â€” Dead Code Cleanup

### Approach

**1. `validator.ts` â€” `el.markers` dead code**

In `parseConceptSection` (parser.ts), element nodes are created with `markers: {}` (empty). Markers are populated separately via the `nodeMarkers` mechanism (item-markers matrix) in `parseModel`. The loop at validator.ts lines 74â€“82 that checks `el.markers` against template markers iterates over an always-empty object â€” this is dead code.

Fix: Remove the `el.markers` validation loop (lines 74â€“82). The `nodeMarkers` validation at lines 97â€“107 already handles marker validation for item-markers matrix entries.

**2. `types.ts` â€” `LauncherConfig` unused**

`LauncherConfig` is exported but never imported anywhere in the codebase. Either remove it (if truly unused) or add a `@todo` comment documenting its intended use.

### Files Affected

| File | Lines | Change |
|------|-------|--------|
| `packages/format-core/src/validator.ts` | 74â€“82 | Remove `el.markers` validation loop |
| `packages/format-core/src/validator.ts` | 1â€“4 | Remove unused `Marker` import |
| `apps/launcher/src/types.ts` | 51â€“54 | Remove `LauncherConfig` or add doc comment |

### Dependencies

None.

### Test Strategy

- All validator tests still pass (the removed loop never caught anything since markers were always empty)
- TypeScript compilation still passes

### Risks

| Risk | Mitigation |
|------|-----------|
| If `el.markers` is populated in the future, removal would miss validation | The `nodeMarkers` check at lines 97â€“107 already covers markers set via the item-markers matrix. If element-level markers are added later, the validation should be added back |

### Acceptance

- [ ] `el.markers` validation loop removed from `validator.ts`
- [ ] No unused `Marker` import in `validator.ts`
- [ ] `LauncherConfig` either removed or documented with `@todo`

---

## G11 â€” Minor Fixes

### 11a â€” DropZone locale inconsistency

`DropZone.vue` line 59: button label is "Abrir carpeta" (Spanish) while the rest of the UI is in English. Change to "Open folder".

**File**: `apps/launcher/src/components/DropZone.vue`, line 59

### 11b â€” Move dynamic `import('node:fs/promises')` to static import

`driver-folder.ts` lines 13 and 24 use `await import('node:fs/promises')` dynamically, but `node:fs/promises` is already imported statically at line 1. Replace the dynamic import with the already-imported top-level `readFile` and `access` functions.

Wait â€” the dynamic import is used for `fs.readdir`, `fs.readFile`, `fs.access` â€” but line 1 only imports `readFile`. The dynamic import gets all exports. Fix: expand the static import to include `readdir`, `access`, `readFile` and remove the dynamic imports.

**File**: `packages/format-core/src/driver-folder.ts`, lines 1, 13, 24

```ts
// Before:
import { readFile } from 'node:fs/promises';
// ...
const fs = await import('node:fs/promises');
const rootContent = await fs.readFile(formatMdPath, 'utf-8');

// After:
import { readFile, readdir, access } from 'node:fs/promises';
// ...
const rootContent = await readFile(formatMdPath, 'utf-8');
```

### 11c â€” Weak test assertions in `index.test.ts`

The serialize/parse test at lines 108â€“115 checks string containment but doesn't perform a full round-trip parse. Strengthen by:
1. Re-parsing the serialized output and comparing with the original model
2. Deep-equality check on key structures: elements, matrices, taxonomy

**File**: `packages/format-core/tests/index.test.ts`, lines 108â€“115

```ts
it('serializes and re-parses correctly', () => {
  const serialized = serializeModel(model);
  const reparsed = parseModel(serialized);
  
  // Frontmatter
  expect(reparsed.frontmatter.title).toBe(model.frontmatter.title);
  expect(reparsed.frontmatter.level).toBe(model.frontmatter.level);
  expect(reparsed.frontmatter.mode).toBe(model.frontmatter.mode);
  
  // Matrices (round-trip critical)
  expect(reparsed.matrices.length).toBe(model.matrices.length);
  if (model.matrices.length > 0) {
    expect(reparsed.matrices[0].name).toBe(model.matrices[0].name);
    expect(reparsed.matrices[0].cells.length).toBe(model.matrices[0].cells.length);
  }
  
  // Elements
  expect(reparsed.elements.size).toBe(model.elements.size);
  
  // Taxonomy
  expect(reparsed.taxonomy.length).toBe(model.taxonomy.length);
});
```

### Files Affected

| File | Lines | Change |
|------|-------|--------|
| `apps/launcher/src/components/DropZone.vue` | 59 | `"Abrir carpeta"` â†’ `"Open folder"` |
| `packages/format-core/src/driver-folder.ts` | 1, 13, 24 | Static import, remove dynamic imports |
| `packages/format-core/tests/index.test.ts` | 108â€“115 | Strengthen round-trip assertion |

### Dependencies

None.

### Test Strategy

- All existing tests pass
- DropZone button shows English text
- No dynamic imports remain in `driver-folder.ts`
- Round-trip test actually validates re-parsed output

### Acceptance

- [ ] DropZone button shows "Open folder"
- [ ] `driver-folder.ts` has no dynamic `import('node:fs/promises')`
- [ ] Round-trip test re-parses serialized output and compares with original

---

## Rollout Plan

### Phase 1 â€” FORMAT + Build (Groups 1â€“2)
Critical: must-do before any app changes. Validates that the core format and build tooling are correct.

### Phase 2 â€” Async + Types + Tests (Groups 3â€“5)
High impact: fixes broken browser UX and adds safety.

### Phase 3 â€” UX + Composables (Groups 6â€“9)
Medium impact: user-facing fixes and code quality improvements.

### Phase 4 â€” Cleanup (Groups 10â€“11)
Low impact: dead code, minor fixes, test hardening.

Implementation can be in any order due to zero cross-group dependencies.

## Total Effort Estimate

| Group | Estimated Changes (files) | Estimated Effort |
|-------|--------------------------|-----------------|
| G1 | 1 file, ~1600 lines edited | 20â€“30 min |
| G2 | 1 file, ~5 lines changed | 5 min |
| G3 | 2 files, ~40 lines changed | 15â€“20 min |
| G4 | 1 file, ~20 lines added | 10â€“15 min |
| G5 | 3 files, ~20 lines changed | 10â€“15 min |
| G6 | 3 files, ~15 lines changed | 10 min |
| G7 | 3 files (1 new), ~40 lines | 10â€“15 min |
| G8 | 1 file, ~10 lines changed | 5 min |
| G9 | 1 file, ~15 lines changed | 5â€“10 min |
| G10 | 2 files, ~15 lines changed | 5 min |
| G11 | 3 files, ~20 lines changed | 10 min |
| **Total** | **~15 files** | **~2 hours** |
