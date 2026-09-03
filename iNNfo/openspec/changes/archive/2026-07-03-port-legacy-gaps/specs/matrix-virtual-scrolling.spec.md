# Delta: Matrix Virtual Scrolling — Rows and Columns in MatricesGrid

## Purpose

Port virtual scrolling to `MatricesGrid.vue` to handle matrices with 10,000+ cells. Currently, the entire matrix table renders in the DOM regardless of size, which causes performance degradation beyond ~200 cells. Virtual scrolling renders only the visible rows and columns, reusing DOM elements as the user scrolls.

## Requirements

### R-MV-01: Virtual Scroll for Rows

`MatricesGrid.vue` MUST virtualize row rendering. Only rows within the visible viewport (plus a configurable overscan, default 3) MUST be rendered as DOM elements. The total row count MUST determine the scrollable area height via a spacer element or the virtual scroller's container height.

The virtual scroller library (e.g., `vue-virtual-scroller` or a custom `@vueuse/core`-based implementation) MUST be used. The implementation MUST handle:

- Fixed row height (default 48px per row)
- Dynamic content re-render when rows/columns change (add/remove nodes)
- Scroll position preservation when rows are filtered but not reordered

#### Scenario: Only visible rows render in DOM

- GIVEN a matrix with 500 source rows and 500 target columns (250,000 cells)
- WHEN the MatricesGrid renders
- THEN the scrollable container has a calculated height covering all 500 rows
- BUT only ~15–25 rows exist in the DOM (those within the viewport + overscan)
- AND scrolling reveals more rows without lag

### R-MV-02: Virtual Scroll for Columns

Column headers MUST also be virtualized horizontally. Only column headers within the visible viewport (plus overscan) MUST render. The first column (source concept row header) MUST remain sticky (`position: sticky; left: 0`) and NOT virtualized.

The horizontal scroll container MUST sync with the row virtual scroller so that both scroll in unison. Column width MUST be configurable per matrix definition (via `params` field, e.g., `colWidth:120`), defaulting to 120px.

#### Scenario: Column headers virtualized, first column sticky

- GIVEN a matrix with 500 target columns
- WHEN the MatricesGrid renders
- THEN approximately 8–12 column headers render in the DOM (viewport + overscan)
- AND the first column (source concept pills) is sticky at `left: 0`
- AND horizontal scrolling reveals more columns

### R-MV-03: Cell Rendering with Virtual Windows

The intersection of visible rows and visible columns determines the rendered cell window. Only cells in this window MUST be rendered. Cells outside the window MUST be represented as empty space (no DOM nodes). On scroll, new cells enter the window and old cells leave.

Each cell in the window MUST render its full interactive widget (checkbox, cycle button, scale select, etc.) — not a simplified placeholder.

#### Scenario: Windowed cell rendering

- GIVEN visible rows 10–30 and visible columns 10–25
- WHEN the grid renders
- THEN only cells at the intersection of rows 10–30 and columns 10–25 exist in the DOM
- AND each rendered cell shows its full interactive widget
- AND scrolling to rows 30–50 causes cells outside the new window to unmount

### R-MV-04: Scroll Position Persistence

When switching between matrices (dropdown selection), the scroll position MUST be reset to `(0, 0)`. When the user scrolls within a matrix, the scroll position MUST NOT affect other matrices.

#### Scenario: Scroll resets on matrix switch

- GIVEN the user scrolls matrix A to row 200, col 150
- WHEN the user selects matrix B from the dropdown
- THEN matrix B renders at scroll position (0, 0)
- AND switching back to matrix A restores position (row 200, col 150)

### R-MV-05: Cell Editing and Value Distribution

All existing cell editing interactions (checkbox, cycle button, scale select, set select, free text input) MUST work inside virtualized cells. The value distribution summary bar at the top MUST update based on all cells (not just visible ones). The "Copy Table MD" button MUST export all cells (not just visible).

#### Scenario: Value distribution reflects full dataset

- GIVEN a matrix with 10,000 cells, of which 2,500 have value "X" (boolean)
- WHEN the grid renders
- THEN the value distribution shows "— : 7500, X : 2500"
- AND "Copy Table MD" exports all 10,000 cells

### R-MV-06: Library Choice

The virtual scroller MUST use either:

a) `vue-virtual-scroller` (npm package) — if compatible with Vue 3.5+
b) A custom implementation using `@vueuse/core`'s `useVirtualList` composable
c) A thin wrapper around `@tanstack/react-virtual`'s core algorithm, adapted for Vue

The chosen library MUST NOT add more than 15KB (minified + gzip) to the bundle.

#### Scenario: Library loads without errors

- GIVEN the virtual scroller dependency is installed
- WHEN the MatricesGrid page loads
- THEN no runtime errors related to virtual scrolling occur
- AND the grid renders with visible rows only

### R-MV-07: Scope Guard — No Changes to Matrix Definitions or Export

This slice MUST NOT modify matrix definition parsing, the `__matrix_defs` field structure, the cell storage format (`MatrixName||Row||Col` keys on root node fields), or the Markdown export format.

#### Scenario: Matrix field structure unchanged

- GIVEN a saved matrix with cells stored as `M1||ConceptA||ConceptB: "X"`
- WHEN this slice is applied
- THEN the cell keys remain `M1||Source||Target` format
- AND the `__matrix_defs` array structure is unchanged
