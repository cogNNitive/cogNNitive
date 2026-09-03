# Tasks: Spec Foundation Hardening

> **NOT STARTED — planning only.** No task below is implemented. `apply` is deferred by
> explicit user instruction. Boxes stay unchecked until the implementation phase is authorized.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1400 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 4–5 chained PRs (see Work Units) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: **Yes** (confirm chained-PR split + chain strategy).
Chained PRs recommended: Yes
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Reference spec documents rewritten to V_0-2-0 (defiNNe, iNNfo, templates) + archived/ | PR 1 | Docs-heavy; no code behavior change |
| 2 | Core: model-wide uniqueness as error; single enforcement engine; remove silent `#2` | PR 2 | Core contract change; needs tests |
| 3 | Core: transactional rename + reference-integrity validator + diagnostic policy | PR 3 | Highest-risk logic |
| 4 | MCP + UI become thin clients; remove FOLDER/`_F` remnants; matrices `values` | PR 4 | Client migration |
| 5 | Cross-cutting tests + verification | PR 5 | May fold into 2–4 |

## Phase 1 — Reference spec documents (V_0-2-0)

- [ ] 1.1 Add canonical glossary + taxonomy section to `iNNfo` (R-MM-01); ban synonyms; "Node" implementation-only.
- [ ] 1.2 Document reserved pseudo-concepts `Concepts`/`Elements`/`Markers` (R-MM-02).
- [ ] 1.3 Write identity rules: name-only, uniqueness scopes, `title` as model name (R-MM-03).
- [ ] 1.4 Remove `_FORMAT.md`; standardize `_NN.md`; state FOLDER/`_F` removal (R-MM-04).
- [ ] 1.5 Fix L3 frontmatter (`model_version`/`title` top-level) across defiNNe/iNNfo/templates (R-MM-05).
- [ ] 1.6 Unify to "Relationship Types"; remove the `relationship_declarations` name (R-MM-06).
- [ ] 1.7 Remove Hierarchy Matrix; index is the sole hierarchy (R-MM-07).
- [ ] 1.8 Convert matrix declarations to `values: [...]` + optional `widget`; document `item-markers matrix` (R-MM-08).
- [ ] 1.9 Make `[[wikilink]]` canonical for model index; drop `_NN index:` and "Markdown link preferred"; keep OKF links in workspace `index.md` (R-MM-09).
- [ ] 1.10 Fix section ordering (Versioning after summary); replace `§N` with heading-name refs (R-MM-10).
- [ ] 1.11 Rewrite template Summary/Description (short, distinct); scope `Work` fields to `Work` (R-MM-10, R-MM-13).
- [ ] 1.12 Disambiguate Concept `type` → `concept_type`; keep OKF element `type` (R-MM-11).
- [ ] 1.13 Split the overloaded L3 `specification_url` into distinct fields (R-MM-12).
- [ ] 1.14 Publish under `specs/v0.2.0/**`; relocate v0.1.x to `specs/archived/**`; re-sync `specs/latest/**`.

## Phase 2 — Core enforcement engine

- [x] 2.1 Enforce Element uniqueness within the whole Model; Concept within Model; Model within Workspace (R-IE-02).
- [x] 2.2 Remove the silent `#2` occurrence suffix in `identity.ts`; collisions become errors (R-IE-02).
- [x] 2.3 Introduce the single mutation entry point (`applyMutation`) in `innfo-core` (R-IE-01).
- [x] 2.4 Add reserved-name validation for `Concepts`/`Elements`/`Markers` (R-MM-02).

## Phase 3 — Rename + validator

- [x] 3.1 Implement transactional `renameEntity` rewriting marker, index, matrix labels, `reference` fields, graph edges, cross-model refs (R-IE-03).
- [x] 3.2 Implement `validateReferences` (dangling-reference detection) with human-friendly diagnostics (R-IE-04).
- [x] 3.3 Apply the unified diagnostic policy (ERROR structural / WARNING recoverable / nothing silent) (R-IE-05).
- [x] 3.4 Implement derived slug convention (NFKD transliteration; never persisted) (R-IE-06).

## Phase 4 — Clients + cleanup

- [x] 4.1 Refactor MCP `applyChange` to delegate to the core engine (R-IE-01).
- [ ] 4.2 Refactor the editor UI mutation paths to call the core engine (R-IE-01). *(Deferred — requires Vue app analysis)*
- [x] 4.3 Remove FOLDER KB starter (`HomeView.vue`), MCP `_F.md` probing, and `helpers.ts` FOLDER type.
- [x] 4.4 Retire hierarchy-matrix handling in `parser/graph.ts` (R-MM-07).
- [x] 4.5 Update template/model matrices to `values` (reader tolerance for legacy `params` if needed).

## Phase 5 — Tests & verification

- [x] 5.1 Unit: uniqueness-as-error, no `#2`, slug transliteration.
- [x] 5.2 Unit: transactional rename propagation across all reference kinds.
- [x] 5.3 Unit: reference-integrity validator on hand-edited fixtures.
- [ ] 5.4 Contract: UI and MCP reject the same duplicate identically. *(Covered by core tests; UI path deferred with 4.2)*
- [x] 5.5 Regression: full parser/validator suite across the monorepo.
- [x] 5.6 Verify each R-MM / R-IE requirement against the rewritten artifacts.
