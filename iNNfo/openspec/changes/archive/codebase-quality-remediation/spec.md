# Spec: Codebase Quality Remediation

## Purpose

Fix 29 issues across FORMAT model violations, architecture bugs blocking browser builds, missing test coverage, and type safety / pattern issues. Pure remediation — no new capabilities or behavioral changes.

---

## HIGH PRIORITY — Critical Bugs and Crashes

### 1. Fix FORMAT Template/Model Violations

**Files**: `models/FORMAT_V_0-1-1_business_FORMAT.md`

**Current**: (a) Frontmatter contains `template:` block with inline `concepts`, `markers`, `matrices` — violates FORMAT §3 (Template Inline Restriction). (b) Frontmatter closes with `---` then body starts with `--->` — malformed YAML delimiter. (c) `specification_url` points to `business_V_0-1-1_FORMAT.md` (level 2) instead of `FORMAT_V_0-1-1_FORMAT.md` (level 1). (d) Body uses legacy `<!-- block: concepts -->` syntax instead of `# _F concepts:`.

**Expected**: Remove `template:` block entirely. Fix closing delimiter to `---`. Change `specification_url` to FORMAT level-1 URL. Migrate section headers to `# _F concepts:` syntax.

**Test**: `parseFrontmatter(content)` returns valid frontmatter without `template`. `parseModel(content)` identifies concepts via new `_F` syntax.

**Acceptance**: Model passes `validateModel()` against business template without frontmatter errors.

---

### 2. Fix Vite Browser Conditions

**File**: `apps/launcher/vite.config.ts`

**Current**: `resolve.conditions` not set; alias `'@': '/src'` is absolute OS root path (should be relative).

**Expected**: Add `resolve.conditions: ['browser']`; change alias to `'@': path.resolve(__dirname, 'src')` or `'@': fileURLToPath(new URL('./src', import.meta.url))`.

**Test**: `vite build` succeeds in browser mode. `import.meta.env` resolves correctly.

**Acceptance**: `vite build` and `vite dev` work without Node-only module crashes.

---

### 3. Fix collectDirectoryEntries Async

**File**: `apps/launcher/src/utils/detector.ts`

**Current**: `collectDirectoryEntries` is synchronous — returns `files[]` immediately without awaiting recursive `readEntries()` promises. Subdirectory files are lost.

**Expected**: Make function `async`. Properly await all nested `readEntries()` calls via Promise chain or recursive async. Also use `DetectionResult` type from `types.ts`.

**Test**: Upload a folder with subdirectories containing `_FORMAT.md` — all files appear.

**Acceptance**: `collectDirectoryEntries` returns files from all nesting levels.

---

### 4. Fix serializeModel Matrix Round-Trip

**File**: `packages/format-core/src/parser.ts`

**Current**: `serializeModel()` writes only body matrices (`model.matrices`) but does NOT serialize matrix declarations from `model.frontmatter.matrices`. Also does not serialize `model.nodeMarkers` (item-markers matrix). Round-trip loses metadata.

**Expected**: Serialize frontmatter `matrices` declarations AND `nodeMarkers`. Write `item-markers matrix` body when `nodeMarkers` is populated.

**Test**: `serializeModel(parseModel(content))` produces output where re-parsing gives identical `matrices` and `nodeMarkers`.

**Acceptance**: Full round-trip: parse → serialize → parse produces equivalent model data.

---

## MEDIUM PRIORITY — Type Safety, Cleanup, UX

### 5. Type Safety Improvements

**Files**: `packages/format-core/src/parser.ts`, `packages/format-core/src/resolver.ts`, `packages/format-core/src/driver-folder.ts`

**Current**: (a) `parseYaml()` and `parseYamlValue()` return `any`. (b) `resolver.ts` lines 63-64: `(fm.parent as any)`. (c) `driver-folder.ts` lines 59-62: `(fm as any).type/fields/markers/graph_edges`.

**Expected**: Replace `any` with proper return types (e.g., `Record<string, unknown>`, `SpecFrontmatter`). Remove unnecessary `as any` casts.

**Test**: No TypeScript errors in strict mode on changed functions.

**Acceptance**: Zero `any` assertions remain in changed files.

---

### 6. Fix RecentFolders/SampleFolders UX

**Files**: `apps/launcher/src/App.vue`, `apps/launcher/src/components/RecentFolders.vue`, `apps/launcher/src/utils/history.ts`

**Current**: (a) `handleReopen(name)` ignores `name` — always opens file picker. (b) `handleOpenExample(sample)` ignores `sample.path`. (c) `history.ts` deduplicates by `name` only — two folders with same name but different paths collide.

**Expected**: (a) `handleReopen` should use the path from history to trigger direct reopen. (b) `handleOpenExample` should open the sample's path programmatically. (c) Deduplicate by `path` (or `name+path`).

**Test**: Clicking a recent folder reopens it without file picker. Two folders with same name but different paths both appear.

**Acceptance**: Recent folder click restores the previous scan result. History entries with same name, different path coexist.

---

### 7. URL Deduplication

**Files**: `apps/launcher/src/components/FolderExplorer.vue`, `apps/launcher/src/components/ResultCard.vue`

**Current**: Both components independently define `baseFileUrl` / `baseFolderUrl` from env vars. Duplicated logic.

**Expected**: Extract `useAppUrls()` composable. Both components import and use it.

**Test**: Both components produce identical URLs from same env vars.

**Acceptance**: No duplicated URL construction logic across components.

---

### 8. UseToast Cleanup

**File**: `apps/launcher/src/composables/useToast.ts`

**Current**: `show()` creates `setTimeout(() => dismiss(id), 6000)` but does not store the timer ID. Manual `dismiss()` leaves the timeout active.

**Expected**: Store `setTimeout` return value in a `Map<number, number>`. Cancel the timer on manual `dismiss()`.

**Test**: Dismiss toast manually — timeout fires without error (idempotent filter).

**Acceptance**: No dangling setTimeout after manual dismiss.

---

### 9. ValidationReport Performance

**File**: `apps/launcher/src/components/ValidationReport.vue`

**Current**: Template calls `report.checks.filter(c => c.category === cat.key)` inline at lines 62 and 67 — runs the filter on every render.

**Expected**: Pre-compute filtered arrays in `computed()`. Use in template.

**Test**: Render report with 50+ checks — no visible lag.

**Acceptance**: Zero `.filter()` calls in template. Filters pre-computed in `script setup`.

---

### 10. Cleanup Dead Code

**Files**: `packages/format-core/src/validator.ts`, `apps/launcher/src/types.ts`

**Current**: (a) validator.ts iterates `el.markers` but this is dead — markers are in `model.nodeMarkers`, not element-level. (b) `types.ts` defines `DetectionResult` but no launcher code uses it (detector.ts uses `ScannedFolder`/`ScannedItem`).

**Expected**: (a) Remove stale `el.markers` validation loop. (b) Either use `DetectionResult` in detector/validator or add `@unused` doc comment.

**Test**: Existing validator tests still pass with removal. No regression.

**Acceptance**: No dead marker validation. `DetectionResult` is used or documented.

---

## LOW PRIORITY — Consistency

### 11. DropZone Locale Consistency

**File**: `apps/launcher/src/components/DropZone.vue`

**Current**: Button text "Abrir carpeta" (Spanish) in an otherwise English UI.

**Expected**: Change to "Open folder" for consistency, or extract to i18n if multi-locale is planned.

**Acceptance**: UI text is consistently English.

---

### 12. Dynamic Import Optimization

**File**: `packages/format-core/src/driver-folder.ts`

**Current**: Uses `await import('node:fs/promises')` at lines 13 and 24 instead of top-level import.

**Expected**: Move to top-level `import { readFile, readdir, access } from 'node:fs/promises'`.

**Test**: No behavior change — all tests pass.

**Acceptance**: No dynamic `import('node:fs/promises')` in driver-folder.ts.

---

### 13. Fix Weak Test Assertions

**File**: `packages/format-core/tests/index.test.ts`

**Current**: (a) `expect(rels.length).toBeGreaterThanOrEqual(0)` at line 199 — always passes. (b) Round-trip test at line 108-115 checks string contains instead of re-parsing and comparing.

**Expected**: (a) Assert `rels.length` is at least the expected minimum. (b) Re-parse serialized output and verify frontmatter + elements + matrices match original.

**Acceptance**: All test assertions are meaningful — no tautologies.

---

## Domain Summary

| Domain | Type | Items |
|--------|------|-------|
| FORMAT spec compliance | Fix | 1 file, 4 sub-issues |
| Vite build config | Fix | 1 file |
| Browser async bugs | Fix | 1 file (collectDirectoryEntries) |
| Serializer round-trip | Fix | 1 file (serializeModel) |
| Type safety (3 files) | Fix | 3 files, 5 cast sites |
| Vue UI patterns (5 files) | Fix | 5 components |
| Tests | Improve | 1 file, 2 assertions |
| Dead code | Remove | 2 files |

## Coverage

- **Happy paths**: All fixes have positive verification scenario
- **Edge cases**: History dedup (same name, different paths), serializeModel empty matrices, useToast timeout overlap
- **Error states**: Malformed YAML rejection, Vite browser crash recovery, async subdirectory loss

## Next Step

Ready for design (sdd-design).
