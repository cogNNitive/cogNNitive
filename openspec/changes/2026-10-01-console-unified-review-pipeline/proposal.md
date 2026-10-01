# Proposal: Console Unified Review Pipeline

Consolidated OpenSpec change merging the 4 previously fragmented console changes:
1. `console-cleanup-and-lint`
2. `console-design-tokens-and-ui-kit`
3. `console-feedback-roundtrip`
4. `console-review-ux`

## Why

The console system currently suffers from fragmentation across multiple layers:
1. **Shell and Asset Drift**: Dead legacy viewers (`business/assets/model_viewer.html`), 5 orphan thin shells (`analysis`, `documentation`, `innovation`, `organization`, `projects`), inconsistent version pins across shells and manifests, and lack of automated shell integrity linting.
2. **Design & Token Inconsistency**: Scattered ad-hoc CSS styles across bundle renderers instead of a unified design token system (`--innfo-*`) and cohesive UI components (`InnfoUI`, `StatusBadge`, `MetricCard`, modal controls).
3. **Broken Feedback Round-Trip**: The reviewer export emitted non-standard `$schema console-review-v1` that failed `feedback.schema.json` validation; `model_console.html` had no feedback anchors; procedural vs CLI console payload builders disagreed on element IDs and metadata; feedback verdicts were never persisted to an append-only ledger; and duplicated `apply_feedback_NN.md` procedures existed across blueprints.
4. **Suboptimal Reviewer UX**: Reviewers were forced to manually manage status dropdowns that belonged to triage rather than user feedback.

## What Changes

- **Consolidated Shells & Shell Integrity Guard**:
  - Remove dead legacy viewer `model_viewer.html` and collapse orphan thin shells onto the config-driven `artifact_shell.html`.
  - Add `scripts/lib/console-shell-guard.js` wired into `verify.js` to ensure shell `needs[]` and version pins strictly match the manifest.
- **Design Tokens & UI Kit**:
  - Standardize design tokens (`--innfo-bg`, `--innfo-surface`, `--innfo-border`, `--innfo-text-*`, `--innfo-accent`) and bundle reusable UI primitives in `innfo-console`.
- **Schema-Conformant Feedback & Injected UI**:
  - Update console feedback export to strictly conform to `feedback.schema.json` (`meta`, `items[].target{element_id, concept, field}`).
  - Bundle-inject feedback banner, button, and modal when `feedback-export` is declared, eliminating fragile manual HTML anchors.
  - Establish a single canonical `buildConsolePayload` in `innfo-core` shared by both CLI and procedures.
  - Implement an append-only verdict ledger (`sources/import/feedback/ledger.jsonl`) and single `reconcile_feedback` procedure.
- **Clean Review Mode**:
  - Simplify review UX: reviewers submit structured feedback and annotations; triage status and resolution are managed cleanly during reconciliation.

## Deliverables & Phases

1. **Phase 1: Shell Consolidation & Guard**: Remove dead assets, collapse thin shells, add `console-shell-guard.js`.
2. **Phase 2: Core Payload Builder & Schema Conformity**: Implement `buildConsolePayload`, update export validation to strict `feedback.schema.json`, and establish verdict ledger.
3. **Phase 3: Design Tokens & Injected Feedback UI**: Modernize `innfo-console` bundle with tokens, reusable components, and auto-injected feedback controls.
4. **Phase 4: Unified Reconcile Procedure & Verification**: Consolidate `reconcile_feedback_NN.md`, verify end-to-end feedback roundtrip, and regenerate distribution bundles.
