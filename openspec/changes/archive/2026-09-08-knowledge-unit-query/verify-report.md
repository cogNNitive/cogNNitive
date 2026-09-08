# Verify Report: Knowledge-Unit Query Language

Verified 2026-09-08 on `dev` against `specs/`, `design.md`, `tasks.md`. Depends on the
URI change (verified separately); joint release 0.5.0.

## Requirement coverage

| Spec requirement | Evidence |
|---|---|
| Query grammar (`?`, AND, trailing projection, XOR, rejections) | `queryUnits.spec.ts` grammar matrix green |
| CSV match + projection + order + determinism | Enterprise/`mrr_usd` cases green (incl. rerun equality) |
| MD match (membership, scalar leniency, prose exclusion) | `tags=vip`, case-insensitive scalar, `catalyst` negative green |
| Empty set (never error) + unknown column/field errors | Cases green |
| File-absent error | `gone.csv` case green |
| Nearest-section ownership | Shared `sectionOwnLines`; parent-concept negative scenario green |
| Provenance exclusion (`QU_NOT_PROVENANCE`) | Core validator tests green |
| `query_units` tool (read-only, cap, no-write) | Round-trip + 250→100 `truncated` + byte-identical workspace tests green |
| Registration (16 tools) | `server.spec.ts` count test green |
| Skill docs | `@` XOR `?` retrieval rule in `nn-innfo` §4 |

## Suite totals (fresh, shared with URI verify)

- innfo-core: 42 files, **533 passed** (incl. 20 query tests)
- innfo-mcp: 24 files, **213 passed** (incl. 3 query-units + updated count test)
- `tsc` clean; ESLint 0 errors on touched files.

## Known exceptions

Same pre-existing/concurrent list as the URI verify-report (metrics-template test,
MCP coverage debt → backlog #17, business manifest mismatch, stale lock) — none from
this change. The `?`-in-provenance rule adds no new failure modes (dedicated error
before both parsers; non-query garbage keeps `KU_MALFORMED`).

## Verdict

**PASS WITH NOTED EXCEPTIONS** — the query capability is implemented, proven, and
folds into the joint 0.5.0 release with no solo-release residue.
