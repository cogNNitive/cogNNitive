# Proposal: Vocabulary Simplification — canonical term dictionary + `template` → `app` (user-facing)

## Intent

The application vocabulary has drifted from its actual structure: the Level-2 schema currently called **template** (`_spec_NN.md`, pinned by `parent_spec`) is cognitively heavier than **app**, while 4 distinct senses of "template" coexist (L2 schema, nn-trannsform `traNNsformations/`, Vue SFC `<template>`, generic English). Users see inconsistent labels across the editor, docs, and skills. This change pins a canonical term dictionary and renames the user-facing vocabulary to **app**, keeping all identifiers stable and recording them as documented deprecated aliases.

## Scope

### In Scope

- **Canonical term dictionary** — machine-readable map (`vocabulary.json`) driving editor labels + skill copy AND a docs page (`docs/innfo/documentation/vocabulary.md`); `iNNfo/AGENTS.md` glossary block updated to match. `app` canonical, `template` explicit deprecated alias (provenance-vocabulary pattern).
- **User-facing rename** `template` → `app` in: catalog titles (`title: "X Template"`), editor labels/navigation (`HomeView.vue`, `SampleBanner.vue`, `ValidationReport.vue`, `WorkspaceIntegrityNotice.vue`, `WorkspaceView.vue`), docs prose, skill copy (`nn-innfo`, `nn-trannsform` L2 sense only, `nn-template-audit`).
- **Element-vocabulary audit** — L2 Concept Definition names in the 13 active templates AND Ghostbusters Inc. canonical samples; propose a simpler, more consistent surface.
- **Backlog follow-up item** — new work item in `_NN/models/cogNNitive_backlog_V_0-1-6_backlog_NN.md` for the future mechanical identifier migration.

### Out of Scope

- **Identifier migration** — `templates/` paths, `parent_spec.url`, `spec_url`, `template_version`, MCP tool names (`get_template`…), manifest `templates:`/`ref_key: templates`/`templates-v*` tags, `SHIPPED_TEMPLATE_VERSIONS` keys, hydration paths. All stay stable.
- **nn-trannsform's own template sense** (`traNNsformations/`, CLI `--apply <name>`) — different concept.
- **Vue SFC `<template>` blocks** and generic English "template" — excluded senses.
- **Frozen/historical files** — `base`, `cogNNitive`, versioned specs stay byte-identical.

## Capabilities

### New Capabilities

- `canonical-vocabulary`: canonical term dictionary (app canonical, template deprecated alias, sense exclusions), machine-readable map + docs page, deprecation lifecycle.

### Modified Capabilities

- `provenance-vocabulary`: no requirement change — reused as the deprecation pattern precedent.
- `template-ecosystem-documentation`: user-facing copy updated to use `app` for the L2-schema sense.

## Approach

Follow `provenance-vocabulary` deprecation semantics: `app` canonical, `template` accepted as documented deprecated alias for one release, then removed from copy. Rename only user-facing vocabulary; record every stable identifier in the dictionary's alias table with a "planned migrations" section. Apply sequenced AFTER `2026-09-12-templates-consoles-and-procedures-ecosystem` archives (touches sibling-dirty `catalog.json`, `manifest/source.yaml`, `spec_NN.md` titles).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/{13}/spec_NN.md` | Modified | `title:` → "X App" (sequenced after sibling) |
| `iNNfo/specs/templates/catalog.json` | Regenerated | titles via `template-catalog.mjs` |
| `iNNfo/apps/innfo-editor/src/**` | Modified | user-facing labels; `SHIPPED_TEMPLATE_VERSIONS` keys unchanged |
| `actioNN/skills/nn-{innfo,trannsform,template-audit}/SKILL.md` | Modified | L2-sense copy → app |
| `docs/`, `iNNfo/AGENTS.md` | Modified | prose + glossary; new `vocabulary.md` |
| `_NN/models/...backlog...md` | Modified | new migration follow-up work item |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Sibling collision (catalog/manifest/spec_NN dirty) | High | Sequence apply after sibling archives |
| "app" clashes with `docs/innfo/app/` (editor) | Med | Dictionary disambiguates App (schema) vs Editor/Console (tool) |
| Sense-blind replace corrupts CLI/nn-trannsform | Med | Sense-scoped pass; `traNNsformations/` + `<template>` excluded |

## Rollback Plan

Revert the rename commit on `dev` (vocabulary-only, no identifier change → safe revert). Dictionary removal restores prior copy. No URL/tag/key changes exist to unwind.

## Dependencies

- Archive of `2026-09-12-templates-consoles-and-procedures-ecosystem` before apply.

## Success Criteria

- [ ] Dictionary published (vocabulary.json + docs page); `app` canonical, `template` deprecated alias listed
- [ ] All user-facing editor labels/docs/skill copy use `app` for the L2-schema sense
- [ ] Zero identifier migrations; `verify.js` green; `template-catalog.mjs --check` green
- [ ] Element-vocabulary audit report produced; backlog follow-up item created