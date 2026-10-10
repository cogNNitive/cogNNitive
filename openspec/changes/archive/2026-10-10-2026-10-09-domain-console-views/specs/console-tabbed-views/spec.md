# Delta for console-tabbed-views

## MODIFIED Requirements

### Requirement: R1: Dynamic View Tab Generation

Tabs SHALL come from the view registry (`console-view-registry`) on boot. The runtime SHALL register built-in views from the `model` payload: a `Model Explorer` tab when `elements` exist, and a `Matrices` tab when `matrices` exist and are non-empty. Domain tabs (e.g. `Timeline & Projections`, or the title in `meta.domainTabTitle`) SHALL be created by the registered views the bluepriNNt or domaiNN supplies.
(Previously: the runtime inspected `config.needs` and the `model` payload to create fixed tabs.)

#### Scenario: Registered view becomes a tab
- GIVEN a registered view `timeline` with title `Timeline & Projections`
- WHEN the console boots
- THEN a tab with that title exists

#### Scenario: Empty matrices
- GIVEN a model with no matrices
- WHEN the console boots
- THEN no `Matrices` tab is created

### Requirement: R3: Tab Navigation & State Preservation

Switching tabs SHALL toggle display visibility of the corresponding panels: one per registered view, plus `#innfo-tab-explorer` and `#innfo-tab-matrices`. Switching tabs SHALL NOT reset input values, variable overrides, or scroll states. The URL hash SHALL update upon tab switch (e.g. `#timeline`, `#explorer`, `#matrices`) and support browser back/forward navigation.
(Previously: panels were the fixed `#innfo-tab-domain`, `#innfo-tab-explorer`, `#innfo-tab-matrices`.)

#### Scenario: Hash opens Matrices
- GIVEN a model with matrices
- WHEN `...#matrices` is opened
- THEN the Matrices panel is the only visible panel

#### Scenario: State survives switching
- GIVEN a changed variable input in a view
- WHEN another tab is shown and then the view again
- THEN the value is unchanged

### Requirement: R4: Layout Separation

In the `Timeline & Projections` view the content SHALL contain the Timeline & P&L Projection Table (`.innfo-timeline-table`), Interactive Growth Selectors and Variable Overrides, and the scenario studio; charts (`#innfo-charts`) are retired from the domain console with the legacy `timeline.html` shell. In the `Model Explorer` tab it SHALL contain the Concept Rail (`#innfo-rail`), the search toolbar (`.innfo-toolbar`) and the element cards list (`#innfo-content`). The `Matrices` tab SHALL have its own panel `#innfo-tab-matrices` containing the relational matrix grids (`#innfo-matrices`), as a sibling of the explorer panel and not nested in it.
(Previously: the Matrices panel was specified but never created, so the tab rendered empty.)

#### Scenario: Matrices render in own panel
- GIVEN a model with a non-empty matrix
- WHEN the Matrices tab is activated
- THEN `#innfo-tab-matrices` exists as a sibling of `#innfo-tab-explorer`
- AND the matrix grid renders inside it
