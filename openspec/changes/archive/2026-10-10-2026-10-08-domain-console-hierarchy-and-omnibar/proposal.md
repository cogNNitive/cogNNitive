# Proposal: Domain Console Hierarchy, Knowledge Unit Identity & Faceted Omnibar

## Why

In `domaiNN_console.html`, all domain models are currently flattened during export (`scripts/export-console.mjs`). This causes three major usability and architectural shortcomings:
1. **Loss of Knowledge Unit Identity**: Elements lose their source model (`modelFile`), breaking the canonical iNNfo Knowledge Unit addressing grammar (`<file>@## <Concept>: <Element>`). Users cannot tell which Windows file on disk contains a given element.
2. **Flattened Navigation**: The left rail mixes concepts from all models together into a single flat list, with no model-level grouping.
3. **Rigid Filtering vs. Modal Isolation**: The legacy app used a modal "Focus Mode" that isolated models but broke global context. The console needs a unified, non-destructive **GitHub-style Omnibar** where typing or clicking rail items filters smoothly by `model:`, `concept:`, `tag:`, and text without leaving the dashboard.

## What Changes

1. **Knowledge Unit Identity in Domain Payload (`scripts/export-console.mjs`)**:
   - Each element in the combined domain payload is enriched with:
     - `modelId`: unique model slug (e.g. `business-model`, `analysis`)
     - `modelFile`: relative file name (e.g. `business_model.md`, `analysis.md`)
     - `canonicalUnit`: full citation string (e.g. `business_model.md@stakeholders--ceo`)
   - `model.meta.models`: structured catalog of models, their file paths, and their concept lists.

2. **GitHub-Style Faceted Omnibar (`innfo-runtime.js`)**:
   - The search input parses facets: `model:<name>`, `concept:<name>`, `tag:<label>`, and free text.
   - Supports multi-facet queries, e.g. `model:analysis concept:Risks high impact`.
   - Synchronizes bidirectionally with the URL hash (`#q=...`).

3. **Hierarchical Rail with DaisyUI & Preact**:
   - Upgrades `#innfo-rail` into a clean multi-level menu (`<ul class="menu">` with `<details>`):
     - **Level 1**: Model folders with file name and element count badge.
     - **Level 2**: Concept items with canonical Lucide icon, subtle colored border/dot, and count badge.
   - Clicking a Model or Concept in the rail toggles/sets the facet in the Omnibar seamlessly.

4. **Subtle Cognitive Affordances (Icons, Badges, Colors)**:
   - Discreet concept color usage: 1.5px border on badge outlines (`.badge-outline`) and a 3px left border accent on element cards.
   - Lucide icons on concept badges and model items.
   - Click-to-copy canonical KU locator icon on each card.

5. **Strict Backward Compatibility**:
   - Single-model consoles (`<Model>_console.html`) continue to render cleanly; if only one model is present or `model.meta.models` is omitted, the rail falls back smoothly to single-model mode.
   - Zero-build, `file://` offline contract strictly preserved.

## Resolution (2026-10-10)

Implemented in PR #157: `renderRail` now renders the hierarchical accordion for
multi-model consoles — a Level-1 `<ul class="menu">` of one `<details>` per model
(summary = model title + element-count badge) with its concepts nested as Level-2
`.innfo-rail-item` buttons; clicking a model sets the `model:` facet, clicking a
concept sets the `concept:` facet. Single-model consoles keep the flat fallback.
Console bundle rebuilt.
