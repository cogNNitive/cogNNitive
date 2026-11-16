# claim: console-output-capture

branch: session/console-output-capture
pr: 681
opened: 2026-11-16

area:
  - scripts/export-console.mjs
  - test/console-export.test.mjs
  - test/console-export-files.test.mjs
  - openspec/backlog_NN.md
  - openspec/claims/console-output-capture.md

notes:
  - Retires backlog item console-builder-d08-output-capture (batch b10h).
  - The output writer lives inside scripts/export-console.mjs, not a new scripts/lib module:
    the installer distributes that file flat next to console-views.mjs (manifest/source.yaml
    console_assets), so an extra import would break the installed set.
  - openspec/claims/console-writer-contract.md is the claim of merged PR #680 and still lists
    the same paths; claim-check reports it as released, so no overlap is accepted.
