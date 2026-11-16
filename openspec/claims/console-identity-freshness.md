# claim: console-identity-freshness

branch: session/console-identity-freshness
opened: 2026-11-16
thread: opencode subagent (batch b10f — identity and freshness: d13, d06, d05)

area:
  - scripts/export-console.mjs
  - scripts/console-views.mjs
  - test/console-export.test.mjs
  - test/console-export-files.test.mjs
  - openspec/backlog_NN.md
  - openspec/claims/console-identity-freshness.md

# Scope: one file, three items of batch b10f, landed in this order.
# d13 console-builder-d13-asset-candidates: the duplicated bundle/asset and CSS
# candidate lists become one list each, the legacy shell name and the `innfo|nn`
# dual read keep their current behaviour, and a test pins the resolution order.
# d06 console-builder-d06-model-identity-path: `meta.models[].filePath` and the
# element `modelFile` carry the repository-relative path instead of the bare file
# name, so two same-named models in different folders stay distinct; the readers
# keep accepting both forms.
# d05 console-builder-d05-stale-asset-fingerprint: `--stale` re-exports when a view
# script or `nn-ui.css` changed, instead of only comparing bundle and shell mtimes.
#
# Accepted overlap: openspec/backlog_NN.md is also listed by the claim files of
# merged sessions (console-fixture-assets, console-scan-errors) whose claims were not
# deleted on landing. This session only retires the three items above: their status
# and evidence lines, never another item and never a batch-zone line.
