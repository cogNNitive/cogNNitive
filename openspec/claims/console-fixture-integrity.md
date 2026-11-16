# claim: console-fixture-integrity

branch: session/console-fixture-integrity
pr: 684
opened: 2026-11-16

area:
  - scripts/export-console.mjs
  - scripts/verify.js
  - scripts/lib/console-fixture-freshness.js
  - test/console-export.test.mjs
  - test/fixtures/testlab/domaiNN_console.html
  - test/ui/testlab_smoke.py
  - test/ui
  - openspec/backlog_NN.md
  - openspec/claims/console-fixture-integrity.md

notes:
  - Batch b18 (console-fixture-regeneration-gate, console-domain-id-path-hash,
    console-ui-smoke-current-console). The committed fixture is regenerated here, which
    is why it is claimed: any other live export of test/fixtures/testlab would conflict
    by design.

excludes:
  - scripts/lib/freshness-guards.js
  - scripts/export-console.test.mjs
