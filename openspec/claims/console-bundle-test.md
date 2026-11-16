# claim: console-bundle-test

branch: session/console-bundle-test
opened: 2026-11-16
thread: opencode subagent (batch b15 — console bundle render test)

area:
  - test/console-bundle-render.test.mjs
  - test/helpers/console-boot.mjs
  - openspec/backlog_NN.md
  - openspec/claims/console-bundle-test.md

# Accepted overlap: two existing claims list openspec/backlog_NN.md —
# console-batch-plan (merged as PR #658) and console-files-inventory (merged as
# PR #659, this session's base commit edae350d). Both PRs are MERGED and neither
# claim was deleted on landing, so both are released leftovers, not live locks.
# Re-checked with `gh pr list --state open`: no open PR at all. This session only
# retires the single item console-bundle-render-test: its status/evidence lines
# and its batch-zone item list, never another item.
#
# This claim adds no production code: the test reads the committed
# iNNfo/specs/bluepriNNts/console/nn-console.bundle.js and
# scripts/lib/console-bundle.js, and writes neither.
