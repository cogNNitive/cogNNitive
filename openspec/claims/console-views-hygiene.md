# claim: console-views-hygiene

branch: session/console-views-hygiene
opened: 2026-11-16
thread: opencode subagent (batch b10g — console-views hygiene)

area:
  - scripts/console-views.mjs
  - scripts/export-console.mjs
  - test/console-views-lib.test.mjs
  - openspec/backlog_NN.md
  - openspec/claims/console-views-hygiene.md

# scripts/export-console.mjs is touched for one thing only: coreBlueprintOf delegates
# to parseSpecName (console-builder-d15-spec-name-parser). Nothing else in that file.
# Retires console-builder-d15-spec-name-parser, console-builder-d18-view-id-discovery
# and console-builder-d24-scanner-division-row; no other item and no batch-zone line.

# Accepted overlap (claim-check exit 1, 7 conflicts, all from released leftovers):
# console-batch-plan, console-bundle-test, console-files-inventory and
# console-view-warnings list openspec/backlog_NN.md, scripts/console-views.mjs,
# test/console-views-lib.test.mjs and scripts/export-console.mjs. Every one of those
# branches is already an ancestor of origin/main (git merge-base --is-ancestor: true
# for all four), so their claim files are tombstones, not live locks. Open PR #663
# (session/claims-cleanup) only deletes those four files; it writes none of my areas.
# This session edits the four literal paths above and nothing else.
