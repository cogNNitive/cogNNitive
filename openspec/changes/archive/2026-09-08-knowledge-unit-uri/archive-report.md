# Archive Report: Knowledge-Unit URI

Archived 2026-09-08 from `openspec/changes/2026-09-08-knowledge-unit-uri/` (SDD cycle
complete: proposal → specs → design → tasks → apply → verify).

## Stale-checkbox reconciliation

- `tasks.md` Slices 1–4: all boxes `[x]` (1.1–1.8, 2.1–2.7, 3.1–3.4, 4.1–4.4). No stale
  open boxes. Two pre-flight items intentionally remain open by design and are
  recorded as carried-forward decisions, not stale work:
  - Legacy `#slug` sunset timeline (warning copy is timeline-neutral).
  - CSV delimiter default (comma; `CsvTableOptions.delimiter` hedges it).
- `verify-report.md`: PASS WITH NOTED EXCEPTIONS (all exceptions pre-existing or
  concurrent, itemized there). No unresolved verification debt from this change.

## What shipped (uncommitted, on `dev`)

Pointer grammar `path@unit(&subunit)*` across core/validator/MCP/editor/skills, joint
release files at 0.5.0, version-square green. Delta specs in `specs/` are the archived
truth of what was built (including the archive-time sync: `--` preservation and
nearest-section ownership scenarios).

## Follow-ups (elsewhere, not in this change)

- Backlog #12–#17 (registry, collector, CDN CI, slug codegen, readText helper,
  MCP coverage debt) — spun out during deep-impact analysis.
- Deferred by design: element-level Matrix Definitions, explicit key-column
  declaration, editor auto-open on `?ku=`.

## Next

Commit + batched merge via `nn-dev-check-integrity` / `nn-dev-release` (explicit
maintainer order required; sibling release traffic on `main`/`dev` must be reconciled —
`source.yaml` was rewritten by a concurrent agent twice during this session).
