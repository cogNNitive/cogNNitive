# Tasks: Template Composition Integrity, Source Content-Hash Deduplication, and Contextual Skill UX

- [x] 1. **Semantic Composition Validation in Preflight & Integrity Checks**
  - [x] 1.1 Implement AST composition and namespace collision validator in `@cognnitive/innfo-core`.
  - [x] 1.2 Integrate composition validator into `scripts/preflight-check.js` and `actioNN/skills/nn-preflight`.
  - [x] 1.3 Add test suite verifying that preflight flags conflicting concept names or broken matrix targets in composed templates.

- [x] 2. **Resolve Template Composition Collisions in `business_V_0-2-4`**
  - [x] 2.1 Audit concept definitions across `business-model`, `analysis`, `organization`, `projects`, and `metrics` sub-templates.
  - [x] 2.2 Fix namespace collisions for `Metrics` in `specs/business_V_0-2-4_NN.md` and `specs/templates/business/V_0-2-4/business_V_0-2-4_NN.md`.
  - [x] 2.3 Add unit test validating that Level 3 models declaring `parent_spec: business_V_0-2-4` compile cleanly without collisions.

- [x] 3. **Workspace Source Deduplication by Content Hash**
  - [x] 3.1 Implement SHA-256 hash calculation and alias mapping in `actioNN` source discovery scripts.
  - [x] 3.2 Update source citation comparison logic to treat hashed duplicates across `sources/nn/` and `sources/nn/import/` as aliases.
  - [x] 3.3 Add unit tests verifying duplicate suppression in un-cited sources reporting.

- [x] 4. **Contextual Skill UX Refinement**
  - [x] 4.1 Update `actioNN/skills/nn-innfo/SKILL.md` instructions with intent-first execution and menu suppression rules.
  - [x] 4.2 Verify conversational flow with interactive walkthrough scenarios.
