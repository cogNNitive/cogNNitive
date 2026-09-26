# Technical Design: Console Tabbed Domain Views

## 1. Architecture Overview

```
+-------------------------------------------------------------------------+
| #innfo-banner (Title, version, active needs, export feedback)          |
+-------------------------------------------------------------------------+
| #innfo-view-tabs (Dynamic tab buttons: [📊 Timeline] [🗂️ Explorer] [🔗 Matrices]) |
+-------------------------------------------------------------------------+
|                                                                         |
|  [ TAB 1: #innfo-tab-domain ] (Active for metrics)                      |
|    +-- KPI Summary Cards                                               |
|    +-- Timeline & P&L Grid (Interactive inputs & Growth selectors)      |
|    +-- uPlot Dynamic Charts                                            |
|                                                                         |
|  [ TAB 2: #innfo-tab-explorer ]                                         |
|    +-- #innfo-rail (Sticky concept list) + Search toolbar              |
|    +-- #innfo-content (Element cards)                                  |
|                                                                         |
|  [ TAB 3: #innfo-tab-matrices ]                                         |
|    +-- #innfo-matrices (Relational tables)                             |
|                                                                         |
+-------------------------------------------------------------------------+
```

## 2. Component Design

### 2.1 Tab Bar Renderer (`renderViewTabs`)
- Target container: `<nav id="innfo-view-tabs">` placed immediately below `#innfo-banner`.
- Generated buttons have class `innfo-view-tab` and `data-target="<tab-id>"`.
- The active button receives `.active` class with styling:
  - Background: `var(--surface)`
  - Border: `1px solid var(--border)`, border-bottom: `2px solid var(--primary)`
  - Font-weight: `700`

### 2.2 Tab Panels
- The main DOM wrapper wraps the respective views into tab panels:
  - `<div id="innfo-tab-domain" class="innfo-tab-panel">`: contains `#innfo-timeline-grid` and `#innfo-charts`.
  - `<div id="innfo-tab-explorer" class="innfo-tab-panel">`: contains `#innfo-layout` (`#innfo-rail` + search + `#innfo-content`).
  - `<div id="innfo-tab-matrices" class="innfo-tab-panel">`: contains `#innfo-matrices`.
- CSS controls visibility:
  ```css
  .innfo-tab-panel { display: none; }
  .innfo-tab-panel.active { display: block; }
  ```

### 2.3 Deep Linking & Hash Routing
- Hash anchors like `#timeline`, `#explorer`, `#matrices` map directly to tab selection.
- Clicking an element reference pill switches to `#explorer` and scrolls smoothly to `#row-<element-id>` or opens the detail dialog.

## 3. Backward Compatibility
- If a console HTML does not define `#innfo-view-tabs` or `#innfo-tab-*` panels, the runtime gracefully renders all sections inline as before.
- Existing tests and validation harnesses continue passing without disruption.
