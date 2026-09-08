# Apply Progress: Knowledge-Unit Query Language

All slices applied on `dev`, TDD, uncommitted. Depends on URI Slice 1 (present in tree).

- **Slice 1 (core engine)** — `parseKnowledgeQuery` (`@` XOR `?`, trailing-only
  projection, literal `op.` values), pure `runQuery` over `FileSnapshot[]` returning
  canonical URI sets (+ 1:1 projection values), `querySections.ts` structural scanner,
  shared `csvTable.ts` reuse, `splitBracketList` (quoted-comma safe;
  `splitSourceFieldValue` deliberately untouched), nearest-section ownership shared
  via `sectionOwnLines`. 20 tests green.
- **Slice 2 (validation + tool + docs)** — `QU_NOT_PROVENANCE` rule in the validator
  (before both parsers), `query_units` MCP tool (read-only, cap 100 + `truncated`,
  traversal guard, no-write proof test), server registration (definition + dispatch +
  handler + envelope, count 15→16), `nn-innfo` retrieval rule (`@` XOR `?`).
- Release folded into joint 0.5.0 (URI Slice 4) — no solo release.

Deferred per design: operators (`op.` namespace reserved), OR, `@unit?...` combos,
sorting/pagination, full-text, index acceleration, editor search UI.
Open decisions carried forward: CSV delimiter default (comma, parameterized in
`CsvTableOptions`); result-cap value (100, in tool adapter).
