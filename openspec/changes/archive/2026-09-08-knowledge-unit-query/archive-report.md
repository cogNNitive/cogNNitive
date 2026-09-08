# Archive Report: Knowledge-Unit Query Language

Archived 2026-09-08 from `openspec/changes/2026-09-08-knowledge-unit-query/` (SDD cycle
complete: proposal → specs → design → tasks → apply → verify). Hard-sequenced after
the URI change (its resolver, types, and CSV reader).

## Stale-checkbox reconciliation

- `tasks.md` Slices 1–2: all boxes `[x]` (1.1–1.8, 2.1–2.6). No stale open boxes. Open
  by design and carried forward: CSV delimiter default, result-cap value (100, in the
  tool adapter), `op.` operator namespace (reserved, v2).
- `verify-report.md`: PASS WITH NOTED EXCEPTIONS (shared pre-existing list with the
  URI change; nothing from this change).

## What shipped (uncommitted, on `dev`)

Pure query engine (`parseKnowledgeQuery`, `runQuery`, `querySections`), `QU_NOT_PROVENANCE`
validator rule, read-only `query_units` MCP tool (16th tool, capped, traversal-guarded),
skill retrieval rule. Release folded into joint 0.5.0 — no solo-release residue.

## Next

Same as URI change: commit + batched merge via integrity/release skills on explicit
order. No independent release steps remain for this change.
