# Specification: Console Tabbed Domain Views

## Capability: `console-tabbed-views`

### 1. Requirements

#### R1: Dynamic View Tab Generation
- The runtime SHALL inspect `config.needs` and `model` payload on boot to determine available view tabs.
- When `timeline-grid` or `charts` is declared in `config.needs`, a domain tab named `Timeline & Projections` (or custom title from `meta.domainTabTitle`) SHALL be created.
- When `elements` exist in `model`, a `Model Explorer` tab SHALL be created.
- When `matrices` exist in `model` (and are non-empty), a `Matrices` tab SHALL be created.

#### R2: Default Active Tab
- If a domain capability (`timeline-grid` or `guided-procedure`) is active, the domain tab SHALL be selected by default on load unless overridden by URL hash.
- Otherwise, `Model Explorer` SHALL be selected by default.

#### R3: Tab Navigation & State Preservation
- Switching tabs SHALL toggle display visibility of the corresponding section containers (`#innfo-tab-domain`, `#innfo-tab-explorer`, `#innfo-tab-matrices`).
- Switching tabs SHALL NOT reset input values, variable overrides, or scroll states.
- The URL hash SHALL update upon tab switch (e.g. `#timeline`, `#explorer`, `#matrices`) and support browser back/forward navigation.

#### R4: Layout Separation
- In the `Timeline & Projections` tab, the view SHALL contain:
  - KPI Summary Cards (`.innfo-timeline-cards`)
  - Timeline & P&L Projection Table (`.innfo-timeline-table-wrap`)
  - Interactive Growth Selectors and Variable Overrides
  - Charts section (`#innfo-charts`)
- In the `Model Explorer` tab, the view SHALL contain:
  - Concept Rail navigation (`#innfo-rail`)
  - Search toolbar (`.innfo-toolbar`)
  - Element cards list (`#innfo-content`)
- In the `Matrices` tab, the view SHALL contain:
  - Relational matrix grids (`#innfo-matrices`)

#### R5: Grid Ergonomics & Sticky Positioning
- The table header row (`thead th`) SHALL remain sticky at the top when scrolling vertically (`position: sticky; top: 0; z-index: 10`).
- The metric identification column (`.td-sticky`, `.th-sticky`) SHALL remain sticky at the left when scrolling horizontally (`position: sticky; left: 0; z-index: 5`).
- The scroll container `.innfo-timeline-table-wrap` SHALL have `max-height: calc(100vh - 220px); overflow: auto;` to allow both horizontal and vertical scrolling with sticky boundaries.

#### R6: Row Pinning (Freeze Rows) & Inline Charts
- Each metric row SHALL include a pin/freeze action button (📌). Clicking it toggles the row in a sticky/pinned section (`#innfo-pinned-rows` or top of table), ensuring key metrics stay in view.
- Each metric row SHALL include an inline chart action button (📈). Clicking it expands an inline monthly visual chart row directly beneath the metric row, mapping values across the month columns.

### 2. Scenario Verification
- **Scenario 1**: Metrics console load defaults to the `Timeline & Projections` tab with zero generic element clutter.
- **Scenario 2**: Clicking `Model Explorer` reveals the concept rail, search input, and element cards.
- **Scenario 3**: Changing a variable input in `Timeline & Projections`, switching to `Model Explorer`, and switching back preserves the modified value and recomputed numbers.
- **Scenario 4**: Direct navigation to `...#matrices` opens the matrices tab directly.
- **Scenario 5**: Scrolling down in a tall timeline keeps the table headers fixed at the top; scrolling right keeps metric names fixed at the left.
- **Scenario 6**: Pinning a metric (e.g. MRR) keeps it visible at the top pinned section; clicking the inline chart icon renders monthly evolution bars matching the grid columns.
