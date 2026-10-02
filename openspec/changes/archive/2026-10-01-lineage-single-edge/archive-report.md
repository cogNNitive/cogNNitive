# Archive Report: 2026-10-01-lineage-single-edge

Archived: 2026-10-02
Verify verdict: PASS WITH WARNINGS (accepted by maintainer)

## Specs synced to `openspec/specs/`

| Capability | Action | Requirements (delta / living) |
|---|---|---|
| citation-parser-resolver | created | 6 added / 6 |
| console-field-citations | merged (3 ADDED appended, 1 MODIFIED replaced in place) | 3 delta / 6 living (was 4) |
| document-citations | merged (4 MODIFIED replaced in place) | 4 delta / 7 living (unchanged count) |
| editor-lineage-ui | created | 6 / 6 |
| lineage-bluepriNNts-docs | created | 5 / 5 |
| lineage-record-sync | living file was a one-requirement delta stub; rebuilt from the delta. Old "Execution runs are appended under Executions" requirement renamed to "Procedure runs are appended under Procedures" (4 ADDED + 1 MODIFIED); REMOVED "Backward compatibility with legacy Procedures entries" (it was a scenario of the old requirement, gone with the replacement) | 6 delta headers / 5 living |
| lineage-single-edge | created | 7 / 7 |
| nn-trannsform-lineage-checks | created (ADDED + MODIFIED both treated as new, no prior living spec) | 3 / 3 |
| source-sidecar | created (ADDED + MODIFIED both treated as new, no prior living spec) | 4 / 4 |

New capabilities lacking a Purpose in the delta carry the standard "TBD - created by archiving change" placeholder.

## Deferred / follow-ups

- W4: sample consoles lack `meta.sources` because `scripts/export-console.mjs` does not use `buildConsolePayload`. Handled by change `2026-10-02-cognitivize-in-place`, slice S4.
- Release coupling: a templates-v* / skills-v* tag plus manifest repin is required before merging to `main`.
