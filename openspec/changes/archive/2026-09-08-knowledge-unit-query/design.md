# Design: Knowledge-Unit Query Language

**Change ID:** `2026-09-08-knowledge-unit-query`
**Related specs:** `knowledge-unit-query` (New)
**Depends on:** `2026-09-08-knowledge-unit-uri` (pointer types + unit resolvers)

---

## Technical Approach

One small pure module in `innfo-core` owns parsing and matching; the MCP tool is a thin
adapter that gathers file snapshots. The module never touches `node:fs`, `fetch`, or
`path` — determinism and testability come from operating on injected snapshots. Projection
reuses the URI change's cell/field resolver; the query module never re-implements pointer
logic (strict layering: query → pointer, never the reverse).

```
              ┌────────────────── @cognnitive/innfo-core ──────────────────┐
              │  queryUnits.ts        parseKnowledgeQuery + runQuery (pure) │
              │  querySections.ts     heading/field structural scan (pure)  │
              │        ▲ imports types, cell/field resolver AND csvTable    │
              │  from the URI change (sourceRef.ts + csvTable.ts)           │
              └───────┬──────────────────────────────┬──────────────────────┘
                      │ snapshots                    │ raw check
        ┌─────────────┴──────────────┐   ┌───────────┴────────────────────┐
        │ innfo-mcp                  │   │ validator/workspaceSources.ts  │
        │ tools/query-units.ts       │   │ `?` in provenance ⇒ error +    │
        │ fs snapshots, cap 100      │   │ pointer suggestion             │
        └────────────────────────────┘   └────────────────────────────────┘
```

---

## Architecture Decisions

### AD-1 — Snapshot-in, URIs-out: `runQuery(query, files)` is synchronous and pure

**Choice.** The builder signature is
`runQuery(parsed: KnowledgeQuery, files: FileSnapshot[]): QueryResult` with
`FileSnapshot = { path: string; content: string }`. Adapters own all I/O and pass
snapshots **sorted by path** — document order falls out of array order with zero
sorting logic in core. Synchronous: no async gaps, trivially TDD-able with inline fixtures.

```ts
export interface KnowledgeQueryFilter { name: string; value: string }
export interface KnowledgeQuery {
  path: string
  filters: KnowledgeQueryFilter[]
  projection?: string
}
export interface QueryResult {
  /** Resolved pointers, document order. Empty set is a valid result. */
  uris: KnowledgeUnitURI[]
  /** Present only when projection was requested, aligned 1:1 with uris. */
  values?: string[]
  truncated: boolean
  diagnostics: ReferenceDiagnostic[]
}
```

### AD-2 — CSV reader: shared with the URI change, not duplicated here

**Choice.** The pure RFC-4180-subset reader (`parseCsvTable`: comma delimiter, `"`
quoting with `""` escape, CRLF/LF rows) is owned by the URI change (`csvTable.ts`,
its AD-3) and imported here — zero duplication. Headers normalize with `normalizeName`;
an unbalanced quote makes that file contribute zero rows plus one `error` diagnostic —
queries degrade per-file, never fail wholesale.

### AD-3 — Markdown matching over structure, not model semantics

**Choice.** MD querying does NOT run `recursiveParse` (which needs template context).
Instead `querySections.ts` reuses `extractHeadings` for section boundaries and extracts
`key:: value` lines per section — template-free and fast. List values reuse a generalized
bracket-splitter (the `splitSourceFieldValue` shape lifted to any field). Rationale: the
spec scopes v1 to *typed fields*, and `key::` lines ARE the typed-field surface of a
document; full model semantics would drag template resolution into a retrieval path.

### AD-4 — Match normalization split: lenient filters, strict identity untouched

**Choice.** Filter comparison canonicalizes both sides with NFC → trim → lowercase.
Pointer identity (row-ids, slugs) keeps its own strict rules owned by the URI change —
the query module never compares identities itself, it only *returns* them. This keeps the
"search is lenient, identity is exact" principle impossible to violate by construction.

### AD-5 — MCP contract: `query_units`, read-only, capped

**Choice.** Tool `query_units({ query: string })` → `{ uris: string[], values?: string[],
truncated: boolean, diagnostics[] }`, URIs serialized in canonical `@` form. Hard cap 100
with `truncated: true`; no pagination params in v1 (explicitly deferred). Registration in
`server.ts` beside `check_workspace` + documented tool-count bump. The tool creates no
files and mutates no state — safe for agent loops.

### AD-6 — `?`-rejection lives in the existing validator, not in the parser

**Choice.** `parseKnowledgeQuery` stays total over query-shaped strings. The provenance
rule is enforced where provenance is validated (`validator/workspaceSources.ts`): if a
`source`/`derived_from`-family raw value parses as a query, emit the dedicated `error`
("queries are not valid provenance — resolve to pointers first") instead of the generic
malformed-ref diagnostic. One rule, one place, one message.

### AD-7 — No WorkspaceIndex dependency in v1

**Choice.** v1 scans the snapshot set directly (workspaces and CSVs at this scale make
index acceleration premature). If a later change adds a unit index, `runQuery` gains an
optional index port — the snapshot path remains as fallback. No new index view is created.

## File Inventory

| File | Action |
|------|--------|
| `innfo-core/src/queryUnits.ts` | New: `parseKnowledgeQuery`, `runQuery`, result/diagnostic types |
| `innfo-core/src/queryUnits.spec.ts` | New: grammar + match + ordering + cap-behavior tests |
| `innfo-core/src/csvTable.ts` | Reused (owned by URI change, its AD-3) |
| `innfo-core/src/querySections.ts` (+ spec) | New: heading/field structural scan |
| `innfo-core/src/index.ts`, `browser.ts` | Modified: export query API |
| `validator/workspaceSources.ts` (+ tests) | Modified: `?`-in-provenance error rule |
| `innfo-mcp/src/tools/query-units.ts` (+ spec) | New: adapter, snapshot gathering, cap |
| `innfo-mcp/src/server.ts` | Modified: registration + tool count |
| `actioNN/skills/nn-innfo/SKILL.md` | Modified: retrieval section, `@` XOR `?` rule |
| `innfo-core/package.json`, `innfo-mcp/package.json` | Modified: minor bump, coordinated 0.5.0 with URI change |
