# Apply Progress: Knowledge-Unit URI

All slices applied on `dev`, TDD, uncommitted. Checkboxes in `tasks.md` are the
record; this file is the narrative mirror.

- **Slice 1 (core)** — `parseKnowledgeUnitRef`, revised normalization (NFC,
  non-Latin kept, bounded-`--` split-join, `normalizeName`, concept-aware `--`),
  shared `nfc()`/`stripCombiningMarks()` with `parser/slug.ts`, `csvTable.ts`
  (delimiter param), `unitResolve.ts`, extended `SourceRef`, exports. Pinned
  downstream test (`agentModification.spec`) updated honestly. Fixtures in
  `tests/fixtures/`.
- **Slice 2 (validator + MCP + docs)** — extended `SourceResolver`
  (`{exists,headings,content}`), 9 `KU_*` codes + `code` on `ReferenceDiagnostic`,
  dual-accept with timeline-neutral deprecation + level-precise suggestions,
  `attachSourceCitations` tries pointers first, MCP disk resolver single-read,
  `nn-innfo` §4 + `citations.md` rewritten to `@` + CSV-direct, JS mirror
  (`slugifyUnitHeading`, `normalizeName`, `headingSlugParts`) + parity 15/15.
- **Slice 3 (editor)** — `parseForPill` replaces 3 local parsers, Pill `file@unit`
  label + prop pass-through, `useUnitResolution` composable, modal CSV table +
  row/cell highlight + field highlight + unit badge, `?ku=` preservation verified
  (no fix needed), Playwright guard-redirect e2e.
- **Slice 4 (release 0.5.0)** — bumps (core, MCP, editor, root + dep ranges),
  tsup bundle, CDN manifest, `source.yaml` refs, catalog `--check` clean, full
  `build-docs.mjs`, version-square green.

Deferred per design: element-level Matrix Definitions, explicit key-column
declaration, query language (own change), editor auto-open on `?ku=`.
Open decisions carried forward: legacy `#slug` sunset timeline; CSV delimiter
default (comma, parameterized).
