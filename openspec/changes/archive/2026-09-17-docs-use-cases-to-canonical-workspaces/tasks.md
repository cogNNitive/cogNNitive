# Tasks: Transform Documentation Use Cases to Canonical Workspaces

## Batch 1: Directory Restructuring & File Relocations

- [x] 1.1 Migrate `startup-founder` deliverables directory
  - [x] Rename `docs/samples/use-cases/startup-founder/export/` to `artifacts/` containing `pitch_deck_summary.md`.
  - [x] Ensure legacy `export/` directory is completely removed.

- [x] 1.2 Migrate `consulting-sales` deliverables directory
  - [x] Rename `docs/samples/use-cases/consulting-sales/export/` to `artifacts/` containing `commercial_proposal_executive.md` and `pricing_breakdown_sheet.md`.
  - [x] Ensure legacy `export/` directory is completely removed.

- [x] 1.3 Migrate `freelance-designer` deliverables directory
  - [x] Rename `docs/samples/use-cases/freelance-designer/export/` to `artifacts/` containing `interactive_spec_dashboard.html`.
  - [x] Ensure legacy `export/` directory is completely removed.

- [x] 1.4 Migrate `youtube-creator` deliverables directory
  - [x] Rename `docs/samples/use-cases/youtube-creator/export/` to `artifacts/` containing `broll_shooting_checklist.md`, `production_teleprompter_cue_sheet.md`, and `youtube_description_bibliography.md`.
  - [x] Ensure legacy `export/` directory is completely removed.

- [x] 1.5 Decouple and relocate procedural models in `youtube-creator`
  - [x] Create directory `docs/samples/use-cases/youtube-creator/procedures/`.
  - [x] Relocate `Episode_42_Production_V_1-0-0_procedures_NN.md` from `models/` to `procedures/`.
  - [x] Verify `docs/samples/use-cases/youtube-creator/models/` contains only `Episode_42_Battery_Tech_V_1-0-0_video_script_NN.md`.

---

## Batch 2: Authoring Workspace Manifests (`workspace_NN.md`)

- [x] 2.1 Author `startup-founder/workspace_NN.md`
  - [x] Conforms to Level 2/3 workspace template specification (`workspace_spec_NN.md`).
  - [x] Declare frontmatter (`level: 3`, `parent_spec.name: workspace`, `model_version: V_1-0-0`, `title: "SaaS Startup Founder Workspace"`).
  - [x] Declare `# NN index`, `# NN Workspace` (with `models_dir` and `sources_dir`), `# NN Models`, `# NN Sources`, `# NN Procedures`, `# NN Artifacts`, and `# NN Tags`.

- [x] 2.2 Author `consulting-sales/workspace_NN.md`
  - [x] Conforms to Level 2/3 workspace template specification (`workspace_spec_NN.md`).
  - [x] Declare frontmatter (`level: 3`, `parent_spec.name: workspace`, `model_version: V_1-0-0`, `title: "Consulting Sales RFP Workspace"`).
  - [x] Declare `# NN index`, `# NN Workspace`, `# NN Models` (referencing `Fintech_RFP_Response_V_1-0-0_commercial_NN.md` and `Consulting_Team_Matrix_V_1-0-0_organization_NN.md`), `# NN Sources`, `# NN Procedures`, `# NN Artifacts`, and `# NN Tags`.

- [x] 2.3 Author `freelance-designer/workspace_NN.md`
  - [x] Conforms to Level 2/3 workspace template specification (`workspace_spec_NN.md`).
  - [x] Declare frontmatter (`level: 3`, `parent_spec.name: workspace`, `model_version: V_1-0-0`, `title: "Freelance Web Designer Workspace"`).
  - [x] Declare `# NN index`, `# NN Workspace`, `# NN Models` (referencing `Client_Website_V_1-0-0_site_spec_NN.md`), `# NN Sources`, `# NN Procedures`, `# NN Artifacts`, and `# NN Tags`.

- [x] 2.4 Author `youtube-creator/workspace_NN.md`
  - [x] Conforms to Level 2/3 workspace template specification (`workspace_spec_NN.md`).
  - [x] Declare frontmatter (`level: 3`, `parent_spec.name: workspace`, `model_version: V_1-0-0`, `title: "YouTube Content Creator Workspace"`).
  - [x] Declare `# NN index`, `# NN Workspace`, `# NN Models` (referencing `Episode_42_Battery_Tech_V_1-0-0_video_script_NN.md`), `# NN Procedures` (referencing `procedures/Episode_42_Production_V_1-0-0_procedures_NN.md`), `# NN Sources`, `# NN Artifacts`, and `# NN Tags`.

---

## Batch 3: Authoring Catalog Index Files (`sources_NN.md`, `procedures_NN.md`, `artifacts_NN.md`)

- [x] 3.1 Author catalog index files for `startup-founder`
  - [x] `sources_NN.md`: Enumerate `sources/import/` and `sources/nn/` files with formats, statuses, and descriptions.
  - [x] `procedures_NN.md`: Declare procedural catalog conforming to `procedures_spec_NN.md`.
  - [x] `artifacts_NN.md`: Enumerate `artifacts/pitch_deck_summary.md` conforming to `artifacts_spec_NN.md`.

- [x] 3.2 Author catalog index files for `consulting-sales`
  - [x] `sources_NN.md`: Enumerate RFP briefs, case studies, and master rate card files.
  - [x] `procedures_NN.md`: Declare procedural catalog conforming to `procedures_spec_NN.md`.
  - [x] `artifacts_NN.md`: Enumerate `artifacts/commercial_proposal_executive.md` and `artifacts/pricing_breakdown_sheet.md`.

- [x] 3.3 Author catalog index files for `freelance-designer`
  - [x] `sources_NN.md`: Enumerate style guides and kickoff briefs.
  - [x] `procedures_NN.md`: Declare procedural catalog conforming to `procedures_spec_NN.md`.
  - [x] `artifacts_NN.md`: Enumerate `artifacts/interactive_spec_dashboard.html`.

- [x] 3.4 Author catalog index files for `youtube-creator`
  - [x] `sources_NN.md`: Enumerate research papers, audience feedback, and competitor benchmark transcripts.
  - [x] `procedures_NN.md`: Enumerate `procedures/Episode_42_Production_V_1-0-0_procedures_NN.md`.
  - [x] `artifacts_NN.md`: Enumerate cue sheets, B-roll checklists, and bibliography deliverables.

---

## Batch 4: Documentation & Web Explorer Synchronization

- [x] 4.1 Update documentation quick actions in `docs/use-cases.md`
  - [x] Update Quick Action deliverable links for all 4 archetypes to point to `samples/use-cases/{slug}/artifacts/*`.
  - [x] Verify workspace directory links and model references.

- [x] 4.2 Update interactive explorer modal and cards in `docs/use-cases.html`
  - [x] Update modal category filter tabs (replace `export` with `artifacts`, add `procedures`).
  - [x] Update "View Deliverable" button links on all use case cards to point to `artifacts/*`.
  - [x] Update `WORKSPACE_DATA` object across all 4 use cases with complete file listings (`workspace_NN.md`, `sources_NN.md`, `procedures_NN.md`, `artifacts_NN.md`, `sources/import/*`, `sources/nn/*`, `models/*`, `procedures/*`, `artifacts/*`).

- [x] 4.3 Synchronize master portfolio catalog in `workspace_NN/models/UseCases_Catalog_V_1-0-0_use-cases_NN.md`
  - [x] Verify archetype `model_ref` paths resolve to active model files in `models/`.
  - [x] Verify deliverable formats and pipeline phase declarations match canonical workspace paths.

- [x] 4.4 Synchronize web application presets in `iNNfo/apps/innfo-editor/src/config/workspaces.ts`
  - [x] Update `youtube-creator` preset `modelUrls` to reference `procedures/Episode_42_Production_V_1-0-0_procedures_NN.md`.
  - [x] Verify preset configuration integrity across `startup-founder`, `consulting-sales`, `freelance-designer`, and `youtube-creator`.

---

## Batch 5: Integrity Gate & Verification

- [x] 5.1 Automated workspace parser tests
  - [x] Ensure automated test coverage validates recursive parsing of all 4 use case workspaces (`startup-founder`, `consulting-sales`, `freelance-designer`, `youtube-creator`).
  - [x] Assert zero broken internal file references, valid frontmatter, and correct entity resolution.

- [x] 5.2 Spec compliance and URL integrity
  - [x] Execute `npm run check:specs` to ensure all parent spec URLs and raw GitHub URLs resolve without error.
  - [x] Execute `npm run check:spec-urls` to verify all spec URLs across repositories.

- [x] 5.3 Linting and static typechecks
  - [x] Execute `npm run lint` and verify zero new errors.
  - [x] Execute `npm run typecheck` across packages.

- [x] 5.4 Test suite execution
  - [x] Run `npm test` across monorepo packages (`@cognnitive/innfo-core`, apps).

- [x] 5.5 End-to-end explorer verification
  - [x] Inspect `docs/use-cases.html` in browser environment to test tab filtering, file counters, badges, and deliverable links.
