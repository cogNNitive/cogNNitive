# Proposal: Knowledge-Unit Query Language

## Intent

Pointers (`path@unit`) address one unit deterministically. Retrieval needs the complement:
selecting **sets** of units by content — "all Enterprise rows", "all sections tagged vip".
Without it, agents fall back to `glob` + full-file reads for every scoped question.

Goal: a `path?filter(&filter)*(&projection)?` **query** feature, independent from but typed
in the pointer vocabulary — a query **returns a set of Knowledge-Unit URIs** (or projected
values). This mirrors the web's own split (RFC 3986): `@unit` plays the fragment role
(subordinate part, client-resolved), `?filters` the query role (non-hierarchical selection).
Precedents: PostgREST (`?age=gte.18&student=is.true`, `&` = AND, `op.` operator namespace),
RFC 7111 draft-00's dropped `where:` fragment selector (evidence that query-in-fragment was
tried and abandoned — our `@`/`?` split avoids exactly that mistake).

## Scope

### In Scope

- **Filter grammar v1**: `name=value` exact match (trim + case-insensitive, search semantics),
  `&` = AND between filters, list-membership for list fields (`tags:: [vip, …]`).
- **Projection**: a single trailing bare segment reuses the pointer subunit syntax
  (`?segmento=Enterprise&mrr_usd` → the matched cells). Segments with `=` are filters;
  the bare trailing segment is the projection — no ambiguity.
- **Markdown**: typed fields only (same precedent as `cross-model-reference-validation`
  "Typed Fields Only in v1"); prose is not queried.
- **`innfo-core`**: `parseKnowledgeQuery` + pure `runQuery` builder with injected ports
  (file walk/read — same port pattern as `buildWorkspaceIndex`), returning `KnowledgeUnitURI[]`.
- **`innfo-mcp`**: new `query_units` tool (read-only).
- **Validator rule**: `?` is rejected inside provenance fields (`sources::`, `derived_from`,
  matrix endpoints) with a diagnostic pointing at pointers; `@` XOR `?` enforced in v1.
- **Reserved for v2**: the `op.` value namespace (`gt.50000`, `neq.`…) — parsed as literal
  values in v1, operators later, so v1 strings stay forward-compatible.

### Out of Scope

- Operators (`gt/lt/neq/…`), OR, combining `@unit?...` (filter-within-unit), sorting,
  pagination, full-text/prose search, index-accelerated execution (v1 scans via ports;
  `WorkspaceIndex` acceleration later, no new index view in v1).
- Editor search UI — retrieval API first; UI follows in a later slice if needed.

## Capabilities

### New Capabilities

- `knowledge-unit-query`: content-based selection over Markdown sections/fields and CSV
  rows/columns returning sets of Knowledge-Unit URIs, plus single-column projection;
  exposed as `innfo-core` pure builder + `innfo-mcp` `query_units` tool.

### Modified Capabilities

- Source/provenance validation (reject `?` outside retrieval contexts), `nn-innfo` skill
  (document the `@` XOR `?` rule and the retrieval-only scope of queries).

## Approach (non-binding — exact shape decided in spec/design)

1. **Grammar (ABNF intent)**:
   `ku-query = path "?" filter *("&" filter) ["&" projection]`;
   `filter = name "=" value`; `projection = name`.
   Percent-decoding before match; literal `= & ?` in names via `%3D %26 %3F`.
2. **Semantics**: CSV → rows matching ALL filters (AND); MD → sections whose typed field
   matches (scalar exact / list membership). Match = trim + case-insensitive (+NFC).
   No match → empty set (never an error). Unknown column/field → `error` diagnostic.
3. **Core API**: `parseKnowledgeQuery`, `runQuery({walkFiles, readFile}) → KnowledgeUnitURI[]`,
   projection evaluation reusing the pointer cell/field resolver from the URI change.
4. **MCP**: `query_units({query})` read-only; response = URI set (+ values when projected);
   unknown-column diagnostics included. Register beside `check_workspace`; update tool count.
5. **Tests (strict_tdd)**: grammar matrix (filters, AND, projection, XOR rejection, `?` in
   `sources::` rejected), match semantics (case/trim/membership/empty-set), MCP round-trip.
6. **Docs**: `nn-innfo` retrieval section; explicit "queries never go in provenance" rule.

## Resolved Decisions

Settled in conversation with the requester (binding for spec/design):

1. `?` introduces queries; `@` introduces pointers; they are mutually exclusive in v1.
2. `&` separates AND-filters inside `?` (URL convention, PostgREST precedent).
3. Bare `=` means equality in v1; the `op.` namespace is reserved for v2 operators.
4. A trailing bare segment is a projection reusing the `&name` subunit vocabulary.
5. Queries return **sets of Knowledge-Unit URIs** — the query feature is typed in terms of
   the pointer feature (complementarity by construction).
6. Filter matching is lenient (trim + case-insensitive) while pointer identity stays strict
   (row-ids exact, case-sensitive) — different problems, different rules, documented together.
7. Markdown queries cover typed fields only; CSV queries cover header-declared columns only.
8. This is an **independent feature** (own capability, own tool, own validator rule), not a
   grammar extension of the pointer.

## Open Decisions (for spec/design)

1. Empty-filter query (`path?` alone = all units?) — allow vs reject (recommended: reject, noisy).
2. Projection over MD fields returning multi-line prose — truncate, full value, or forbid
   (recommended: full value, caller trims).
3. Result ordering guarantee (recommended: document order — file order, section order, row order).
4. Result-size cap for the MCP tool (recommended: cap + `truncated: true` flag).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/` (new `queryUnits.ts` or `sourceRef.ts`) | New | `parseKnowledgeQuery` + pure `runQuery` builder |
| `iNNfo/packages/innfo-mcp/src/tools/ + server.ts` | New | `query_units` tool + registration + tool count |
| `validator/workspaceSources.ts` | Modified | Reject `?` in provenance fields |
| `openspec/specs/` | Modified (small) | Delta spec for the query capability + the `?`-rejection rule |
| `actioNN/skills/nn-innfo/SKILL.md` | Modified | Retrieval section, `@` XOR `?` rule |
| `iNNfo` package versions | Modified | minor (new MCP tool = new capability) |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Queries smuggled into `sources::` break provenance determinism | Med | Validator `error` (not warning) + skill rule + tests |
| Full-scan performance on large workspaces/CSVs | Med | Ports pattern keeps core pure; document cost; index acceleration deferred explicitly |
| `?` is a shell glob metacharacter | Low | Quoting documented; MCP takes structured args, not raw strings |
| `op.`-looking literal values break under v2 operators | Low | Escape hatch reserved in v1 grammar (`%`-encoding always wins) |
| Lands before the URI change and has nothing to return | Low | Hard sequence: URI change first (declared dependency) |

## Rollback Plan

Purely additive: one new core module, one new MCP tool, one new rejection rule. Removing them
restores prior behavior (a `?` in `sources::` previously failed parse as `null` → diagnostic
anyway). Delete the change folder to abandon with zero residue.

## Dependencies

- **Hard**: `2026-09-08-knowledge-unit-uri` (needs `parseKnowledgeUnitRef` + unit resolvers).
  This change sequences strictly after it.
- None on templates, catalog, or CDN beyond the standard minor-release regen tasks.

## Success Criteria

- [ ] `metricas_q3.csv?segmento=Enterprise` → exactly `{@101, @102, @104}` (document order).
- [ ] `…?segmento=Enterprise&mrr_usd` → `{45000, 32000, 78000}`.
- [ ] `Ghostbusters…md?tags=vip` → the Dana Barrett element URI (list membership).
- [ ] `sources:: metricas_q3.csv?segmento=Enterprise` → `error` diagnostic (pointers only).
- [ ] `query_units` round-trips through the MCP with unknown-column diagnostics.
- [ ] Skill documents `@` XOR `?` with examples.

---
Size: **medium** (one core module + one MCP tool + validator rule + skill docs). Fits the
800-line review budget as a single PR.
