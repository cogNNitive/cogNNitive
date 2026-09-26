# Change Proposal: Tabbed Domain Views for iNNfo Consoles

## Metadata
- **Change**: `2026-09-26-console-tabbed-domain-views`
- **Author**: Senior Architect
- **Status**: Proposal
- **Created**: 2026-09-26
- **Target Subsystem**: `iNNfo Console Runtime` (`innfo-runtime.js`, `innfo-console.bundle.js`, `needs-registry.json`, `timeline.html`)

## 1. Problem Statement
Currently, all iNNfo console artifacts render every enabled capability vertically in a single monolithic layout (`banner -> search/rail -> element cards -> matrix grids -> timeline grid -> charts`).

While the underlying capabilities are cleanly decoupled through `needs-registry.json` (`concept-rail`, `matrix-grids`, `timeline-grid`, `charts`, `guided-procedure`), the user interface lacks clear visual demarcation between:
1. **Domain-Specific Views**: Specialized interactive tools tailored to a specific template (e.g. the Timeline & P&L Projection with monthly grid, growth rules, and KPI cards for `metrics`, or the interactive step execution engine for `procedures`).
2. **Generic Model Explorer**: Broad model introspection capabilities common to all templates (left rail concept hierarchy, search toolbar, and element cards).
3. **Relational Matrices**: Cross-cutting matrix tables (`metrics-dependencies`, `metric-variables`, `scenario-metrics`).

This clutter causes visual friction: domain-specific interactive features (like the financial timeline) are buried or competing with generic element cards on the same page.

## 2. Proposed Solution
Introduce a top-level **View Tab Navigation Bar** (`#innfo-view-tabs`) rendered dynamically by `innfo-runtime.js`:

1. **Domain View Tab (Default when domain capability is present)**:
   - For `metrics` (when `timeline-grid` or `charts` is present): **"📊 Timeline & Projections"**. Renders only KPI summary cards, the interactive monthly P&L grid table, and uPlot charts.
   - For `procedures` (when `guided-procedure` is present): **"⚡ Guided Procedure"**. Renders the interactive stepper.
2. **Model Explorer Tab**:
   - **"🗂️ Model Explorer"**: Displays the concept rail, fulltext search toolbar, and element detail cards.
3. **Relational Matrices Tab (when matrices exist)**:
   - **"🔗 Matrices"**: Dedicated clean view for cross-dimensional matrix grids.

### Key Architectural Principles
- **Declarative & Capability-Driven**: The tab bar generates its tabs dynamically based on `config.needs` and model payload (zero hardcoded template dependencies in the core runtime).
- **Default Focus**: If a specialized domain capability is present (`timeline-grid` or `guided-procedure`), the console boots directly into that domain tab, giving the user immediate access to high-value domain interactions.
- **Deep Linking**: Hash routing updates cleanly (e.g. `#timeline`, `#explorer`, `#matrices`) so specific views can be bookmarked or linked.

## 3. Impact Analysis
- **`iNNfo/specs/templates/console/innfo-runtime.js`**: Implement `renderViewTabs(doc, config, model, meta)` to switch active tab sections and update hash navigation.
- **`iNNfo/specs/templates/console/needs-registry.json`**: Document tab navigation behavior.
- **`iNNfo/specs/templates/metrics/assets/timeline.html`**: Add styling for tabs and ensure container anchors match tab sections.
- **`scripts/build-console-bundle.mjs`**: Rebuild `innfo-console.bundle.js`.
- **Existing Consoles**: Backward-compatible; models without domain capabilities simply render the Model Explorer and Matrices tabs.

## 4. Risks & Mitigations
- **Risk**: User switches tab and loses in-progress variable overrides.
- **Mitigation**: Tab switching only toggles CSS visibility (`display: none` / `display: block` or active classes) — DOM state and in-memory overrides persist seamlessly.
