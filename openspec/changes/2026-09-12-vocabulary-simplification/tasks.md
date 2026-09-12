# Tasks: Vocabulary Simplification — canonical term dictionary + `template` → `app` (user-facing)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 250–400 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR (vocabulary-only, no identifier change) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Dictionary + docs + AGENTS.md glossary | PR 1 | Foundation; no spec_NN.md yet (avoids sibling) |
| 2 | User-facing copy pass (editor, skills, docs) + catalog regen | PR 1 | Sequenced after sibling archives |
| 3 | Element audit + backlog follow-up item | PR 1 | End of change |

## Phase 1: Foundation — Canonical Dictionary

- [x] 1.1 Create `iNNfo/specs/vocabulary.json` with terms (app canonical, template deprecated alias), senses, excluded senses, stable_identifiers, planned_migrations
- [x] 1.2 Create `docs/innfo/documentation/vocabulary.md` rendering the dictionary (app canonical, alias table, exclusions, stable-identifier list)
- [x] 1.3 Update `iNNfo/AGENTS.md` glossary block: add `app` (Level-2 schema), mark `template` deprecated alias, keep Workspace/Model/Concept/Element/Block/Pill-Sheet
- [x] 1.4 RED test `test-vocabulary.js` (nn-trannsform unit pattern): asserts vocabulary.json well-formed, app canonical, template alias present, every stable identifier listed

## Phase 2: Core — User-Facing Rename (sequenced after sibling archive)

- [x] 2.1 Rename `title: "X Template"` → `"X App"` in the 13 active `iNNfo/specs/templates/*/spec_NN.md` (skip frozen base/cogNNitive, versioned specs)
- [x] 2.2 Regenerate `iNNfo/specs/templates/catalog.json` via `node scripts/template-catalog.mjs`; `--check` green
- [x] 2.3 `iNNfo/apps/innfo-editor/src/views/HomeView.vue`: "Creating Models from Templates" → "…Apps"; sample card copy (keep `templateName`/`createTemplate` identifiers)
- [x] 2.4 `iNNfo/apps/innfo-editor/src/components/layout/SampleBanner.vue`: "…template…" → "…app…" (user-facing string only)
- [x] 2.5 `iNNfo/apps/innfo-editor/src/components/ValidationReport.vue`: `Template:` labels → `App:` (keep `template_name`/`template_version` field identifiers)
- [x] 2.6 `iNNfo/apps/innfo-editor/src/components/layout/WorkspaceIntegrityNotice.vue`: user-facing "template" → "app"
- [x] 2.7 `actioNN/skills/nn-innfo/SKILL.md`: L2-sense copy → app (~70 hits); `bundled_templates` identifier unchanged
- [x] 2.8 `actioNN/skills/nn-trannsform/SKILL.md`: L2-sense only; `traNNsformations/` + `--apply` sense untouched
- [x] 2.9 `.agents/skills/nn-template-audit/SKILL.md`: audit copy L2-sense → app (identifiers unchanged)
- [x] 2.10 `docs/**` prose + `iNNfo/USE_AI.md`: conceptual "template" (L2-sense) → "app"; identifiers verbatim

## Phase 3: Audit + Backlog Follow-up

- [x] 3.1 Element-vocabulary audit: L2 Concept Definition names in 13 templates + Ghostbusters samples; produce proposed simpler surface (report section in change folder)
- [x] 3.2 Add backlog work item to `_NN/models/cogNNitive_backlog_V_0-1-6_backlog_NN.md`: future identifier migration (paths/URLs/keys/tags) referencing dictionary planned_migrations

## Phase 4: Testing / Verification

- [x] 4.1 GREEN test 1.4 (vocabulary.json contract)
- [x] 4.2 Guard grep: `template_version|specs/templates/|get_template|ref_key: templates|SHIPPED_TEMPLATE_VERSIONS` all still present (no identifier renamed)
- [x] 4.3 `node scripts/template-catalog.mjs --check` green
- [x] 4.4 `npm --prefix iNNfo run lint` + `typecheck` + editor test suite (663) green
- [x] 4.5 `node actioNN/skills/nn-trannsform/test/run.js` green (398)

## Phase 5: Cleanup

- [x] 5.1 Confirm `base`/`cogNNitive`/versioned specs byte-identical (git diff empty) — VERIFIED 2026-09-12: `git diff --stat HEAD` empty for base/ and cogNNitive/
- [x] 5.2 Update `iNNfo/specs/templates/console/` seam untouched; no runtime/bundle change — VERIFIED 2026-09-12: `git diff --stat HEAD` empty for console/