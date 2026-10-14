# Design: Matrix header reference resolution by declared `source`/`target` context

## Context (verified against `origin/dev`, 2026-10-14)

- `validator/references.ts` (`origin/dev`) resolves a value by (1) exact slug in
  `bySlug`, then (2) exact display name in `byName`; a name-match of more than
  one element returns `{ found, ambiguous: true, elements }`. The
  separator-normalized and legacy-marker steps are already gone (S4-2 applied).
- `validateReferences` walks `model.matrices` / `matrix.cells` and passes
  `cell.row` / `cell.col` to `resolveReferenceTarget` with no context. An
  ambiguous match yields `AMBIGUOUS_ELEMENT_NAME` at severity `warning`
  (S4 amendment `5b89ac29`).
- `ElementIndexes` keys elements by `slug` and `name`; each `ElementNode` carries
  `type`, its owning concept name.
- **Empirical measurement (temporary scan over every tracked `*_NN.md`).** On
  `origin/dev`: **20 unique ambiguous headers across 10 files**, 83 raw cell
  occurrences. Every one has `ctxHits=1` — exactly one name-match belongs to the
  matrix's declared `source` (row) or `target` (column) concept. (Before S4-2
  fixed the non-write-once workflow sample the count was 23/11; the S4 handoff
  number is stale by three.)
- Representative cases: `Activities/Equipment Maintenance` vs
  `Costs/Equipment Maintenance` in a matrix declaring `source: Activities`;
  `Offerings/FORMAT Engine (Open Source)` vs `Resources/FORMAT Engine (open
  source)` in a matrix declaring `target: Resources`; `Stage/Video Script` vs
  `ArtifactType/Video Script`.
- `iNNfo/validation-baseline.json` diffs **errors** only (`diffNewOnly` over
  `Diagnostics.errors`); matrix warnings are added via `addAsWarning` in
  `validator/knowledge.ts`, so resolving them does not perturb the baseline.

## D1 — Where the context comes from

The matrix itself. `MatrixData` carries `source` (row-axis label) and `target`
(column-axis label), both parsed from the table header or the frontmatter
declaration. For a row header the context concept is `matrix.source`; for a
column header it is `matrix.target`.

## D2 — Resolver signature

`resolveReferenceTarget(value, indexes, context?: { concept?: string })`.
The argument is optional, so the two existing callers (matrix row/col) are the
only ones that pass it; field references keep calling with two arguments.
The function is internal to the package (not re-exported from `src/index.ts`,
which exports only `validateReferences` and `validateElementFieldReferences`),
so this is not a public API break.

## D3 — Algorithm

1. Exact slug match → resolved (unchanged; slugs are unique per model).
2. Exact display name, single match → resolved (unchanged).
3. Exact display name, multiple matches:
   - If `context.concept` is non-empty, keep only candidates whose `type`
     equals it case-insensitively.
   - Exactly one survivor → resolved, `matchedBy: 'name'`, no `ambiguous` flag.
   - Otherwise → `ambiguous: true` with the **full** original candidate list, so
     the diagnostic still lists every option.

Context is applied only to break a pre-existing name tie. It never turns a
single name-match into a different element, and it is never applied to the slug
path.

## D4 — Severity

Unchanged. Matrix residual ambiguity stays `warning`; field/wikilink ambiguity
stays `error`. This change only removes ambiguity where context makes it
resolvable.

## D5 — Residual message (decision)

The brief left the message/severity improvement open. Decision: **keep severity,
improve the message**. When a context concept was supplied but did not
disambiguate, the matrix message appends a clause naming the axis that was tried
(`the matrix source concept "X" did not disambiguate`), so an author knows the
matrix already tried its own axes and must use a slug or a qualified reference.
When no context was available (empty axis label), the message is unchanged.
Machine-readable diagnostics are asserted by `code`, not prose, so this is safe.

## D6 — Public contract

`validateReferences` output shrinks by the resolved headers. `ElementResolutionResult`
gains no new public surface (internal type). No barrel/export change. The
committed MCP CDN bundle (`innfo-mcp/bin/innfo-mcp.bundle.js`, which embeds
`innfo-core`) is regenerated so its bytes match the new resolver.

## D7 — Interaction with S4

S4 (`2026-10-13-s4-retire-legacy-migration-flows`) also MODIFIES the
`stable-element-identity` *Diagnostics for Unfrozen Models and Ambiguous Names*
requirement, and its amended text already asserts that matrix `source`/`target`
disambiguate intent while the matrix diagnostic stays advisory — yet its
scenario *"An ambiguous matrix header is a non-blocking warning"* uses
`Public Relations`, which context resolution now resolves. So:

- This change's delta is written against **S4's amended requirement text**, and
  S4 is a declared prerequisite (it must archive first).
- This change **revises** that S4 scenario: the `Public Relations` case becomes
  the positive context-resolution scenario, and a new scenario keeps the
  advisory warning for a matrix whose axis does not disambiguate.

## Cross-cutting

`strict_tdd: true`. `node scripts/verify.js` (suite discovery + ledger guard) and
`npx openspec validate --strict` gate. No sample, fixture, version, or baseline
file changes.
