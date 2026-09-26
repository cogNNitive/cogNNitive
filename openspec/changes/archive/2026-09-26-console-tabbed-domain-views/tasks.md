# Tasks: Console Tabbed Domain Views

## Phase 1: Runtime Implementation & Tab Switching
- [x] 1.1 Implement `renderViewTabs(doc, config, model, meta)` in `iNNfo/specs/templates/console/innfo-runtime.js`.
- [x] 1.2 Implement hash routing and tab toggle logic (preserving overrides & input states).
- [x] 1.3 Export `renderViewTabs` in `PUBLIC_API`.

## Phase 2: Layout & Asset Alignment
- [x] 2.1 Update `iNNfo/specs/templates/metrics/assets/timeline.html` with `#innfo-view-tabs` and `#innfo-tab-*` panels.
- [x] 2.2 Add CSS styling for the tab navigation bar and panel transitions.
- [x] 2.3 Rebuild bundle `innfo-console.bundle.js` via `scripts/build-console-bundle.mjs`.

## Phase 3: Console Regeneration & Verification
- [x] 3.1 Update `temp/metrics/console/KpiFlow_V_0-1-0_console.html` and distribute the new bundle.
- [x] 3.2 Update `iNNfo/specs/templates/metrics/samples/Ghostbusters_V_0-1-0_console.html`.
- [x] 3.3 Validate slot contract via `verify.harness.js`.
- [x] 3.4 Run `innfo-core` unit tests to ensure zero regressions.

## Phase 4: Grid Ergonomics (Sticky, Pinning & Inline Charts)
- [x] 4.1 Update `renderTimelineGrid` in `innfo-runtime.js` to support row pinning (📌 button, pinned rows section).
- [x] 4.2 Add inline row chart expansion (📈 button that reveals an inline monthly evolution chart / bar view under the row).
- [x] 4.3 Configure sticky CSS for headers (`thead th`) and first columns (`td.td-sticky`, `th.th-sticky`) with proper z-indices and background colors.
- [x] 4.4 Rebuild bundle and update assets/samples (`timeline.html`, `KpiFlow_V_0-1-0_console.html`, `Ghostbusters_V_0-1-0_console.html`).
- [x] 4.5 Run validation harness, unit tests, and launch browser.
