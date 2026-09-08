# Design: Knowledge-Unit URI

**Change ID:** `2026-09-08-knowledge-unit-uri`
**Related specs:** `knowledge-unit-uri` (New), `typed-source-references` (Modified),
`document-citations` (Modified)
**Depended-on-by:** `2026-09-08-knowledge-unit-query` (pointer types, resolvers, CSV reader)

---

## Technical Approach

`sourceRef.ts` remains the single grammar home; it grows two focused siblings so the file
stays reviewable. Parsing, normalization, and resolution are pure functions over strings;
all I/O (file existence, content reads, CSV bytes) stays behind the existing
`SourceResolver` ports, extended — never widened — for units, columns, and fields.

```
              ┌────────────────── @cognnitive/innfo-core ──────────────────┐
              │  sourceRef.ts     parseKnowledgeUnitRef + normalize fns +   │
              │                   SourceRef{unit,subunits} + serialize      │
              │  csvTable.ts      parseCsvTable (pure, SHARED w/ query)     │
              │  unitResolve.ts   resolveUnit dispatch (section/field/row/  │
              │                   cell/matrix-cell), 0..1 results           │
              └───────┬──────────────────────────────┬──────────────────────┘
                      │ refs + diagnostics           │ ports
        ┌─────────────┴──────────────┐   ┌───────────┴────────────────────┐
        │ recursiveParser + MCP      │   │ validator/workspaceSources.ts  │
        │ attachSourceCitations,     │   │ KU_* codes, dual-accept        │
        │ validate workspace-mode    │   │ warnings                       │
        └────────────────────────────┘   └────────────────────────────────┘
```

---

## Architecture Decisions

### AD-1 — Two public parsers, one tokenizer, deprecation envelope

**Choice.** `parseKnowledgeUnitRef` owns the `@` grammar; `parseSourceRef` becomes a
dispatcher: try pointer grammar → try legacy `#slug` (attaching
`{ deprecated: true, canonical: "<@ form>" }`) → else `null`. One tokenizing core, so the
split-first-`@` / split-`&` / percent-decode rules exist exactly once. The deprecation
warning copy is parameterized for pre-flight (a) (scheduled-removal vs accept-forever).

```ts
export interface KnowledgeUnitRef {
  /** Workspace-relative path, `/`-separated, NFC-normalized. */
  filePath: string
  fileName: string
  unit: HeaderUnit | RowUnit
  /** Names only — field, column, or matrix row/column labels. Never values. */
  subunits: string[]
  kind: 'source' | 'model'
  raw: string
}
export interface HeaderUnit { kind: 'header'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string; slug: string }
export interface RowUnit { kind: 'row'; id: string }
```

### AD-2 — Normalization as named pure functions (spec pipeline, verbatim)

**Choice.** `nfc()`, revised `slugifyHeading`, new `normalizeName`, new
`slugifyUnitHeading(level, text)` which detects `^NN\s+(.+?)\s*:\s+(.+)$` (post-marker-strip)
and emits `slug(concept)--slug(element)`; generic headers slug flat. `extractHeadings`
gains ADDITIVE optional fields `{ concept?: string; element?: string }` — existing
consumers recompile untouched. Canonical serialization `serializeKnowledgeUnitRef`
(level + slug + `&`-joined normalized subunits) is the single emitter for MCP outputs,
validator suggestions, and editor pills.

### AD-3 — CSV reader owned HERE and shared with the query change

**Choice.** `csvTable.ts` exposes `parseCsvTable(content): CsvTable` with
`CsvTable = { headers: string[]; rows: string[][]; diagnostics: ReferenceDiagnostic[] }`:
comma delimiter, `"` quoting with `""` escape, CRLF/LF rows, headers normalized via
`normalizeName`. Key column is `headers[0]`; rows address by exact-trim-case-sensitive
match on it. The query change imports this module (its design AD-2 aligned accordingly) —
the reader exists once. Unbalanced quotes poison only that file (zero rows + one `error`).

### AD-4 — Resolution dispatch, 0..1 results, reuse before invention

**Choice.** `resolveUnit(content, ref): ResolvedUnit | null` dispatches on unit kind:
header → existing `resolveHeadingSection` (untouched semantics); field → `key::` line scan
within the resolved section (generalized bracket-split for list values, shared with the
query change's section scan — the scan helper lives here, query imports it); row/cell →
`parseCsvTable` + key match (+ column index for cells); matrix cell → table parse of the
resolved matrix section (apply-time check: reuse core's matrix table-row parsing if
importable without template context, else a local ~30-line reader — no third option).

```ts
export type ResolvedUnit =
  | { kind: 'section'; startLine: number; endLine: number }
  | { kind: 'field'; lines: number[] }
  | { kind: 'row'; index: number }
  | { kind: 'cell'; row: number; column: string; value: string }
```

### AD-5 — Validator ports extended, never widened; stable diagnostic codes

**Choice.** `SourceResolver` gains `{ unitExists, listColumns, listFields, listKeys }`
alongside `{ exists, headings }` — disk-backed in MCP, in-memory fakes in tests. Every new
diagnostic carries a stable `code` (tests assert codes, not prose):
`KU_DANGLING_FILE` (error), `KU_UNKNOWN_SLUG` (warning), `KU_UNKNOWN_ROW` (error),
`KU_UNKNOWN_COLUMN` (error), `KU_FIELD_OUTSIDE_SECTION` (error), `KU_DUPLICATE_KEY`
(error), `KU_EMPTY_KEY` (error), `KU_DEPRECATED_HASH` (warning + `canonical` suggestion),
`KU_MALFORMED` (error).

### AD-6 — MCP validate: additive diagnostics, unchanged tool contract

**Choice.** `resolveSource` learns `.csv` (via `parseCsvTable` + header extraction) and the
workspace-mode pass includes all `KU_*` diagnostics. Request/response shapes do not change;
only the diagnostics array grows. No new tool in this change (`query_units` belongs to
the query change).

### AD-7 — Trannsform parity ships in the same PR or the PR does not land

**Choice.** `markdown-utils.js` mirrors `slugifyUnitHeading` + `normalizeName` exactly;
`test-slug-parity.js` gains the `--`, non-Latin-kept, and `_`-preserved cases. The parity
test gates Slice 2 — a core slug change without its JS mirror is an incomplete PR by rule.

### AD-8 — Editor slice: adapter + preview + `?ku=` deep-link param

**Choice.** `utils/sourceRef.ts` adapter gains `unit/subunits/canonical`; `FileRefPill`
renders the canonical `@` label; `FilePreviewModal` adds a CSV table preview (row/cell
highlight) and MD field-line highlight via core `resolveUnit`. Deep-linking uses a
`?ku=<pct-encoded-pointer>` query param preserved by `useHashSync` — the
`#Concept.Element` / `#@Concept` hash semantics are not touched.

### AD-9 — Joint 0.5.0 release; square re-verified, not re-closed

**Choice.** `innfo-core` + `innfo-mcp` minor-bump together once to **0.5.0** (0.4.0 shipped
on main 2026-09-08 with an unrelated batch); the query change folds into the same release.
Slice 4 re-verifies the 6-way square instead of closing the old 0.3.2 gap — it is already closed.

## File Inventory

| File | Action |
|------|--------|
| `innfo-core/src/sourceRef.ts` | Modified: pointer parser, normalize fns, extended `SourceRef`, serializer |
| `innfo-core/src/sourceRef.unit.spec.ts` | New: grammar + normalization + canonical-form tests |
| `innfo-core/src/csvTable.ts` (+ spec) | New: shared pure CSV reader (also serves query change) |
| `innfo-core/src/unitResolve.ts` (+ spec) | New: `resolveUnit` dispatch + per-kind resolvers |
| `innfo-core/src/types.ts` | Modified: `SourceRef{unit,subunits}`; NO new relationship origin (spec) |
| `innfo-core/src/index.ts`, `browser.ts` | Modified: export parser/resolver/serializer |
| `validator/workspaceSources.ts` (+ tests) | Modified: extended ports, `KU_*` codes, dual-accept warnings |
| `recursiveParser/normalize.ts` | Modified: `attachSourceCitations` consumes extended refs |
| `innfo-mcp/src/tools/validate.ts` (+ spec) | Modified: CSV + `@`/`&` in workspace mode |
| `apps/innfo-editor/src/` (slice 3) | Modified: adapter, pill, modal, `?ku=` param, e2e |
| `actioNN/skills/nn-trannsform/scripts/` | Modified: JS mirror + parity cases (gating) |
| `actioNN/skills/{nn-innfo,nn-trannsform}/` docs | Modified: `@` grammar, CSV-direct citations |
| versions, `docs/innfo/cdn/`, manifest/catalog, docs regen | Modified: joint 0.5.0 (slice 4) |
