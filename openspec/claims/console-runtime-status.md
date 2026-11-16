# claim: console-runtime-status

branch: session/console-runtime-status
opened: 2026-11-16

area:
  - iNNfo/specs/bluepriNNts/console/nn-runtime.js
  - iNNfo/specs/bluepriNNts/console/nn-console.bundle.js   # generated
  - iNNfo/specs/bluepriNNts/console/package.json
  - scripts/lib/console-bundle.js
  - scripts/export-console.mjs
  - test/console-bundle-render.test.mjs
  - test/console-export.test.mjs
  - test/console-export-files.test.mjs
  - openspec/backlog_NN.md
  - openspec/claims/console-runtime-status.md

notes:
  - Retires backlog items console-runtime-release-identity and console-synthetic-changes-freshness (batch b11b).
  - package.json is claimed only to pin its version in a test; no version bump is planned.
