# Archive Report: 2026-10-08-domain-console-hierarchy-and-omnibar

**Archived**: 2026-10-10
**Mode**: openspec

## Specs Synced
None — this change carried no delta spec folder.

## Verification
- Implemented in PR #157 (merged). `renderRail` now renders the hierarchical accordion for multi-model consoles (`meta.models.length > 1`): a Level-1 `<ul class="menu">` of one `<details open class="innfo-rail-model">` per model (summary = model title + element-count badge; click sets the `model:` facet) with its concepts nested as Level-2 `.innfo-rail-item` buttons (click sets the `concept:` facet). Per-model concepts come from `state.elements`, falling back to `meta.models[].conceptNames`. Single-model consoles keep the flat concept list.
- The earlier deliverables (payload `modelId`/`modelFile`/`canonicalUnit`, `meta.models`, faceted omnibar, URL-hash sync, KU locator, card/badge styling) were already present.
- DOM contract preserved (`.innfo-rail-item`, `[data-model]`, `[data-concept]`); console bundle rebuilt; `check:console-bundle` fresh; all 259 root console node tests pass; CI green.
