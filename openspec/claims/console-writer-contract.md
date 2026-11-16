# claim: console-writer-contract

branch: session/console-writer-contract
opened: 2026-11-16

area:
  - scripts/export-console.mjs
  - iNNfo/packages/nn-mcp/src/tools/console-regeneration.ts
  - test/console-export.test.mjs
  - test/console-export-files.test.mjs
  - openspec/backlog_NN.md
  - openspec/claims/console-writer-contract.md
  - openspec/claims/console-followups.md

accepted_overlap:
  - openspec/backlog_NN.md <- openspec/claims/console-followups.md. That claim belongs to
    merged PR #674, carries no `pr:` line, and is a merged-PR leftover; this session deletes
    the file as housekeeping. Its only area was openspec/backlog_NN.md and openspec/claims,
    and every session retires its own items, so the overlap is append-only.

excludes:
  - scripts/export-console.test.mjs
