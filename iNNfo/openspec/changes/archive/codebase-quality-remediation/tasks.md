# Tasks: Codebase Quality Remediation

Fix 29 issues across the iNNfo monorepo. Pure remediation â€” no new capabilities.

**Delivery strategy**: single-pr-default (approval required if over budget)  
**Review budget**: 800 lines  
**Strict TDD**: enabled for format-core package  
**Launcher tests**: none required (no test infrastructure)

---

## Task Overview

| Task | Group | Title | Files | Est. Î” | Depends On | Status |
|------|-------|-------|-------|--------|------------|--------|
| T1 | G1 | Fix FORMAT model spec compliance | 1 | ~681 | None | âœ… |
| T2 | G2 | Fix Vite browser build config | 1 | ~5 | None | âœ… |
| T3 | G3 | Fix collectDirectoryEntries async bug | 2 | ~40 | None | âœ… |
| T4 | G4 | Fix serializeModel matrix round-trip | 1 | ~35 | None | âœ… |
| T5 | G5 | Improve type safety across format-core | 3 | ~15 | None | âœ… |
| T6 | G6 | Fix RecentFolders/History UX | 3 | ~15 | None | âœ… |
| T7 | G7 | Extract useAppUrls composable | 3 (1 new) | ~45 | None | âœ… |
| T8 | G8 | Fix dangling setTimeout in useToast | 1 | ~10 | None | âœ… |
| T9 | G9 | Optimize ValidationReport computed filters | 1 | ~15 | None | âœ… |
| T10 | G10 | Clean up dead code | 2 | ~10 | None | âœ… |
| T11 | G11 | Apply minor fixes (locale, imports, tests) | 3 | ~20 | T4 (shared test) | âœ… |
| | | **Total** | **~15 files** | **~891** | **11/11** | âœ… |

All tasks are independent. T11 shares a test file with T4 but doesn't block on it.

---

## âœ… T1 â€” Fix FORMAT Model Spec Compliance

**Group**: G1  
**Type**: data-fix  
**TDD**: not applicable (no code change)

### Files

| File | Change |
|------|--------|
| `models/FORMAT_V_0-1-1_business_FORMAT.md` | Remove inline template block, fix delimiter, fix URL, migrate 186 legacy markers |

### Description

Four sub-fixes on the level-3 business model file:

1. **Remove inline `template:` block** (lines 10â€“314, ~305 lines). The model carries a full `template:` block with concepts, markers, and matrix declarations. Per FORMAT Â§3, models must reference their template via `parent.name`/`parent.url` â€” not embed it inline. Delete the entire `template:` key and all nested data.

2. **Fix frontmatter closing delimiter** (line 317). Currently `---> [!NOTE]` â€” the YAML frontmatter must close with a bare `---` on its own line. The `> [!NOTE]` callout must be in the Markdown body after the closing delimiter. Change `---\n\n---> [!NOTE]` to `---\n\n> [!NOTE]`.

3. **Fix `specification_url`** (line 4). Currently points to `business_V_0-1-1_FORMAT.md` (level 2 template spec). For a level-3 model, it should point to the FORMAT level-1 spec: `https://raw.githubusercontent.com/cogNNitive/cogNNitive/v0.1.1/specs/FORMAT_V_0-1-1_FORMAT.md`.

4. **Migrate `<!-- block: -->` to `_F` hidden form** (186 occurrences). Replace all legacy block markers with the new `_F` hidden syntax:
   - `# <!-- block: concepts --> Name` â†’ `# <!-- _F --> Name` (50 heading-level)
   - `* <!-- block: ConceptName --> Element` â†’ `* <!-- _F ConceptName: --> Element` (136 element-level)

### Test Requirements

- **No new test code needed** â€” parser already handles both syntaxes (see `F_SECTION_RE`, `F_ELEMENT_HIDDEN_RE` in `parser.ts`)
- Run existing format-core tests:
  ```
  npx vitest run
  ```
  The Ghostbusters model (`Ghostbusters_V_0-1-1_business_FORMAT.md`) test suite must still pass (it's a different file).
- Verify: `parseFrontmatter(content)` returns valid frontmatter with `fm.template` as `undefined`
- Verify: Zero `<!-- block:` occurrences remain in the file (`rg '<!-- block:' models/FORMAT_V_0-1-1_business_FORMAT.md` â†’ 0 results)
- Verify: All `_F` markers use hidden form (`<!-- _F ... -->`)

### Implementation Notes

- This is a data-only change â€” find-and-replace operations on the model file
- Use a regex tool or manual edit to ensure correct migration of each marker type
- The `F_SECTION_RE` in `parser.ts` line 14 already matches `# <!-- block: concepts -->` so no parser changes are needed
- Keep the `@unused` or discard pattern for `F_ELEMENT_VISIBLE_RE` visible form â€” parser already supports both

### Estimated Lines Changed

| Operation | Count | Diff Lines |
|-----------|-------|------------|
| Delete template block (lines 10â€“314) | 305 deletions | 305 |
| Migrate heading markers | 50 modifications | 100 |
| Migrate element markers | 136 modifications | 272 |
| Fix `specification_url` | 1 modification | 2 |
| Fix closing delimiter | 1 modification | 2 |
| **Total** | **493 touched** | **~681** |

### Dependencies

None.

---

## T2 â€” Fix Vite Browser Build Config

**Group**: G2  
**Type**: config-fix  
**TDD**: not applicable (build config)

### Files

| File | Change |
|------|--------|
| `apps/launcher/vite.config.ts` | Add `resolve.conditions`, fix `@` alias path |

### Description

Two issues prevent browser builds:

1. **Missing `resolve.conditions`**: Without `['browser']`, Vite may resolve Node-only exports (like `node:fs/promises`) when bundling for the browser. Add `conditions: ['browser']` to the `resolve` block.

2. **Unresolved alias path**: `'@': '/src'` resolves from filesystem root (e.g., `C:\src` on Windows). Must use `path.resolve(__dirname, 'src')` so `@/` imports work regardless of working directory.

```diff
+import { resolve } from 'node:path'
+
 export default defineConfig({
   base: '/app/',
   plugins: [vue()],
   resolve: {
+    conditions: ['browser'],
     alias: {
-      '@': '/src',
+      '@': resolve(__dirname, 'src'),
     },
   },
 })
```

### Test Requirements

- `npx vite build` succeeds in `apps/launcher/` directory
- `npx vite dev` starts without module-resolution crashes
- `@/` imports resolve correctly (e.g., `@/utils/detector` â†’ `src/utils/detector.ts`)

### Estimated Lines Changed

~5 lines (1 import + 1 condition + 1 alias fix + other minor formatting).

### Dependencies

None. Though G3 (detector.ts async) benefits from correct browser conditions since `detector.ts` uses browser File System API types.

---

## T3 â€” Fix collectDirectoryEntries Async Bug

**Group**: G3  
**Type**: bugfix  
**TDD**: not applicable (launcher has no test infrastructure)

### Files

| File | Change |
|------|--------|
| `apps/launcher/src/utils/detector.ts` | Make `collectDirectoryEntries` async, add promise loop, type the entry parameter |
| `apps/launcher/src/App.vue` | Make `onFilesDropped` await `collectFiles` |

### Description

`collectDirectoryEntries` (detector.ts line 34) is synchronous but wraps an async callback API (`readEntries`). The recursive call `files.push(...collectDirectoryEntries(e))` fires without awaiting â€” subdirectory files are **silently lost**.

The File System API requires multiple `readEntries()` calls until `entries.length === 0` (batched reading). The current code only calls it once.

**Fix**: Rewrite `collectDirectoryEntries` as async with a do-while loop:

```ts
async function collectDirectoryEntries(entry: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = []
  const reader = entry.createReader()

  const readAllEntries = (): Promise<FileSystemEntry[]> => {
    return new Promise((resolve) => {
      reader.readEntries((entries) => resolve(entries as FileSystemEntry[]))
    })
  }

  let readEntries: FileSystemEntry[]
  do {
    readEntries = await readAllEntries()
    for (const e of readEntries) {
      if (e.isDirectory) {
        files.push(...await collectDirectoryEntries(e as FileSystemDirectoryEntry))
      } else if (e.isFile) {
        const file = await new Promise<File>((resolve) => (e as FileSystemFileEntry).file(resolve))
        files.push(file)
      }
    }
  } while (readEntries.length > 0)

  return files
}
```

Additional changes:
- Make `collectFiles` `async` and return `Promise<File[]>`
- Update `onFilesDropped` in `App.vue` to `await collectFiles(e.dataTransfer.items)`
- Type the `entry` parameter as `FileSystemDirectoryEntry` instead of `any`
- Add a max-iteration guard (e.g., 100 iterations) to prevent infinite loops

### Test Requirements

No automated tests (no launcher test infrastructure). Manual verification:
- Drag a folder with nested subdirectories (2+ levels deep) containing `_FORMAT.md` files
- Verify all files appear in the scan results
- Verify each `readEntries` batch is awaited (check by logging entry count)

### Estimated Lines Changed

~40 lines in `detector.ts` (rewrite the function), ~1 line in `App.vue`.

### Dependencies

None technically, but T2 (Vite conditions) ensures `detector.ts` compiles in browser context with File System API types.

---

## T4 â€” Fix serializeModel Matrix Round-Trip

**Group**: G4  
**Type**: bugfix  
**TDD**: required (tests with code)

### Files

| File | Change |
|------|--------|
| `packages/format-core/src/parser.ts` | Add matrix declarations + nodeMarkers + concepts/markers serialization |

### Description

`serializeModel` (parser.ts lines 328â€“400) serializes frontmatter, taxonomy, elements, and matrix body cells â€” but **skips matrix declarations** (`fm.matrices`), `nodeMarkers`, and optional metadata (`concepts`, `markers`). After `parse â†’ serialize â†’ re-parse`, the matrix source/target metadata is lost.

**Fix**: Add serialization of these missing fields in the frontmatter block:

1. **Matrix declarations** (`fm.matrices`): After the `mode` line, add:
   ```ts
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

2. **Concept declarations** (`fm.concepts`, for level-2 templates): Conditionally serialize if present.

3. **Marker declarations** (`fm.markers`, for level-2 templates): Conditionally serialize if present.

4. **`nodeMarkers`**: Serialize an `item-markers matrix` body section (as a Markdown table) when `model.nodeMarkers` has entries. This ensures the round-trip preserves marker assignments per element.

5. **`model_version`**: Already serialized at line 340 â€” verify it's present.

The serialization must:
- Match the format expected by `parseModel` so re-parsing produces identical data
- Handle empty arrays (skip if length 0)
- Use simple string serialization that matches the custom YAML parser in `parseYaml`

### Test Requirements

**New test** (add to `packages/format-core/tests/index.test.ts`):

Replace the current weak round-trip test (lines 108â€“115, which only checks string contains) with a proper deep-structure comparison:

```ts
it('serializes and re-parses preserving full structure', () => {
  const { serializeModel } = await import('../src/index');
  const serialized = serializeModel(model);
  const reparsed = parseModel(serialized);

  // Frontmatter
  expect(reparsed.frontmatter.title).toBe(model.frontmatter.title);
  expect(reparsed.frontmatter.level).toBe(model.frontmatter.level);
  expect(reparsed.frontmatter.mode).toBe(model.frontmatter.mode);
  expect(reparsed.frontmatter.model_version).toBe(model.frontmatter.model_version);

  // Matrix declarations (round-trip critical)
  expect(reparsed.matrices.length).toBe(model.matrices.length);
  if (model.matrices.length > 0) {
    expect(reparsed.matrices[0].name).toBe(model.matrices[0].name);
    expect(reparsed.matrices[0].source).toBe(model.matrices[0].source);
    expect(reparsed.matrices[0].cells.length).toBe(model.matrices[0].cells.length);
  }

  // Node markers
  expect(Object.keys(reparsed.nodeMarkers).length)
    .toBe(Object.keys(model.nodeMarkers).length);

  // Elements preserved
  expect(reparsed.elements.size).toBe(model.elements.size);
  for (const [key] of model.elements.entries()) {
    expect(reparsed.elements.has(key)).toBe(true);
    const origNodes = model.elements.get(key)!;
    const reparsedNodes = reparsed.elements.get(key)!;
    expect(reparsedNodes.length).toBe(origNodes.length);
  }

  // Taxonomy preserved
  expect(reparsed.taxonomy.length).toBe(model.taxonomy.length);
});
```

Also strengthen the tautology assertion at line 199: change `expect(rels.length).toBeGreaterThanOrEqual(0)` to `expect(rels.length).toBeGreaterThanOrEqual(1)` (or a realistic minimum).

### Estimated Lines Changed

| File | Additions | Î” |
|------|-----------|---|
| `packages/format-core/src/parser.ts` | ~25 lines (serialization logic) | ~25 |
| `packages/format-core/tests/index.test.ts` | ~10 lines (strengthened test, fix tautology) | ~10 |
| **Total** | | **~35** |

### Dependencies

None.

---

## T5 â€” Improve Type Safety Across format-core

**Group**: G5  
**Type**: refactor  
**TDD**: required (verify `tsc --noEmit` passes)

### Files

| File | Location | Current | Fix |
|------|----------|---------|-----|
| `packages/format-core/src/parser.ts` | Line 57: `parseYaml` return | `any` | `Record<string, unknown>` |
| `packages/format-core/src/parser.ts` | Line 113: `parseYamlValue` return | `any` | `string \| number \| boolean \| null` |
| `packages/format-core/src/parser.ts` | Internal stack data type | `any` | `Record<string, unknown> \| unknown[]` |
| `packages/format-core/src/resolver.ts` | Lines 63â€“64: `(fm.parent as any)` | `as any` cast | Remove cast (already typed as `ParentRef \| undefined`) |
| `packages/format-core/src/driver-folder.ts` | Lines 59â€“62: `(fm as any).type/fields/markers/graph_edges` | `as any` casts | Use typed access via index signature |

### Description

**parser.ts**: 
- `parseYaml` currently returns `any`. Change return type to `Record<string, unknown>`. The internal `root` variable and stack `data` fields must also use `Record<string, unknown>`. Callers like `parseFrontmatter` cast `as SpecFrontmatter` anyway â€” this just removes the `any` leak from the export boundary.
- `parseYamlValue` returns `any`. Change to union type `string | number | boolean | null`. Update internal usage accordingly.

**resolver.ts** (lines 63â€“64):
`fm.parent` is already typed as `ParentRef | undefined` by `SpecFrontmatter`. Casting to `any` hides type errors. Remove both `as any` casts â€” TypeScript will correctly narrow the optional chain:
```ts
parentName: fm.parent?.name,
parentUrl: fm.parent?.url,
```

**driver-folder.ts** (lines 59â€“62):
`fm` is typed as `SpecFrontmatter` (after `?? {}`), but `type`, `fields`, `markers`, `graph_edges` aren't explicit properties â€” they're accessed via the `[key: string]: unknown` index signature. Replace `as any` with typed access:
```ts
type: (fm?.type as string) || '',
fields: (fm?.fields as Record<string, unknown>) || {},
markers: (fm?.markers as Record<string, number | string>) || {},
graphEdges: (fm?.graph_edges as GraphEdge[]) || [],
```

### Test Requirements

- `npx tsc --noEmit` in `packages/format-core/` passes with zero errors
- Zero `any` type assertions remain in the three changed files
- All existing `vitest` tests pass (no behavioral change)
- The `as any` removals should not expose new type errors â€” fix root causes if they do

### Estimated Lines Changed

~15 lines across three files.

### Dependencies

None.

---

## T6 â€” Fix RecentFolders/History UX

**Group**: G6  
**Type**: bugfix  
**TDD**: not applicable (launcher)

### Files

| File | Change |
|------|--------|
| `apps/launcher/src/App.vue` | Fix `handleReopen`/`handleOpenExample` to use arguments; remove `recentFoldersRef` |
| `apps/launcher/src/components/RecentFolders.vue` | Remove `defineExpose({ refresh })` |
| `apps/launcher/src/utils/history.ts` | Change dedup key from `name` to `path` |

### Description

**App.vue handlers ignore arguments** (lines 63â€“68):
- `handleReopen(name)` ignores `name` and always clicks the file input. Change to emit the path data or pass it through to the folder flow. At minimum: log the name and pass it as context. The browser security model prevents programmatic folder opening, but the handler should not silently ignore its argument.
- `handleOpenExample(sample)` ignores `sample.path`. Same treatment.

**Remove `recentFoldersRef`** (lines 15, 25â€“26): The `defineExpose({ refresh })` + template ref pattern is fragile. Since `RecentFolders` already calls `refresh()` on `onMounted`, after adding to history just increment a `historyKey` ref in `App.vue` to force re-mount via `:key`:
```diff
+const historyKey = ref(0)
 // After addToHistory:
-historyKey.value++
```

**history.ts dedup by name** (line 17):
```diff
-const filtered = history.filter(e => e.name !== name)
+const filtered = history.filter(e => e.path !== path)
```

This prevents same-name-different-path collisions. Also update `removeFromHistory` (line 23) which also deduplicates by `name` â€” change to `path`.

### Test Requirements

- `addToHistory` with same `path`, different `name` â†’ deduplicates (keeps one)
- `addToHistory` with same `name`, different `path` â†’ keeps both entries
- Recent folders list updates after adding new entry (historyKey re-mounts component)
- Manual: clicking a recent folder triggers the handler with the correct name

### Estimated Lines Changed

~15 lines across three files.

### Dependencies

None.

---

## T7 â€” Extract useAppUrls Composable

**Group**: G7  
**Type**: refactor  
**TDD**: not applicable (launcher)

### Files

| File | Change |
|------|--------|
| `apps/launcher/src/composables/useAppUrls.ts` | **New** â€” create composable with `fileUrl` and `folderUrl` |
| `apps/launcher/src/components/FolderExplorer.vue` | Remove hardcoded URLs, import `useAppUrls` |
| `apps/launcher/src/components/ResultCard.vue` | Remove hardcoded URLs, import `useAppUrls` |

### Description

Both `FolderExplorer.vue` (lines 10â€“11) and `ResultCard.vue` (lines 10â€“11) independently define:
```ts
const baseFileUrl = import.meta.env.VITE_FILE_FORMAT_URL ?? 'http://localhost:5175'
const baseFolderUrl = import.meta.env.VITE_FOLDER_FORMAT_URL ?? 'http://localhost:5174'
```

Both also construct search-param URLs in their templates/computed properties.

**Extract** to `composables/useAppUrls.ts`:

```ts
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

**Update `FolderExplorer.vue`**: Remove lines 10â€“11, import `useAppUrls`, call `const { fileUrl, folderUrl } = useAppUrls()`, use `folderUrl(item.relativePath)` and `fileUrl(item.relativePath)` in `openApp()`.

**Update `ResultCard.vue`**: Remove lines 10â€“11 and the `fileFormatUrl`/`folderFormatUrl` computed props (lines 13â€“23), use `useAppUrls()` instead.

### Test Requirements

- Both components produce identical URLs before and after refactor
- `useAppUrls()` returns correct URLs with and without `VITE_` env vars

### Estimated Lines Changed

| File | Î” |
|------|---|
| `apps/launcher/src/composables/useAppUrls.ts` (new) | +18 lines |
| `apps/launcher/src/components/FolderExplorer.vue` | ~12 lines changed |
| `apps/launcher/src/components/ResultCard.vue` | ~15 lines changed |
| **Total** | **~45** |

### Dependencies

None.

---

## T8 â€” Fix Dangling setTimeout in useToast

**Group**: G8  
**Type**: bugfix  
**TDD**: not applicable (launcher)

### Files

| File | Change |
|------|--------|
| `apps/launcher/src/composables/useToast.ts` | Add timeout tracking with `Map`, cancel on manual dismiss |

### Description

`useToast.ts` creates a `setTimeout` for auto-dismiss (line 17) but never stores the timer ID. If the user calls `dismiss(id)` manually before the timeout fires, the timeout still runs â€” becomes a no-op since the toast was already removed, but wastes resources and can cause stale closure issues.

**Fix**:

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

Also add `clearAll` to clear timeouts (already exists for toasts, should also clear timer map).

### Test Requirements

- Manual: create a toast, manually dismiss before 6s â€” verify no phantom dismiss call
- Manual: let a toast auto-dismiss â€” verify it works normally
- No memory leaks from `timeouts` Map (entries removed on both manual and auto-dismiss)

### Estimated Lines Changed

~10 lines added/modified.

### Dependencies

None.

---

## T9 â€” Optimize ValidationReport Computed Filters

**Group**: G9  
**Type**: performance  
**TDD**: not applicable (launcher)

### Files

| File | Change |
|------|--------|
| `apps/launcher/src/components/ValidationReport.vue` | Add `checksByCategory` computed, replace inline `.filter()` calls |

### Description

The template calls `report.checks.filter(c => c.category === cat.key)` at lines 62 and 67 â€” running on **every render**. For reports with 50+ checks, this creates unnecessary work.

**Fix**: Add a computed property that groups checks once when `props.report.checks` changes:

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

Also compute `passedCountByCategory` to avoid the second filter:
```ts
const passedCountByCategory = computed(() => {
  const counts: Record<string, number> = {}
  for (const check of props.report.checks) {
    if (check.passed) {
      counts[check.category] = (counts[check.category] || 0) + 1
    }
  }
  return counts
})
```

**Template changes**:
- Line 62: `{{ report.checks.filter(c => c.category === cat.key && c.passed).length }}/{{ report.checks.filter(c => c.category === cat.key).length }}`
  â†’ `{{ passedCountByCategory[cat.key] ?? 0 }}/{{ checksByCategory[cat.key]?.length ?? 0 }}`
- Line 67: `v-for="check in report.checks.filter(c => c.category === cat.key)"`
  â†’ `v-for="check in checksByCategory[cat.key] || []"`

### Test Requirements

- All checks display correctly with accurate counts
- Expand/collapse behavior unchanged
- Debug: console.log the computed to verify it only re-evaluates when `props.report.checks` changes

### Estimated Lines Changed

~15 lines (computed + template changes).

### Dependencies

None.

---

## T10 â€” Clean Up Dead Code

**Group**: G10  
**Type**: cleanup  
**TDD**: required for validator.ts (no behavioral change)

### Files

| File | Change |
|------|--------|
| `packages/format-core/src/validator.ts` | Remove `el.markers` validation loop (lines 74â€“82) and unused `Marker` import |
| `apps/launcher/src/types.ts` | Remove unused `LauncherConfig` interface (lines 51â€“54) or add `@unused` doc comment |

### Description

**validator.ts (lines 74â€“82)**: The loop iterates `Object.entries(el.markers)` to check each marker against template markers. However, `el.markers` is always `{}` (empty) â€” elements are created with `markers: {}` in `parseConceptSection` (parser.ts line 205). Markers are populated separately via the `nodeMarkers` mechanism. Lines 97â€“107 already validate `nodeMarkers` against template markers. The `el.markers` loop is dead code.

Remove lines 74â€“82 and the unused `Marker` import from line 3.

**types.ts (lines 51â€“54)**: `LauncherConfig` is exported but never imported anywhere in the codebase. Either remove it entirely or add a `// @todo` comment documenting its intended use:
```ts
/** @todo Connect to actual configuration store */
export interface LauncherConfig {
  fileFormatUrl?: string
  folderFormatUrl?: string
}
```

### Test Requirements

- All existing `vitest` tests pass with `el.markers` loop removed
- `npx tsc --noEmit` passes (no breakage from removing the import)

### Estimated Lines Changed

~10 lines (removing ~9 lines from validator + ~4 lines from types or adding comment).

### Dependencies

None.

---

## T11 â€” Apply Minor Fixes

**Group**: G11  
**Type**: various  
**TDD**: required for index.test.ts; not applicable for launcher/vue changes

### Files

| File | Change |
|------|--------|
| `apps/launcher/src/components/DropZone.vue` | Line 59: `"Abrir carpeta"` â†’ `"Open folder"` |
| `packages/format-core/src/driver-folder.ts` | Replace dynamic `import('node:fs/promises')` with static imports |
| `packages/format-core/tests/index.test.ts` | Fix `expect(rels.length).toBeGreaterThanOrEqual(0)` tautology |

### Description

**11a â€” DropZone locale (1 line)**:
Line 59: Button text `"Abrir carpeta"` is Spanish in an otherwise English UI. Change to `"Open folder"`.

**11b â€” Static imports in driver-folder.ts**:
Lines 13 and 24 use `const fs = await import('node:fs/promises')` dynamically, but `node:fs/promises` is already partially imported at line 1 (`import { readFile } from 'node:fs/promises'`). Expand the static import to include all used functions and remove dynamic imports:

```diff
-import { readFile } from 'node:fs/promises';
+import { readFile, readdir, access } from 'node:fs/promises';
```

Then replace:
- Line 13: `const fs = await import('node:fs/promises');` â†’ remove
- Line 15: `const rootContent = await fs.readFile(formatMdPath, 'utf-8');` â†’ `readFile(formatMdPath, 'utf-8')`
- Line 24: `const fs = await import('node:fs/promises');` â†’ remove  
- Line 25: `const entries = await fs.readdir(currentPath, { withFileTypes: true });` â†’ `readdir(...)`
- Line 34: `await fs.access(formatMdPath);` â†’ `access(formatMdPath)`
- Line 39: `const content = await fs.readFile(formatMdPath, 'utf-8');` â†’ `readFile(...)`

**11c â€” Fix tautology assertion (index.test.ts line 199)**:
```diff
-expect(rels.length).toBeGreaterThanOrEqual(0);
+expect(rels.length).toBeGreaterThanOrEqual(1);  // Ghostbusters model has wikilink refs
```

Verify the Ghostbusters model actually produces at least 1 relationship. If it doesn't, use `expect(rels.length).toBeGreaterThanOrEqual(expectedMinimum)` with a realistic number determined by the existing test model.

### Test Requirements

- All `vitest` tests pass (behavioral equivalence)
- Verify no dynamic `import('node:fs/promises')` remains in `driver-folder.ts`
- Verify DropZone button shows "Open folder"

### Estimated Lines Changed

~20 lines (1 locale + ~15 static imports + ~4 test fix).

### Dependencies

Shares `index.test.ts` with T4 (round-trip test strengthening) â€” minor conflict risk if both add/modify the same test section. T4's changes are more complex (new test block), T11c is a single-line fix. Apply T11c after or alongside T4's test changes.

---

## Review Workload Forecast

### Total Estimated Changed Lines

| Group | Diff Lines | Notes |
|-------|------------|-------|
| G1 | ~681 | Template block removal (305 deletions) + 186 marker migrations + 2 edits |
| G2 | ~5 | Vite config |
| G3 | ~40 | Detector async + App.vue |
| G4 | ~35 | serializeModel + round-trip test |
| G5 | ~15 | Type safety |
| G6 | ~15 | Handler args + history dedup |
| G7 | ~45 | useAppUrls composable |
| G8 | ~10 | Toast timeout tracking |
| G9 | ~15 | Computed filters |
| G10 | ~10 | Dead code removal |
| G11 | ~20 | Locale, static imports, test fix |
| **Total** | **~891** | |

### Budget Risk Assessment

| Metric | Value |
|--------|-------|
| Review budget | **800 lines** |
| Estimated total | **~891 lines** |
| 400-line budget risk | **High** â€” exceeds 400 by 2.2x |
| 800-line budget risk | **Medium** â€” ~11% over budget |

### Chained PR Recommendation

**Recommended**: **Split into 2 PRs**

| PR | Groups | Est. Lines | Rationale |
|----|--------|------------|-----------|
| **PR1** | G1 | ~681 | FORMAT model file â€” pure data changes, highly mechanical, trivially reviewable |
| **PR2** | G2â€“G11 | ~210 | All code changes â€” types, async, UX, composables, cleanup |

**Alternative (single PR)**: Acceptable only with explicit approval for the over-budget diff. G1's 186 marker migrations are pure find-and-replace (low cognitive load), and the 305-line deletion is clearly correct. The effective "new logic" across G2â€“G11 is well under 400 lines.

### Decision Needed Before Apply

**Yes** â€” over the 800-line review budget. Choose:
1. **Approve single PR** (~891 lines, ~11% over budget, low cognitive load due to mechanical G1 changes)
2. **Split into 2 chained PRs** (PR1: G1 FORMAT model, PR2: G2â€“G11 code changes)

### Work Unit Commit Plan (if single PR approved)

| Commit | Work Unit | Files |
|--------|-----------|-------|
| 1 | `fix(format): remove inline template block and migrate _F markers` | `models/FORMAT_V_0-1-1_business_FORMAT.md` |
| 2 | `fix(launcher): add browser conditions and fix alias path` | `vite.config.ts` |
| 3 | `fix(launcher): make collectDirectoryEntries properly async` | `detector.ts`, `App.vue` |
| 4 | `fix(format-core): serialize matrix declarations for round-trip fidelity` | `parser.ts`, `index.test.ts` |
| 5 | `refactor(format-core): remove any types and unnecessary casts` | `parser.ts`, `resolver.ts`, `driver-folder.ts` |
| 6 | `fix(launcher): pass actual arguments in folder reopen handlers` | `App.vue`, `RecentFolders.vue`, `history.ts` |
| 7 | `refactor(launcher): extract useAppUrls composable` | `useAppUrls.ts`, `FolderExplorer.vue`, `ResultCard.vue` |
| 8 | `fix(launcher): cancel pending timeout on manual toast dismiss` | `useToast.ts` |
| 9 | `perf(launcher): pre-compute checks by category in ValidationReport` | `ValidationReport.vue` |
| 10 | `chore: remove dead marker validation and unused LauncherConfig` | `validator.ts`, `types.ts` |
| 11 | `chore: minor fixes (locale, static imports, weak assertions)` | `DropZone.vue`, `driver-folder.ts`, `index.test.ts` |

Each commit is independently reviewable, testable (where applicable), and rollback-safe.
