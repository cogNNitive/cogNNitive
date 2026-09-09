# Tasks: Knowledge-Unit Query Language

## Pre-flight / confirm before starting (open questions — do NOT silently resolve)

- [ ] **(a) CSV delimiter assumption.** Spec assumes comma-only RFC 4180 subset in v1.
  If the maintainer needs `;`-delimited CSVs in v1 scope, AD-2 must gain a delimiter
  sniff/port BEFORE Slice 1. Default: comma-only, documented.
- [x] **(b) Result cap.** RESOLVED by spec: hard cap 100 + `truncated: true`.
- [x] **(c) Empty `path?`.** RESOLVED by spec: parse error.
- [x] **(d) MD prose in projection.** RESOLVED by spec: full field value, caller trims.
- [x] **(e) Sequencing.** HARD: URI change Slice 1 (pointer types + resolvers) lands first;
  query Slice 1 starts after. No parallel apply across the seam.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600 total across slices (S1 ~350 · S2 ~250) |
| Repo 800-line budget (`iNNfo/AGENTS.md`) | Every slice is under it |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes (2 PRs, stacked after URI PR1) |
| Suggested split | PR1 core query module → PR2 validator rule + MCP tool + docs |
| Delivery strategy | ask-on-risk (assumed — not supplied) |

### Suggested Work Units

| Unit | Goal | PR | Base / depends on | Notes |
|------|------|----|-------------------|-------|
| 1 | `queryUnits` + `querySections` pure modules + specs (CSV via shared `csvTable.ts` from URI PR1) | PR1 | URI PR1 merged | sync snapshots, inline fixtures, zero deps |
| 2 | `?`-rejection validator rule + `query_units` MCP tool + skill docs + fold into 0.5.0 | PR2 | PR1 (this change) | release folds into URI Slice 4 unless query lands first |

Dependency graph: `URI-PR1 ─► Q-PR1 ─► Q-PR2 ─► (joint 0.5.0 with URI-PR4)`.

## Slice 1 — Core query module (pure)

Depends on: URI Slice 1 merged; pre-flight (a) confirmed. Blocks: slice 2. Est. ~350 lines.

- [x] 1.1 RED — `src/queryUnits.spec.ts`: grammar matrix (`?a=1`, `?a=1&b=2` AND,
  `?a=1&proj` projection, `@…?…` parse error, bare `path?` parse error, `%3D`-escaped
  values); match matrix (case/trim insensitivity, list membership, empty-set-no-error,
  unknown column error, document order stability across reruns). Fails (no module).
- [x] 1.2 GREEN — `parseKnowledgeQuery` (XOR enforcement, percent-decode, literal `op.`
  values) + `KnowledgeQuery`/`QueryResult` types per AD-1.
- [x] 1.3 RED — CSV cases over fixture copy of `metricas_q3.csv`: `?segmento=Enterprise`
  → `{@101,@102,@104}`; `…&mrr_usd` → `{45000,32000,78000}`; quoted-comma cells;
  unbalanced-quote file → empty + error diagnostic.
- [x] 1.4 GREEN — reuse shared `csvTable.ts` (`parseCsvTable`) from URI Slice 1 — no local
  CSV reader; headers normalized, unbalanced-quote file → empty + error diagnostic (the
  CSV cases stay in this slice's spec).
- [x] 1.5 RED — MD cases over Ghostbusters fixture: `?tags=vip` → Dana Barrett URI;
  scalar exact (`?relationship_model=…`); prose-only content never matches.
- [x] 1.6 GREEN — `querySections.ts` (AD-3: `extractHeadings` + `key::` scan + generalized
  list-split) and `runQuery(query, snapshots)` (AD-1) reusing the URI change's cell/field
  resolver for projection — no duplicated pointer logic. New shared types (`FileSnapshot`,
  `KnowledgeQuery`, `QueryResult`) live alongside the pointer types (see URI 1.6 — no
  third types home).
- [x] 1.7 GREEN — exports in `index.ts` + `browser.ts`.
- [x] 1.8 VERIFY — `npm --prefix iNNfo run test` (core scope), lint, typecheck.

## Slice 2 — Validator rule + MCP tool + docs + release fold-in

Depends on: slice 1. Est. ~250 lines.

- [x] 2.1 RED — validator test: `sources:: metricas_q3.csv?segmento=Enterprise` yields the
  dedicated `error` (queries-not-provenance + pointer suggestion), not the generic
  malformed diagnostic; non-query malformed values keep the old message.
- [x] 2.2 GREEN — `?`-detection + error rule in `validator/workspaceSources.ts` (AD-6).
- [x] 2.3 RED — MCP `tools/query-units.spec.ts`: round-trip over fixture workspace
  (URI set + projection values + diagnostics); 250-match fixture → first 100 +
  `truncated: true`; tool creates/writes nothing (assert workspace bytes identical).
- [x] 2.4 GREEN — `tools/query-units.ts` adapter (fs snapshots sorted by path, AD-1) +
  `server.ts` registration + documented tool-count bump; update `server.spec.ts` count
  15→16. Declarative tool registry explicitly DEFERRED (follow-up backlog item, out of
  this slice).
- [x] 2.5 GREEN — skill docs: `nn-innfo` retrieval section with `@` XOR `?` rule and
  provenance-exclusion examples.
- [x] 2.6 VERIFY — core + MCP suites, lint, typecheck; fold version bump + CDN/manifest/
  docs regen into the joint 0.5.0 (URI Slice 4) — no solo release for this change.
