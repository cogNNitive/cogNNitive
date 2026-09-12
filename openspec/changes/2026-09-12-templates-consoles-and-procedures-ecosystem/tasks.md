# Tasks: Templates, Consoles, and Procedures Ecosystem

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1500–2500 lines (across templates, sidebar docs, procedures, consoles, and samples) |
| 400-line budget risk | High (Mitigated by modular domain phases) |
| Chained PRs recommended | No |
| Suggested split | Single PR / Batched commits on `dev` |
| Delivery strategy | single-pr-default |
| Chain strategy | size-exception |

## Phase 1: Core Template Hygiene & Decoupling

- [ ] 1.1 Remove `includes` (`organization`, `projects`) from `iNNfo/specs/templates/business-model/spec_NN.md` and verify standalone resolution.
- [ ] 1.2 Purge `SWOT` from `iNNfo/specs/templates/analysis/spec_NN.md` (tables, prose, matrix descriptions).
- [ ] 1.3 Fix Level 3 sample snippet in `analysis/spec_NN.md` to remove forbidden `# NN index`.
- [ ] 1.4 Validate `business/spec_NN.md` composite resolution with `business-model`, `analysis`, `organization`, `projects`, and `metrics`.

## Phase 2: Modeler Sidebar Documentation Completeness

- [ ] 2.1 Audit and add `### Summary` and `### Description` to all concepts in `analysis/spec_NN.md`.
- [ ] 2.2 Audit and add `### Summary` and `### Description` to all concepts in `business-model/spec_NN.md`.
- [ ] 2.3 Audit and add `### Summary` and `### Description` to all concepts in `organization/spec_NN.md`.
- [ ] 2.4 Audit and add `### Summary` and `### Description` to all concepts in `projects/spec_NN.md`.
- [ ] 2.5 Audit and add `### Summary` and `### Description` to all concepts in `innovation/spec_NN.md`.
- [ ] 2.6 Audit and add `### Summary` and `### Description` to all concepts in `documentation/spec_NN.md`.
- [ ] 2.7 Audit and add `### Summary` and `### Description` to all concepts in `repository/spec_NN.md` and `video-generator/spec_NN.md`.

## Phase 3: Specification Version & Catalog Alignment

- [ ] 3.1 Align `spec_version: "V_0-2-1"` and `parent_spec.url` targeting `specs/iNNfo_V_0-2-1_NN.md` across all domain templates.
- [ ] 3.2 Update `iNNfo/specs/templates/catalog.json` to register all active templates with accurate versions and repository paths.
- [ ] 3.3 Update `.agents/skills/nn-template-audit/AUDIT_LOG.md` with the new compliance state.

## Phase 4: Domain Procedures & Assets Implementation

- [ ] 4.1 **Organization**: Add `procedures/audit_skill_gaps_NN.md`, `procedures/export_team_directory_NN.md`, and `assets/org_chart_console.html`; register in template frontmatter.
- [ ] 4.2 **Projects**: Add `procedures/calculate_critical_path_NN.md`, `procedures/generate_status_report_NN.md`, and `assets/roadmap_console.html`; register in template frontmatter.
- [ ] 4.3 **Analysis**: Add `procedures/run_coherence_audit_NN.md`, `procedures/prioritize_experiments_NN.md`, and `assets/strategic_audit_console.html`; register in template frontmatter.
- [ ] 4.4 **Innovation**: Add `procedures/score_innovation_pipeline_NN.md` and `assets/innovation_funnel_console.html`; register in template frontmatter.
- [ ] 4.5 **Documentation**: Add `assets/docs_portal_console.html` and link existing `procedures/generate_docsify_suite_NN.md` in template frontmatter.

## Phase 5: Canonical Ghostbusters Level 3 Samples Alignment

- [ ] 5.1 Create canonical standalone `Ghostbusters_V_0-2-1_business-model_NN.md` in `business-model/samples/`.
- [ ] 5.2 Update and align `analysis/samples/Ghostbusters_V_0-2-0_analysis_NN.md` (remove SWOT remnants, verify matrices).
- [ ] 5.3 Update and align `metrics/samples/Ghostbusters_V_0-1-0_metrics_NN.md` to `V_0-2-1`.
- [ ] 5.4 Create canonical samples for `repository` (`Ghostbusters_V_0-1-0_repository_NN.md`) and `video-generator` (`Ghostbusters_V_0-1-0_video-generator_NN.md`).
- [ ] 5.5 Verify all L3 samples adhere to 100% English copy, WikiLink syntax, no `# NN index`, and prose markdown descriptions.

## Phase 6: Monorepo Integrity & Test Verification

- [ ] 6.1 Run template validation suite on all L2 templates (`validate_template`).
- [ ] 6.2 Run model validation suite on all L3 samples (`validate_model`).
- [ ] 6.3 Run `node scripts/verify.js` to ensure zero integrity regressions across the monorepo.
