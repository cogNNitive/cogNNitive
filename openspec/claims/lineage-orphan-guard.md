# claim: lineage-orphan-guard

branch: session/lineage-orphan-guard
pr: 693
opened: 2026-11-16
thread: backlog batch b3g-orphan-model-guard, item orphan-model-lineage-guard (issue #587)

area:
  - iNNfo/packages/nn-core/src/changelog/audit.ts
  - iNNfo/packages/nn-core/src/changelog/drift.ts
  - iNNfo/packages/nn-core/src/console/index.ts
  - iNNfo/packages/nn-core/tests/changelog/audit.test.ts
  - scripts/export-console.mjs
  - scripts/export-console.test.mjs
  - iNNfo/specs/bluepriNNts/console/console-payload.generated.cjs   # generated
  - iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/nn-core.generated.cjs   # generated
  - iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js   # generated
  - openspec/backlog_NN.md
  - openspec/claims/lineage-orphan-guard.md

notes:
  - iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js is a generated consequence, not a source
    edit: since #687 the bundle inlines nn-core from source, so any nn-core change makes
    `node scripts/build-mcp-bundle.mjs --check` diverge until the artifact is rebuilt. It
    is listed here only for whoever owns the source, and is regenerated, never hand-edited.
