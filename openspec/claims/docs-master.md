# Claim: docs-master

Single-file master document for the Docsify suite, generated from the DocSite model.

- `scripts/generate-docs-master.mjs` (new generator + `--check`)
- `scripts/generate-docs-master.test.mjs` (new)
- `scripts/generate-docsify-suite.mjs` (export `orderPageTree`, `pageTitle`, `pageRoute`)
- `scripts/regen.js` (wire the master generator into the regen pass)
- `docs/documentation/documentation_NN.md` (register the master page)
- `docs/documentation/master.md` (new, generated)
- `docs/documentation/_sidebar.md`, `docs/documentation/llms.txt`,
  `docs/documentation/ai-index.yaml` (regenerated from the model)
