# Design: Integrity Audit Follow-ups (2026-09-06)

Line anchors are from `main` @ `a92b9af`; verify at implementation time (PR #50
shifted editor line numbers — target the named functions, not the line).

---

## PR1 · M5 — `sources::` path traversal (SECURITY)

**Now** — `iNNfo/packages/innfo-mcp/src/tools/validate.ts` ~line 231:
```
const resolveSource: SourceResolver = (refPath) => {
  const abs = join(rootDir, refPath)          // no clamp
  ... existsSync(abs) / readFileSync(abs)
}
```
`refPath` is author-controlled (`sources:: <ref>` inside model markdown).

**Target** — resolve, then confirm containment:
```
const abs = resolve(rootDir, refPath)
const rel = relative(rootDir, abs)
if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
  // outside the workspace -> treat as an unresolved source, do not read
  return { ok: false, reason: 'source path escapes the workspace' }
}
```
Cross-model citations (`models/Finance_V_1-0-0_business_NN.md#slug`) and
subfolder sources (`interviews/x.md#y`) stay inside `rootDir`, so they are
unaffected. A DOI / `doi:` scheme ref is already handled upstream and never
reaches `resolveSource`.

**Tests** — `validate.ts` spec: a model citing `../secret.md`, `/etc/hosts`,
`..\\..\\x` (Windows) → source reported unresolved, **no** `readFileSync` on the
outside path (spy on `fs`). A legit `models/Other_NN.md#h` and
`sub/dir/note.md#h` still resolve.

**Risk** — low. Behaviour change is limited to refs that already point outside
the workspace, which were never valid.

---

## PR2 · M7 + M8 — guard laxness

### M7 — `scripts/manifest/check-parity.js:92`
**Now**: `text.match(/V_\d+-\d+-\d+/i) || text.match(/version:\s*["']?([^"'\r\n]+)/i)`
run when frontmatter parsing yields no version; the first alternative matches
the first `V_x-y-z` anywhere in the body.
**Target**: drop the body-wide `V_` scan. Version comes from, in order:
frontmatter `version` / `spec_version` / `metadata.version` (already parsed
above), else the `V_x-y-z` in the **filename**. If neither, it is a hard error
("no version declared"), which is already the existing final branch.
**Test**: `check-parity.test.js` — a template whose body contains
`iNNfo_V_0-2-1_NN.md` in a `parent_spec` URL but whose frontmatter/filename say
`V_0-1-0` → no spurious mismatch.

### M8 — `scripts/verify.js:56`
**Now**: `const matchRegex = /-\s+name:\s+([^\s\n]+)/g` over the whole
`manifest/source.yaml` → collects `skills:`, `mcp:`, `workflows:` names too.
**Target**: slice `source.yaml` to the `templates:` block first
(from `^templates:` to the next top-level key), run the `- name:` scan only on
that slice. Keep it regex-based (zero-dep, matches the file's style).
**Test**: a new `scripts/verify-inventory.test.js` (or extend an existing
manifest test) — a fixture `source.yaml` with a skill named `foo` and a
`specs/templates/foo/` folder that is NOT under `templates:` → guard fails.

---

## PR3 · M3 — `crc32` runtime floor

**Now**: `spec-backup.ts:3` `import { deflateRawSync, crc32 } from 'node:zlib'`;
root `package.json` `engines.node: ">=20"`.
**Target**:
- `package.json` `engines.node: ">=20.15"` (CI already runs Node 20 latest; the
  repo dev env is 22).
- In `buildZipArchive`, a guard: `if (typeof crc32 !== 'function') throw new
  Error('Node >= 20.15 required for spec backups (node:zlib.crc32)')` — a clear
  message instead of `crc32 is not a function` mid-zip.
**Test**: `spec-backup` spec already exercises the zip path; add an assertion
that the guard message is thrown when `crc32` is stubbed to `undefined`.
**Alternative considered**: vendor a 20-line table-driven CRC-32. Rejected —
more code to own for a dev-tooling path; the engine bump is honest.

---

## PR4 · M4 — workspace-scope recursion ignore list

**Now**: `validate.ts:223` `const rootHandle = createNodeDirectoryHandle(rootDir)`
with no filter; the generator at `:168` yields every dirent. An ignore set
already exists in the same file (`:74-75`).
**Target**: hoist that ignore set to a module constant and pass it to
`createNodeDirectoryHandle` (add an optional `ignore: Set<string>` param;
the `async *entries()` generator skips `ignore.has(dirent.name)`).
**Test**: `validate.ts` spec — a workspace with a `node_modules/` containing a
`.md` → it is not parsed / not in the diagnostics; a normal `models/` file is.

---

## PR5 · M1 — frontmatter injection in `init_model`

**Now**: `init-model.ts:169-181` builds the frontmatter as a template string
(`name: "${args.template_name}"`, `url: "${args.template_url}"`,
`title: "${title}"`) and `writeFile`s at `:181` before `validateDocument`.
**Target**:
- Serialize the frontmatter object with the `yaml` package (already a dep of
  `innfo-core`; `innfo-mcp` can use it or a minimal escape helper — quote,
  escape `"` and `\`, reject `\n` in a scalar → fold to block, or just error).
- Parse + validate the rendered document **before** the write. On failure,
  return the diagnostics and do not touch disk (or write to `${filePath}.tmp`
  and `rename` only on success — atomic, matches `atomic-fs.js` elsewhere).
**Test**: `init-model` spec — `init_model({ …, title: 'The "Real" Deal' })` and
`title: 'a\nb'` → the written file's frontmatter round-trips through the parser;
an intentionally invalid template produces no file.

---

## PR6 · C1 — UTF-8 BOM strips frontmatter

**Now** — three divergent frontmatter-strip implementations:
- `parser/markdown.ts:1` `YAML_BLOCK_RE = /^---\r?\n([\s\S]*?)\r?\n---/`
- `validator/content.ts` `content.replace(/^---[\s\S]*?---\n?/, '')`
- `recursiveParser/workspace.ts` same replace
`normalizeSource` (`markdown.ts:8`) strips `\r` only. A leading `﻿` defeats
every `^---` anchor.

**Target**:
- `normalizeSource`: `text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')`.
- Route `content.ts` and `workspace.ts` through `normalizeSource` before their
  strip (or export one `stripFrontmatter(raw)` from `markdown.ts` and call it in
  all three places). This folds in core-review REFACTOR #13.
**Tests** — new `tests/bom.test.ts`: `parseModel`, `validateFormatContent`,
`normalizeSingleModel`, and `recursiveParse` each given a BOM-prefixed model →
identical result to the no-BOM input. Regression-run the full core suite (the
strip consolidation is the risky part).
**Risk** — medium: three call sites, one of them in the recursive parser. Hence
its own PR with a full-suite gate.

---

## PR7 · C6 — GFM table delimiters optional

**Now** — `parser/markdown.ts:16` `.filter((l) => l.trim().startsWith('|'))`;
`parseTableRow:30` splits on `|` and drops `[0]` and `[-1]`.
**Target**:
- Accept a line as a table row if it contains an unescaped `|` (not only if it
  starts with one).
- In `parseTableRow`, only drop a leading empty segment if the line started with
  `|`, and a trailing empty segment if it ended with `|`.
**Tests** — `tests/parser-standard.test.ts` table cases: `| a | b |`,
`a | b`, `| a | b`, `a | b |` all parse to the same cells; a separator row
(`--- | ---`) is still recognised in every shape.

---

## PR8 · C4 — element-prose bullet lines

**Now** — `parser/sections.ts:164`:
`if (!line.trim().startsWith('*') && !line.trim().startsWith('-')) { …push to description… }`
so bullet lines never reach `description`.
**Target** — a line is excluded from the description only if it is a
**field** (`key:: value`), an element header (`## NN`), or an index bullet in
the `# NN index` section. A `-`/`*` line inside an element body is prose and is
kept. Serializer already re-emits `description` verbatim (`serializer.ts:163`),
so round-trip works once the parser stops dropping.
**Tests** — `tests/parser-standard.test.ts`: an element body with a
`- one / - two` list → `description` contains both; `parseModel(serializeModel(m))`
is stable. Guard: a `key:: value` line immediately after the header is still a
field, not prose.
**Risk** — medium: changes what "element description" captures. Full-suite gate;
check the `rawSections` / `text`-concept path is unaffected.

---

## PR9 · C3 — schema-aware `rename_element`

**Now** — `mutate.ts` `renameElement` (~`:123` dispatch, `updateReferenceString`
`:363`) applies the slug-match rewrite to every string field of every element.
`updateReferenceString:369` Case 1 replaces the whole value when
`slugify(text.trim()) === slugify(oldName)`.
**Target**:
- `renameElement` receives the resolved parent-template schema (the same
  `resolveTemplateSchema` callback pattern used elsewhere; or the already-parsed
  `model` schema if present).
- Only run `updateReferenceString` on fields whose definition is
  `type: 'reference'`. WikiLink values (`[[Name]]`) and matrix / index refs are
  rewritten as today regardless of schema (they are unambiguously references).
- Plain-string fields with no schema entry: left untouched.
**Tests** — `tests/rename-propagation.test.ts`: `Cost` → `Expense` with a
reference field `parent_cost:: [[Cost]]` (rewritten) and a plain field
`category:: cost` (untouched); a model with no resolvable schema → only
`[[...]]` / index / matrix refs are rewritten, never bare strings.
**Risk** — medium-high: touches the mutation contract. Needs the schema plumb
first; if `resolveTemplateSchema` is not wired for this path, that wiring is
part of the PR.

---

## PR10 · E1 + E2 — matrix cell identity

**Now** — `MatricesGrid.vue` builds `rows`/`columns` as
`Object.values(modelStore.nodes).filter(type).map(n => n.name)`; cell key is
`matrixName||rowName||colName`. `useMatrixCells.ts` `valueDistribution` builds
its key without the `normalizeSeparators` that get/set use.
**Target**:
- Rows/columns carry `{ id, name }`; the cell key uses the stable node `id`
  (or `concept::name::parentPath` where the store has no id). Matches whatever
  identity core settles on for duplicate names — coordinate with any open core
  work; if none, `id` is the store key.
- `valueDistribution` uses the exact `matrixCellKey()` helper get/set use.
**Tests** — `tests/unit/useMatrixCells.test.ts`: two nodes named `Review` under
different parents → two distinct cells, independent values; a row name with `::`
→ distribution count matches the rendered cells.
**Risk** — medium: matrix persistence format. Confirm the serialized
`row||col` key on disk is unchanged (display name still written), only the
in-memory lookup changes.

---

## PR11 · E3 + E4 + E5 + E6 — graph lifecycle & blobs

- **E3** `GraphViewer.vue`: replace
  `watch(() => Object.keys(modelStore.nodes).length, …)` with a watch on a
  structural signature — `JSON.stringify(edges) + fieldRevision` or a store
  getter that hashes edges + reference fields.
- **E4** `useGraphRenderer.ts`: keep the array of `{ container, vnode }` mounted
  Pills; before `render()` does `svg.selectAll('*').remove()`, iterate and
  `vueRender(null, container)` each, then clear the array. Add the same teardown
  to `GraphViewer`'s `onUnmounted`.
- **E5** `Pill.vue`: store the created object URL in a ref; `revokeObjectURL` in
  the `watch` cleanup and in `onUnmounted`.
- **E6** `useBlockAssets.ts`: cache key becomes `path + ':' + size + ':' + mtime`
  (from the file handle), or expose a `clearBlockAssetCache()` called on
  workspace load.
**Tests** — `useGraphRenderer` teardown: a mount/unmount spy asserts
`vueRender(null, …)` call count equals the mount count across two `render()`
passes. `useBlockAssets`: same path with a changed size → cache miss, new blob.
`Pill` unmount → `revokeObjectURL` called.
**Split rule** — if E3+E4 alone exceed ~300 changed lines, ship E5+E6 as PR11b.

---

## PR12 · E7 — `useHashSync` router state

**Now** — `syncHashToStore` (sync `hashchange` listener) sets `updating = true`,
`selectNode()`, `updating = false`, returns; the `watch(selectedNodeId,
syncStoreToHash)` runs later in a microtask with `updating` already `false` and
pushes `#sameHash` again.
**Target** — either:
- (a) clear `updating` in a `nextTick` / `queueMicrotask` after the watcher has
  had its turn, or
- (b) in `syncStoreToHash`, compare the target hash to
  `window.location.hash` and `return` if equal (no-op push guard).
Prefer (b) — it is idempotent and also fixes any other path that re-pushes the
current hash.
**Tests** — new `tests/unit/useHashSync.test.ts` with a mocked
`window.location` / `history`: A→B→C then a simulated Back to `#B` →
exactly one `history` entry per navigation, no duplicate push, forward history
preserved.

---

## Cross-cutting

- Every core / mcp PR: TDD strict — failing test first, in the same PR.
- Every PR: `node scripts/verify.js` (now 9 steps incl. the immutability guards
  from PR #50) + `npm --prefix iNNfo test` green before merge.
- Editor PRs: `npm --prefix iNNfo/apps/innfo-editor run build` must stay green
  (the 1.3 MB chunk warning is pre-existing, not a regression signal).
- Rebase each PR onto `main` as its predecessor merges; do not `--delete-branch`
  an intermediate PR in the stack (closes dependents — see the
  workspace-entity-evolution incident).
