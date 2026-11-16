# claim: console-scan-errors

branch: session/console-scan-errors
pr: 665
opened: 2026-11-16
thread: opencode subagent (batch b10d — silent scan read errors)

area:
  - scripts/export-console.mjs
  - test/console-export-files.test.mjs
  - openspec/backlog_NN.md
  - openspec/claims/console-scan-errors.md

# Accepted overlap: claim-check reports six conflicts, all leftovers of MERGED PRs
# whose claim files were not deleted on landing (checked with `gh pr view <n>`):
#   console-batch-plan      -> PR #658 MERGED 2026-11-16T08:46:24Z
#   console-bundle-test     -> PR #662 MERGED 2026-11-16T09:42:50Z
#   console-files-inventory -> PR #659 MERGED 2026-11-16T09:15:41Z
#   console-view-warnings   -> PR #660 MERGED 2026-11-16T09:42:41Z
# No live lock covers scripts/export-console.mjs or test/console-export-files.test.mjs:
# PR #659 (files-inventory) is in this branch's base commit. The only open PRs are
# #663 (session/claims-cleanup, deletes those four stale claim files and touches
# nothing else but openspec/claims/) and #661 (coNNtent blueprint docs); neither
# writes my three code/docs areas.
#
# Scope: this session retires exactly one item, console-builder-d07-scan-read-errors
# (its status/evidence lines), never another item and never a batch-zone line.
