# 2026-09-06 — Workspace concept rename (ModelRef -> Models) + navigable model pill

## Context

User reported that expanding the concept that lists referenced models in the workspace manifest (`workspace_NN.md`) showed the model list and the source, but no clickable pill to navigate to the referenced model. The editor already supports a `model` field type (clickable pill -> `uiStore.focusModel`, autocomplete, create-and-bind) via `FieldModel.vue` and `FieldViewer.vue`, but the workspace template declared `path` as `type:: string`, so nothing rendered as navigable.

## Decisions

1. Rename the workspace manifest concept `ModelRef` -> `Models` (`## NN Models:` elements). Scope clarified by the user: the concept NAME in the workspace file, not the field name or its primitive.
2. Retype the `path` field to `type:: model` so the editor renders the navigable pill.
3. Rename the cogNNitive provenance concept `Models` -> `ModelRecords`: the name `Models` already existed in `cogNNitive_V_0-2-0`, and the `base` composite template (`includes: [workspace_V_0-2-0, cogNNitive_V_0-2-0]`) guarantees disjoint concept names. Renaming the workspace concept to `Models` would have produced `[COMPOSITION_COLLISION]`. Removing the cogNNitive `Models` concept was evaluated and rejected: it is the middle node of the Sources -> Models -> Artifacts PROV lineage and is referenced by `Artifacts.derived_from_inputs`.
4. `cogNNitive_V_0-1-0` left untouched (historical; the user's provenance model uses it and still has `Models` there).

## Scope of changes

- Templates: `workspace_V_0-2-0_spec_NN.md`, `workspace_spec_NN.md`, skill copy `actioNN/skills/nn-innfo/templates/workspace_spec_NN.md` (also synced `template` to `string`), `cogNNitive_V_0-2-0_NN.md` (Models -> ModelRecords), `base_V_0-1-0_spec_NN.md` prose.
- Models/samples: `docs/workspace_NN.md`, `base/samples/workspace_NN.md`, `base/samples/Ghostbusters_cogNNitive_NN.md`.
- Core: `reconcileManifest.ts` (section/entry regexes now match `## NN Models`), comments in `types.ts` and `discoverModels.ts`.
- MCP bundle rebuilt (`bin/`), orphaned build chunks purged (tsup `clean: false` had accumulated them).
- Tests updated: core (6 files), mcp (3), editor (1) + active openspec specs (5) + `nn-innfo` SKILL.md.
- Editor workspace-tags feature (pre-existing uncommitted work, related to the workspace `Tag` concept) committed separately.

## Gates

- core 394 passed · mcp 168 passed · editor 595 passed
- typecheck (editor + mcp), `verify.js`, prettier: all green
- `base` composition resolves with no collisions (verified by `includes-composition.test.ts`)

## Delivery

- PR #48 merged (squash) -> `deefc86` on main
- CI: verify, quality, spec-integrity, deploy-pages all success

## Follow-up (user's workspace — Noria de la Paz)

- `workspace_NN.md` must be updated to `# NN Models` / `## NN Models:` (currently `ModelRef`).
- The editor caches the resolved template in `<workspace>/specs/` (write-once): refresh needed for the new schema to take effect.
- The cogNNitive provenance model can stay on `cogNNitive_V_0-1-0` (concept still `Models` there).