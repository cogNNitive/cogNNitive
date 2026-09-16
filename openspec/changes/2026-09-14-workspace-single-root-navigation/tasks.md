# Tasks: Workspace Single-Root Navigation & Progressive Disclosure (Slice 2)

- [ ] 1. UI Navigation & Tree Refactoring (`innfo-editor`)
  - [ ] 1.1 Update `LeftSidebar.vue` to render single-root tree starting from `workspace_NN.md`.
  - [ ] 1.2 Implement reactive lazy loading and spinner feedback on node expansion for `type:: model`.
  - [ ] 1.3 Remove legacy ad-hoc navigation sidebars in favor of unified tree.
  - [ ] 1.4 Add component unit/integration tests in `innfo-editor`.

- [ ] 2. AI Skills & Progressive Disclosure Updates
  - [ ] 2.1 Update `.agents/skills/nn-innfo/SKILL.md` to document and enforce 3-Tier Progressive Disclosure using `summary` fields.
  - [ ] 2.2 Update `.agents/skills/nn-trannsform/SKILL.md` to register ingested sources directly into `sources_NN.md`.

- [ ] 3. Verification & UI Testing
  - [ ] 3.1 Run `npm --prefix iNNfo/apps/innfo-editor test`.
  - [ ] 3.2 Verify workspace navigation in local browser.
