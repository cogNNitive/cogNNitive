# claim: console-provenance

branch: session/console-provenance
pr: 670
opened: 2026-11-16
thread: opencode subagent (batch b12 — a payload map nothing reads)

area:
  - iNNfo/packages/nn-core/src/console/element-history.ts
  - iNNfo/packages/nn-core/src/console/payload-builder.ts
  - iNNfo/packages/nn-core/tests/console-element-history.test.ts
  - scripts/console-views.mjs
  - scripts/export-console.mjs
  - scripts/console-size-budget.test.mjs
  - test/console-export.test.mjs
  - test/console-payload-provenance.test.mjs
  - openspec/backlog_NN.md
  - openspec/claims/console-provenance.md

# Scope: retire console-unread-provenance-payload. The exporter stops attaching
# `element.provenance` (element-history.ts), the never-set element field leaves
# `ConsolePayloadElement`, and the second degrade step becomes
# `stripConsoleHistory` with the `strip-citations+history` strategy. `element.history`
# keeps shipping; matrix `cell.provenance` is out of scope (follow-up recorded in the
# item's evidence only). No batch-zone line and no other item.
#
# claim-check against the areas exits 0 ("area is free"). It reports five released
# tombstones — console-fixture-assets (#664), console-focus-mount (#668),
# console-identity-freshness (#669), console-scan-errors (#665) and
# console-views-hygiene (#666) — whose PRs are no longer open, so they are not live
# locks and this session does not touch those files. The only open PRs are #667 and
# #661 (coNNtent blueprint work); neither writes any path above. This session edits the
# paths listed here and nothing else.
