# claim: console-focus-mount

branch: session/console-focus-mount
opened: 2026-11-16
thread: opencode subagent (batch b13 — a deep link must not mount the whole list)

area:
  - iNNfo/specs/bluepriNNts/console/nn-runtime.js
  - iNNfo/specs/bluepriNNts/console/nn-console.bundle.js   # generated
  - test/console-bundle-render.test.mjs
  - test/console-ku-tree-guard.test.mjs
  - test/console-declared-field-types.test.mjs
  - openspec/backlog_NN.md
  - openspec/claims/console-focus-mount.md

# Scope: `mountElementCards` passes `projectedElements.length` as the chunked()
# page size whenever `focusId` is set, so a deep link (`#el-<id>`), a
# `focusElementCard` call and a saved `uiState.selectedElementId` all mount every
# card. Measured on a 2,901-element domain: 214 MB / 21,111 DOM nodes at boot vs
# 621 MB / 222,477 nodes fully expanded. Fix: mount the page that holds the
# focused card up front and page the rest in document order on demand, so
# `focusElementCard` can still scroll to a card that was not mounted yet.
# RENDER_PAGE stays 100; no virtual scroller.

pr: 668

# Accepted overlap: openspec/backlog_NN.md is also listed by the console-batch-plan,
# console-bundle-test, console-files-inventory, console-view-warnings and
# console-fixture-assets claims for PRs #658, #662, #659, #660 and #664 (all merged
# or open cleanup work). This session only retires the single item
# console-focus-mount-budget: its status/evidence lines, never another item and
# never a batch-zone line.
