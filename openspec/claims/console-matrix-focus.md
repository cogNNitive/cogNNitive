# claim: console-matrix-focus

branch: session/console-matrix-focus
opened: 2026-11-16

area:
  - iNNfo/packages/nn-core/src/console/payload-builder.ts
  - iNNfo/packages/nn-core/src/console/element-history.ts
  - iNNfo/packages/nn-core/tests                            # builder-level payload shape
  - iNNfo/specs/bluepriNNts/console/nn-runtime.js
  - iNNfo/specs/bluepriNNts/console/nn-console.bundle.js   # generated
  - iNNfo/specs/bluepriNNts/console/console-payload.generated.cjs   # generated
  - scripts/console-views.mjs                              # degrade ladder, only if it must change
  - scripts/export-console.mjs                             # degrade reporting, only if it must change
  - test/console-payload-provenance.test.mjs
  - test/console-bundle-render.test.mjs
  - test/console-export.test.mjs                           # only if its payload pins must move
  - openspec/backlog_NN.md
  - openspec/claims/console-matrix-focus.md

notes:
  - Retires backlog items console-matrix-provenance-payload and console-focus-refresh-reveal (batch b17).
  - The generated bundle and the payload mirror are regenerated from their sources, never hand-edited.
