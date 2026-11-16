# claim: console-fixture-assets

branch: session/console-fixture-assets
opened: 2026-11-16
thread: opencode subagent (batch b16 — TestLab fixtures declare a dead stylesheet)

area:
  - test/fixtures/testlab
  - test/fixtures/testlab/domaiNN_console.html
  - openspec/backlog_NN.md
  - openspec/claims/console-fixture-assets.md

# Scope: retire the two frozen `innfo-ui.css` copies under
# test/fixtures/testlab/artifacts/*_console/ and the `<link>` that loads them from
# the two stamped 2026-10-13 console snapshots, then regenerate the committed
# domaiNN_console.html so its artifact index carries no `innfo-ui.css` entry.
# No exporter, shell or bundle code changes: the reference is fixture data, not
# the exporter.
#
# Accepted overlap: openspec/backlog_NN.md is also listed by console-batch-plan,
# console-bundle-test, console-files-inventory and console-view-warnings, all of
# which are MERGED PRs (#658, #662, #659, #660) whose claim files were not deleted
# on landing. Open PR #663 (session/claims-cleanup) deletes exactly those four
# stale claim files; it does not touch this claim. This session only retires the
# single item console-fixture-stale-assets: its status/evidence lines, never
# another item and never a batch-zone line.

pr: 664
