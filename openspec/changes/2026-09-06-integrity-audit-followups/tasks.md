# Tasks: Integrity Audit Follow-ups (2026-09-06)

Source: deferred backlog of `2026-09-06-integrity-audit-fixes` (17 findings).
Chain: stacked to `main`, safest first (security jumps the queue).
TDD strict for every `innfo-core` / `innfo-mcp` item — failing test in the same PR.

Per-PR gate: `node scripts/verify.js` + `npm --prefix iNNfo test` green;
editor PRs also `npm --prefix iNNfo/apps/innfo-editor run build`.

---

## Wave 1 — innfo-mcp + scripts

### PR1 · M5 — `sources::` path traversal (SECURITY) — merged in `0702b2d` (#51)
- [x] Test: model citing `../x.md`, `/etc/hosts`, `..\\..\\x` → source unresolved, no `readFileSync` on the outside path (fs spy)
- [x] Test: `models/Other_NN.md#h` and `sub/dir/note.md#h` still resolve
- [x] `validate.ts` `resolveSource` — `resolve()` + `relative()` containment check against `rootDir`
- [x] Security note in the PR body; request explicit review

### PR2 · M7 + M8 — guard laxness — merged in `0702b2d` (#51)
- [x] Test (`check-parity.test.js`): body-only `V_x-y-z` (in a `parent_spec` URL) → no spurious mismatch
- [x] `check-parity.js:92` — drop the body-wide `V_` scan; version from frontmatter or filename only
- [x] Test: unregistered `specs/templates/<name>/` whose name equals a skill/mcp/workflow `name:` → `verify.js` fails
- [x] `verify.js:56` — slice `source.yaml` to the `templates:` block before the `- name:` scan

### PR3 · M3 — `crc32` runtime floor — merged in `0702b2d` (#51)
- [x] `package.json` `engines.node` → `">=20.15"`
- [x] `spec-backup.ts` `buildZipArchive` — guard `typeof crc32 !== 'function'` with a clear message
- [x] Test: guard message thrown when `crc32` is stubbed `undefined`

### PR4 · M4 — workspace recursion ignore list — merged in `0702b2d` (#51)
- [x] Test (`validate.ts` spec): `node_modules/*.md` in the workspace is not parsed / not in diagnostics
- [x] Hoist the `:74-75` ignore set to a module constant
- [x] `createNodeDirectoryHandle` — optional `ignore: Set<string>`; generator skips `ignore.has(name)`
- [x] `runWorkspaceValidation` (`:223`) passes the ignore set

### PR5 · M1 — frontmatter injection in `init_model` — merged in `0702b2d` (#51)
- [x] Test: `init_model({ title: 'The "Real" Deal' })` and `title: 'a\nb'` → written frontmatter round-trips
- [x] Test: invalid template → no file written
- [x] `init-model.ts` — YAML-safe frontmatter emit (yaml serializer / escape helper)
- [x] Validate the rendered doc before the write; on failure return diagnostics, touch no disk (or `.tmp` + `rename`)

---

## Wave 2 — innfo-core

### PR6 · C1 — UTF-8 BOM strips frontmatter
- [x] Tests (`tests/bom.test.ts`): `parseModel`, `validateFormatContent`, `normalizeSingleModel`, `recursiveParse` — BOM input == no-BOM input
- [x] `normalizeSource` — strip leading `﻿`
- [x] Route `validator/content.ts` and `recursiveParser/workspace.ts` frontmatter strips through `normalizeSource` / a shared `stripFrontmatter` (folds in REFACTOR #13)
- [x] Full `innfo-core` suite green

### PR7 · C6 — GFM table delimiters optional — merged in `8bd06c5` (#61)
- [x] Tests: `| a | b |`, `a | b`, `| a | b`, `a | b |` → identical cells; separator row recognised in every shape
- [x] `parseMarkdownTable:16` — accept a row if it contains an unescaped `|`
- [x] `parseTableRow:30` — drop leading/trailing empty segment only when the line had that delimiter

### PR8 · C4 — element-prose bullet lines
- [x] Tests: element body `- one / - two` → `description` keeps both; `parseModel(serializeModel(m))` stable; a `key:: value` after the header is still a field
- [x] `sections.ts:164` — exclude a line from the description only if it is a field / `## NN` header / `# NN index` bullet, not for any `-`/`*`
- [x] Full suite green; `rawSections` / `text`-concept path unaffected

### PR9 · C3 — schema-aware `rename_element`
- [x] Test (`rename-propagation.test.ts`): `Cost`→`Expense` rewrites `parent_cost:: [[Cost]]`, leaves `category:: cost`; no-schema model → only `[[...]]`/index/matrix refs rewritten
- [x] Plumb the resolved template schema into `renameElement` (wire `resolveTemplateSchema` for this path if missing)
- [x] `updateReferenceString` string-field pass gated on `type: 'reference'`; WikiLink/matrix/index refs unchanged

---

## Wave 3 — innfo-editor

### PR10 · E1 + E2 — matrix cell identity
- [x] Test (`useMatrixCells.test.ts`): two `Review` nodes under different parents → two independent cells; row name with `::` → distribution count == rendered cells
- [x] `MatricesGrid.vue` — rows/columns carry `{ id, name }`; cell key uses stable id
- [x] `useMatrixCells.ts` `valueDistribution` — use `matrixCellKey()` exactly as get/set
- [x] Confirm on-disk `row||col` key format unchanged (display name still serialized)

### PR11 · E3 + E4 + E5 + E6 — graph lifecycle & blobs  (split E5+E6 → PR11b if oversized)
- [ ] Test: `useGraphRenderer` teardown — `vueRender(null, …)` count == mount count across two `render()` passes
- [ ] Test: `useBlockAssets` — same path, changed size → cache miss; `Pill` unmount → `revokeObjectURL` called
- [x] E3 `GraphViewer.vue` — watch a structural signature (edges + field revision), not node count
- [x] E4 `useGraphRenderer.ts` — track mounted Pills; `vueRender(null, container)` each before `render()` clears the SVG; same in `onUnmounted`
- [x] E5 `Pill.vue` — `revokeObjectURL` on replace and on unmount
- [x] E6 `useBlockAssets.ts` — cache key includes size+mtime, or `clearBlockAssetCache()` on workspace load

### PR12 · E7 — `useHashSync` router state
- [x] Test (`useHashSync.test.ts`, mocked `location`/`history`): A→B→C then Back to `#B` → one history entry per nav, no duplicate push, forward history preserved
- [x] `syncStoreToHash` — `return` if the target hash equals `window.location.hash` (no-op push guard)

---

## Chain hygiene
- [ ] Rebase each PR onto `main` as its predecessor merges
- [ ] Never `--delete-branch` an intermediate PR in the stack
- [ ] Each `innfo-core`/`innfo-mcp` PR: TDD strict, failing test first, same PR
- [ ] Editor build stays green (pre-existing 1.3 MB chunk warning is not a regression)

## Not in this chain
REFACTOR/SMELL only: `content.ts` size, `schema.ts` size, `spec.ts`⇄`list-read.ts`
circular import, `reachability.ts` in-loop `getMarkdownFiles`, editor `as any`
density. Independent cleanup, not gated here (PR6 already does the
frontmatter-strip consolidation).
