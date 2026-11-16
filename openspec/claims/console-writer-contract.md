# claim: console-writer-contract

branch: session/console-writer-contract
pr: 680
opened: 2026-11-16

area:
  - scripts/export-console.mjs
  - iNNfo/packages/nn-mcp/src/tools/console-regeneration.ts
  - iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js
  - test/console-export.test.mjs
  - test/console-export-files.test.mjs
  - openspec/backlog_NN.md
  - openspec/claims/console-writer-contract.md

notes:
  - openspec/claims/console-followups.md was deleted here: it belonged to merged PR #674,
    carried no `pr:` line, and so reported a live conflict on openspec/backlog_NN.md
    forever. Its area is free again, which is why this claim records no accepted overlap.

excludes:
  - scripts/export-console.test.mjs
