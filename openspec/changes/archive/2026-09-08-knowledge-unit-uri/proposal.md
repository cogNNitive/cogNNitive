# Proposal: Knowledge-Unit URI

## Intent

A workspace has no stable, uniform address for anything below file level. The current
identifier `<path>.md#<heading-slug>` (specs `document-citations`, `typed-source-references`)
has four structural limits:

1. **Level-blind** — the slug discards whether the target is `#`, `##` or `###`, so the
   URI alone says nothing about the unit's structural rank.
2. **Markdown-only** — CSV sources exist first-class in the manifest (`source_format: csv`)
   but are not citable; today they are cited through a lossy normalized-MD proxy that
   contains only schema + a row *sample*, so most rows are not even addressable, and the
   proxy can drift from the raw file.
3. **No sub-unit granularity** — neither a field inside a section (`compensation::` under
   `## NN Person: …`) nor a cell inside a CSV row can be addressed.
4. **Line anchors are (correctly) banned** — `#L12-L45` does not survive edits, leaving no
   positional fallback.

Goal: a `path@unit(&subunit)*` **pointer** grammar — deterministic, resolving to 0..1
results, stable under insertions/reorderings — shared by `innfo-core`, `innfo-mcp` and
`innfo-editor` through the existing single-implementation rule.

## Scope

### In Scope

- **Markdown units**: header with preserved level (`@# …`, `@## …`, `@### …`) + optional
  field subunit (`&compensation`). Applies to Sources, Models, and any `.md` in the workspace.
- **CSV units**: row by explicit key value (`@104`, `@lucas`) + optional column subunit
  (`&mrr_usd` → one cell). Key column = first column by convention in v1.
- **Matrix cells** in Markdown tables: `unit&row&column`
  (e.g. `@# NN matrices: journey map&First Contact&Relief`).
- **`innfo-core`**: `parseKnowledgeUnitRef`, `resolveUnit` (headers, fields, CSV rows/cells),
  extended `SourceRef`, revised normalization pipeline (see Approach).
- **`innfo-mcp`**: `validate` workspace-mode extended to `@`/`&` and `.csv`; legacy `#slug`
  accepted with deprecation warning during transition.
- **Transition**: dual-accept (`#slug` old + `@unit` new), canonical output always `@`.
- **Skill + trannsform docs**: `nn-innfo` §4 grammar, `citations.md` (cite CSV directly),
  slug-parity JS mirror updated in lockstep.
- **Deployment tasks**: CDN bundle regen, manifest/catalog, docs regen, version-square green.

### Out of Scope

- Value-carrying filters (`author:lucas`) — separate change `2026-09-08-knowledge-unit-query`.
- Comparison operators, OR, sorting, pagination.
- Explicit key-column declaration (frontmatter/sidecar) — first-column convention covers v1.
- Element-level Matrix Definitions (`source::`/`target::` are Concept→Concept today; moving
  them to Element level is a template semantic change for a later change).
- Editor UI (FileRefPill / FilePreviewModal / deep-links) — **slice 2 of this same change**,
  not v1-core.

## Capabilities

### New Capabilities

- `knowledge-unit-uri`: a workspace-uniform pointer grammar for knowledge units
  (section, field, CSV row, CSV cell, matrix cell) with shared parse/resolve/validate in
  `innfo-core`, surfaced through `sources::`-family fields and the MCP validator.

### Modified Capabilities

- `typed-source-references` (parser type + graph materialization), `document-citations`
  (uniform identifier migrates to `@`), source validation (`workspaceSources`),
  `nn-trannsform` citations, `nn-innfo` authoring grammar. `agent-modification-provenance`
  and `lineage-record-sync` migrate mechanically.

## Approach (non-binding — exact shape decided in spec/design)

1. **Grammar (ABNF intent)**:
   `ku-uri = path "@" unit *("&" subunit)`; `md-unit = 1*6"#" text`;
   `csv-unit = row-id`; `subunit = field/column/row/column-label` (names only, never values).
   Literal `@ & ? =` inside names use percent-encoding (`%40 %26 %3F %3D`), decoded pre-match.
2. **Normalization pipeline**: NFC input → NFD+strip-Mn for Latin (existing slugs stable) →
   keep `[\p{L}\p{N}]` (fixes empty slugs for non-Latin; GitHub parity) → lowercase →
   whitespace to `-` (headers) / `_` (names, preserving `_`) → concept-aware boundary
   `slug(concept)--slug(element)` from parsed structure → existing `-1/-2` dedup.
   Row-ids match exact-after-trim, case-sensitive (key semantics). Percent-encoding only at
   the HTTP-embed boundary, never stored.
3. **Core API**: `parseKnowledgeUnitRef`, `resolveUnit`, extended `SourceRef{unit, subunits}`,
   `SourceResolver{exists, units, columns, fields}`; new diagnostics (dangling file/row/column/
   field, duplicate IDs, field-outside-section).
4. **Migration**: accept legacy `#slug` with `warning` diagnostic pointing at the `@`
   canonical form; emitters always write `@`.
5. **Versioning**: `minor` bump `innfo-core` + `innfo-mcp` (0.5.0 — 0.4.0 shipped 2026-09-08
with an unrelated batch); editor follows its dep.
6. **Deploy**: rebuild MCP bundle → `cdn/innfo-mcp-v0.5.0.bundle.js` + manifest `latest`;
   `source.yaml` + `catalog.json`; docs regen (`llms.txt`, `documentation/`); square green
   (note: the 0.3.2 gap was closed by the 0.4.0 release on main; Slice 4 re-verifies).
7. **Tests (strict_tdd)**: grammar matrix, resolver matrix (header/field/row/cell/matrix-cell),
   validator diagnostics, slug-parity JS mirror, MCP workspace-mode cases.
8. **Slices**: slice 1 = core + MCP + validator + docs; slice 2 = editor pill/modal/deep-links.

## Resolved Decisions

Settled in conversation with the requester (binding for spec/design):

1. `@` separator with fragment-role semantics; header level preserved in the unit.
2. CSV row-ids are **explicit key values**, never positional; first column is the key by convention.
3. `&subunit` carries names only — the grammar is a pointer (0..1), never a query.
4. File extension (`.md` / `.csv`) disambiguates the unit grammar; no inference needed.
5. `:` stays in model files (RDF QName `scope:name` precedent, zero migration); the slug keeps
   the Concept/Element boundary via concept-aware `--`.
6. CSV-direct citation; normalized MD is an ingestion aid, not a citation target;
   `sources/nn/*.csv` citable, `sources/original/` not.
7. Existing specs (`document-citations` et al.) adapt to this design, not vice versa.
8. Anything carrying a value (`col=val`) belongs to the query change, not this grammar.

## Open Decisions (for spec/design)

1. Legacy `#slug` sunset: accept-forever with warning vs removal at 1.0.
2. Matrix-cell double-subunit strictness (unknown row/col label = error vs warning).
3. Row-id case-sensitivity confirmation (recommended: sensitive, key semantics).
4. Editor slice inside this change vs follow-up change (recommended: slice 2, same change).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/sourceRef.ts` | Modified | New grammar, resolvers, normalization pipeline |
| `innfo-core/src/{types,validator,recursiveParser,parser/slug,index,browser}.ts` | Modified | Extended `SourceRef`, resolver ports, exports |
| `iNNfo/packages/innfo-mcp/src/tools/ + server.ts` | Modified | `validate` workspace-mode for `@`/`&`/CSV |
| `iNNfo/apps/innfo-editor/src/` | Deferred (slice 2) | Pill, preview modal, deep-link param |
| `actioNN/skills/nn-trannsform/scripts/` | Modified | Slug-parity JS mirror + cases |
| `openspec/specs/{typed-source-references,document-citations,…}` | Modified | Delta specs migrating the identifier |
| `actioNN/skills/{nn-innfo,nn-trannsform}/` docs | Modified | Grammar + citation targets |
| `manifest/source.yaml`, `catalog.json`, `docs/innfo/cdn/`, docs regen | Modified | Release + deployment tasks |
| `iNNfo` package versions | Modified | minor 0.4.0 core+mcp |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Slug changes alter existing slugs (`--`, non-Latin kept) | **High** | Dual-accept + deprecation diagnostics; canonical `@` only in emitters |
| Slug-parity JS mirror breaks | **High** | Update JS + cases in the same TDD step; parity test gates the change |
| Version-square drift between proposal time and release | Med | Slice 4 re-verifies the 6-way square (the 0.3.2 gap was closed by the 0.4.0 release on main) |
| Concurrent agents on shared `dev` (observed this session) | Med | Re-check tree before each chunk per `nn-dev-development` §3 |
| Duplicate CSV IDs / unknown columns in the wild | Med | Strict `error` diagnostics; first-column convention documented |
| `@`/`&` are shell metacharacters | Low | Quoting documented in skill + error hints |

## Rollback Plan

Additive throughout: dual-accept keeps every existing `#slug` citation working; removing the
parser extension restores prior behavior. No template version touched, so no data migration.
Delete the change folder to abandon the proposal with zero residue.

## Dependencies

- Version-square 0.3.2 gap must close before/with this release (deploy dependency).
- Change `2026-09-08-knowledge-unit-query` lands **after** this one (needs its resolver).
- Lateral, non-blocking: `2026-09-08-workspace-progressive-disclosure-index` (index lines may
  adopt KU-URIs later).

## Success Criteria

- [ ] Every sample mapping resolves: Ghostbusters concept/element/field/matrix-cell,
      `metricas_q3.csv@104` and `@104&mrr_usd` (= 78000).
- [ ] Legacy `metricas_q3.md#nn-summary-statistics`-style refs still validate (with warning).
- [ ] Diagnostics cover dangling file/row/column/field, duplicate IDs, field-outside-section.
- [ ] Regen/validate is a no-op on unchanged workspaces; version-square green; parity test green.
- [ ] Skill docs describe only the `@` grammar for new citations.

---
Size: **large** (core + MCP + validator + docs; editor slice 2). Exceeds the 800-line review
budget as a single PR — split per slice (`single-pr-default` exception flagged upfront).
