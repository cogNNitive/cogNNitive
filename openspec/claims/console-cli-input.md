# claim: console-cli-input

branch: session/console-cli-input
pr: 679
opened: 2026-11-16

area:
  - scripts/export-console.mjs
  - scripts/console-views.mjs
  - test/console-view-scaffold.test.mjs
  - test/console-export.test.mjs
  - test/console-export-files.test.mjs
  - openspec/backlog_NN.md
  - openspec/claims/console-cli-input.md

accepted_overlap:
  - openspec/claims/console-followups.md claims openspec/backlog_NN.md and openspec/claims;
    its PR #674 is merged, so the claim is a merged-PR leftover and is released. It is not
    deleted here; each session retires its own items in the backlog, so the overlap is
    accepted as append-only.

excludes:
  - scripts/export-console.test.mjs
