# Specification: Console Tabbed Domain Views

## Capability: `console-tabbed-views`

## Purpose

Define how the domain console generates, selects, and switches between view tabs (Model Explorer, Matrices, Model Map, and registered domain views) while preserving per-tab input, variable, and scroll state. Tabs MUST come from the view registry, and the URL hash MUST drive navigation.

## Requirements

#### R1: Dynamic View Tab Generation
Tabs SHALL come from the view registry (`console-view-registry`) on boot. The runtime SHALL register built-in views from the `model` payload: a `Model Explorer` tab when `elements` exist, and a `Matrices` tab when `matrices` exist and are non-empty. Domain tabs (e.g. `Timeline & Projections`, or the title in `meta.domainTabTitle`) SHALL be created by the registered views the bluepriNNt or domaiNN supplies.

##### Scenario: Registered view becomes a tab
- GIVEN a registered view `timeline` with title `Timeline & Projections`
- WHEN the console boots
- THEN a tab with that title exists

##### Scenario: Empty matrices
- GIVEN a model with no matrices
- WHEN the console boots
- THEN no `Matrices` tab is created

#### R2: Default Active Tab
- If a domain capability (`timeline-grid` or `guided-procedure`) is active, the domain tab SHALL be selected by default on load unless overridden by URL hash.
- Otherwise, `Model Explorer` SHALL be selected by default.

##### Scenario: Default tab follows the active capability
- GIVEN a domain with the `timeline-grid` capability active
- WHEN the console boots without a URL hash
- THEN the domain tab is selected by default

#### R3: Tab Navigation & State Preservation
Switching tabs SHALL toggle display visibility of the corresponding panels: one per registered view, plus `#innfo-tab-explorer` and `#innfo-tab-matrices`. Switching tabs SHALL NOT reset input values, variable overrides, or scroll states. The URL hash SHALL update upon tab switch (e.g. `#timeline`, `#explorer`, `#matrices`) and support browser back/forward navigation.

##### Scenario: Hash opens Matrices
- GIVEN a model with matrices
- WHEN `...#matrices` is opened
- THEN the Matrices panel is the only visible panel

##### Scenario: State survives switching
- GIVEN a changed variable input in a view
- WHEN another tab is shown and then the view again
- THEN the value is unchanged

#### R4: Layout Separation
In the `Timeline & Projections` view the content SHALL contain the Timeline & P&L Projection Table (`.innfo-timeline-table`), Interactive Growth Selectors and Variable Overrides, and the scenario studio; charts (`#innfo-charts`) are retired from the domain console with the legacy `timeline.html` shell. In the `Model Explorer` tab it SHALL contain the Concept Rail (`#innfo-rail`), the search toolbar (`.innfo-toolbar`) and the element cards list (`#innfo-content`). The `Matrices` tab SHALL have its own panel `#innfo-tab-matrices` containing the relational matrix grids (`#innfo-matrices`), as a sibling of the explorer panel and not nested in it.

##### Scenario: Matrices render in own panel
- GIVEN a model with a non-empty matrix
- WHEN the Matrices tab is activated
- THEN `#innfo-tab-matrices` exists as a sibling of `#innfo-tab-explorer`
- AND the matrix grid renders inside it

#### R5: Grid Ergonomics & Sticky Positioning
- The table header row (`thead th`) SHALL remain sticky at the top when scrolling vertically (`position: sticky; top: 0; z-index: 10`).
- The metric identification column (`.td-sticky`, `.th-sticky`) SHALL remain sticky at the left when scrolling horizontally (`position: sticky; left: 0; z-index: 5`).
- The scroll container `.innfo-timeline-table-wrap` SHALL have `max-height: calc(100vh - 220px); overflow: auto;` to allow both horizontal and vertical scrolling with sticky boundaries.

##### Scenario: Sticky header and column while scrolling
- GIVEN the `Timeline & Projections` grid is taller and wider than the viewport
- WHEN the user scrolls down and right
- THEN the header row stays at the top and the metric column stays at the left

#### R6: Row Pinning (Freeze Rows) & Inline Charts
- Each metric row SHALL include a pin/freeze action button (📌). Clicking it toggles the row in a sticky/pinned section (`#innfo-pinned-rows` or top of table), ensuring key metrics stay in view.
- Each metric row SHALL include an inline chart action button (📈). Clicking it expands an inline monthly visual chart row directly beneath the metric row, mapping values across the month columns.

##### Scenario: Pin and inline chart actions
- GIVEN a metric row in the timeline grid
- WHEN the pin button is clicked
- THEN the row moves to the pinned section
- AND when the inline chart button is clicked an inline monthly chart row expands beneath it

#### R7: Element Table View
The `Model Explorer` SHALL offer a Cards/Table toggle. In Table mode it SHALL render one row per filtered element with a column per field key, sortable by clicking a header (toggling ascending/descending and setting `aria-sort`), and SHALL preserve the active filter.

##### Scenario: Toggle to table
- GIVEN a model with elements
- WHEN Table mode is selected
- THEN `#innfo-content` contains `.innfo-element-table` with one row per element and one column per field key

##### Scenario: Sort by header
- GIVEN Table mode
- WHEN a column header is clicked
- THEN the rows reorder and the header carries `aria-sort` (`ascending` then `descending`)

#### R8: Model Map View
A built-in `Model Map` tab SHALL be registered when the schema declares concepts. It SHALL render concepts as circular nodes and matrices as labelled edges, as inline SVG with no external dependency, and its panel (`#innfo-tab-metamodel`) SHALL be created by the tab shell like the other built-ins.

##### Scenario: Model Map tab
- GIVEN a schema with concepts
- WHEN the console boots
- THEN a `.innfo-view-tab[data-tab="metamodel"]` exists and `#innfo-tab-metamodel` contains an SVG with one node per concept

## Scenario Verification
- **Scenario 1**: Metrics console load defaults to the `Timeline & Projections` tab with zero generic element clutter.
- **Scenario 2**: Clicking `Model Explorer` reveals the concept rail, search input, and element cards.
- **Scenario 3**: Changing a variable input in `Timeline & Projections`, switching to `Model Explorer`, and switching back preserves the modified value and recomputed numbers.
- **Scenario 4**: Direct navigation to `...#matrices` opens the matrices tab directly.
- **Scenario 5**: Scrolling down in a tall timeline keeps the table headers fixed at the top; scrolling right keeps metric names fixed at the left.
- **Scenario 6**: Pinning a metric (e.g. MRR) keeps it visible at the top pinned section; clicking the inline chart icon renders monthly evolution bars matching the grid columns.
