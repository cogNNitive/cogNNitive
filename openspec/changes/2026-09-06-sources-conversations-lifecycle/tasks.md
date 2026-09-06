# Tasks: Workspace Sources & Conversations Lifecycle (2026-09-06)

Source: `proposal.md`, `specs/**/*.spec.md`, `design.md`.
Strict TDD: Red-Green-Refactor across `nn-preflight` and `nn-trannsform`.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~680 lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Preflight source audit → PR 2: Normalization & converters → PR 3: Conversation lifecycle & docs |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Scope | PR | Notes |
|---|---|---|---|
| 1 | Preflight source integrity audit (`scanWorkspaceSources`) | PR 1 | Independent, unit tested |
| 2 | Normalization pipeline, converters & lineage sync | PR 2 | Core engine changes & TDD |
| 3 | Conversations lifecycle, router rules & documentation | PR 3 | Protocol contracts & docs |

---

## Phase 1: Preflight Source Integrity Audit

- [x] 1.1 RED: Add tests in `actioNN/skills/nn-preflight/scripts/preflight-check.test.js` for `scanWorkspaceSources` (unnormalized, stale hash, dangling references, legacy aliases).
- [x] 1.2 GREEN: Implement `scanWorkspaceSources` in `actioNN/skills/nn-preflight/scripts/preflight-check.js` inspecting `sources/import/`, `sources/conversations/`, and `sources/export/` against `sources/nn/`.
- [x] 1.3 GREEN: Wire source integrity metrics into `--json` envelope and human report warnings.
- [x] 1.4 Update `actioNN/skills/nn-preflight/SKILL.md` documenting source integrity checks.

---

## Phase 2: Source Normalization & JSON Converters

- [x] 2.1 RED: Add unit tests in `actioNN/skills/nn-trannsform/test/unit/test-scanner.js` for multi-source walking, JSON dataset conversion, and `is_synthetic` flags.
- [x] 2.2 GREEN: Remove legacy `convertChatJson` in `actioNN/skills/nn-trannsform/scripts/lib/scanner-converters.js`; add structured JSON table and code block converter.
- [x] 2.3 GREEN: Update `actioNN/skills/nn-trannsform/scripts/lib/scanner-core.js` (`walkSourceTrees`) and `scanner.js` to scan `sources/import/`, `sources/conversations/`, `sources/export/` with legacy fallback.
- [x] 2.4 GREEN: Support `_source.md` and `_summary.md` normalization with `conversation_format` metadata and `is_synthetic: true` on promoted exports.
- [x] 2.5 GREEN: Update `actioNN/skills/nn-trannsform/scripts/lib/bootstrap.js` and `test-bootstrap-recursive.js` for new directory structure.
- [x] 2.6 GREEN: Update `actioNN/skills/nn-trannsform/scripts/lib/provenance-model.js` and `lineage-check.js` to scan `export/` while keeping `# NN Artifacts` header.
- [x] 2.7 GREEN: Update `transformer.js` and `webImport.js` target paths to `export/` and `sources/import/`.

---

## Phase 3: Conversations Lifecycle & Workspace Conventions

- [ ] 3.1 Update `actioNN/skills/nn-router/SKILL.md` Rule 5: silent reservation (`conversations/YYYY-MM-DD_HHmmss.md`), trivial discard (<2 turns, 0 mutations), 3 title suggestions + custom slug, and promotion prompt (`[full]`, `[summary]`, `[both]`, `[none]`).
- [ ] 3.2 Add promotion helper commands and interactive prompts to `actioNN/skills/nn-trannsform/scripts/index.js`.
- [ ] 3.3 Update documentation in `actioNN/skills/nn-trannsform/SKILL.md`, `README.md`, `TESTING.md`, and `citations.md`.
- [ ] 3.4 Verify write-once Level-2 template `iNNfo/specs/templates/cogNNitive/cogNNitive_V_0-2-0_NN.md` remains untouched.

---

## Phase 4: Full Ecosystem Verification

- [ ] 4.1 Run unit test suites: `node actioNN/skills/nn-preflight/scripts/preflight-check.test.js` and `node actioNN/skills/nn-trannsform/test/unit/test-scanner.js`.
- [ ] 4.2 Run integration tests: `powershell actioNN/skills/nn-trannsform/test/test.ps1`.
- [ ] 4.3 Run full workspace verification: `node scripts/verify.js`.
