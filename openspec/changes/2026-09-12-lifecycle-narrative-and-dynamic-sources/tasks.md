# Tasks: Lifecycle Narrative and Dynamic Sources Impact Checking

## Phase 1: Dynamic Sources Impact Checker Implementation
- [x] 1.1 Create `scripts/lib/impact-checker.js` with `auditModelCitations`, heading-level diff analysis, and `buildImpactReport`/`writeImpactReport` for structured report generation. <!-- id: task-1-1 -->
- [x] 1.2 Wire `--check-impact` (and alias `--impact`) flag into `scripts/index.js`, plus `--report` to write `export/Impact_Audit_<date>_report.md`. <!-- id: task-1-2 -->
- [x] 1.3 Integrate lightweight impact warning into `scripts/index.js --scan` when snapshots are generated. <!-- id: task-1-3 -->
- [x] 1.4 Write automated unit/integration tests for impact checking (including report generation) under `test/unit/test-impact-checker.js` (tasks lists `scripts/lib/impact-checker.test.js`, but the real test file lives under `test/unit/`). <!-- id: task-1-4 -->

## Phase 2: Documentation & Narrative Refactoring
- [x] 2.1 Refactor `docs/index.md` to incorporate the 3-phase lifecycle, external knowledge elicitation diagram, and refined value pillars. <!-- id: task-2-1 -->
- [x] 2.2 Update `README.md` to align the monorepo overview with the 3-phase lifecycle and zero lock-in narrative. <!-- id: task-2-2 -->
- [x] 2.3 Update `docs/ecosystem/cognitive-ecosystem.md` with the comprehensive architectural lifecycle guide. <!-- id: task-2-3 -->
- [x] 2.4 Update `actioNN/skills/nn-trannsform/SKILL.md` to document the staging buffer conventions and dynamic source impact checking. <!-- id: task-2-4 -->

## Phase 3: Verification & Integrity Gate
- [x] 3.1 Run tests and verify impact checker with test fixtures (clean state vs drifted source). <!-- id: task-3-1 -->
- [x] 3.2 Run repo integrity check `node scripts/verify.js` or `nn-dev-check-integrity`. <!-- id: task-3-2 -->
