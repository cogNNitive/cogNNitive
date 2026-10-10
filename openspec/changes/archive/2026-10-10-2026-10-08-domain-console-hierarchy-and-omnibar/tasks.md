# Tasks: Domain Console Hierarchy, KU Identity & Faceted Omnibar

- [x] 1. **Domain Payload Enrichment (`scripts/export-console.mjs`)**
  - Enrich elements with `modelId`, `modelFile`, `canonicalUnit`, and `unitSlug`.
  - Add `model.meta.models` catalog in `domainPayload`.
- [x] 2. **Faceted Omnibar Search (`iNNfo/specs/bluepriNNts/console/innfo-runtime.js`)**
  - Implement `parseFilterQuery` for `model:`, `file:`, `concept:`, `tag:`, and free text terms.
  - Update `filterElements()` to evaluate facets against elements.
  - Sync active query to URL hash `#q=...`.
- [x] 3. **Hierarchical Rail with DaisyUI & Preact (`innfo-runtime.js`)**
  - Upgrade `renderRail()` to render a hierarchical accordion when `meta.models` is present.
  - Hook model and concept clicks to toggle facets in the Omnibar.
- [x] 4. **Card KU Locator Affordance & Discrete Styling**
  - Add source file pill and click-to-copy canonical KU locator to element cards.
  - Apply 1.5px concept color border on badges and 3px left border on cards.
- [x] 5. **Bundle Rebuild & Verification**
  - Rebuild console bundle (`npm run build:console`).
  - Regenerate `domaiNN_console.html` and verify rendering with `node --test test/console-domain-hierarchy.test.mjs`.
