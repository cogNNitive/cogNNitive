# Technical Design: Modern Console UI Foundation

## 1. Architecture Overview

The console runtime (`innfo-console.bundle.js`) is an offline concatenation of UMD/IIFE scripts executed in the global browser environment (`window` / `globalThis`).

```
+---------------------------------------------------------------------------------+
|                               innfo-console.bundle.js                           |
|                                                                                 |
| 1. innfo-slug.generated.js     -->  window.InnfoSlug                           |
| 2. preact.min.js               -->  window.preact (Component, h, render, hooks)|
| 3. htm.min.js                  -->  window.htm (binds to preact.h -> window.html)
| 4. uplot.iife.min.js           -->  window.uPlot                               |
| 5. visuals.js                  -->  window.InnfoVisuals (colors, palettes)     |
| 6. innfo-icons.js              -->  window.InnfoIcons (Lucide SVG dictionary)   |
| 7. ui-kit.js                   -->  window.InnfoUI (tokens & Preact primitives)|
| 8. review.js                   -->  window.InnfoReview                         |
| 9. innfo-runtime.js            -->  window.InnfoConsole (core orchestrator)    |
| 10. render-model-viewer.js     -->  window.InnfoModelViewer                     |
| 11. render-procedure-stepper.js-->  window.InnfoProcedureStepper               |
+---------------------------------------------------------------------------------+
```

## 2. Component Design

### 2.1 Preact + HTM Integration

- **Distribution:** Vendored minimal UMD builds placed in `iNNfo/specs/bluepriNNts/console/vendor/`:
  - `preact.umd.js` (~11 KB raw, ~4 KB gzip)
  - `htm.umd.js` (~2 KB raw, ~0.8 KB gzip)
- **Global Binding:**
  ```javascript
  // Bound during bundle initialization:
  window.html = window.htm.bind(window.preact.h);
  ```
- **Component Pattern:**
  Any console renderer can define declarative functional components:
  ```javascript
  const { html } = window;
  function Card({ title, badge, children }) {
    return html`
      <div class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body p-4">
          <div class="flex justify-between items-center">
            <h3 class="card-title text-sm">${title}</h3>
            ${badge && html`<span class="badge badge-sm">${badge}</span>`}
          </div>
          <div class="mt-2">${children}</div>
        </div>
      </div>
    `;
  }
  ```

### 2.2 DaisyUI CSS & Design Tokens Integration

- **Strategy:**
  - DaisyUI component classes are precompiled into a standalone CSS file `iNNfo/specs/bluepriNNts/console/innfo-ui.css` (or embedded directly into the shell styles).
  - DaisyUI variables (`--b1`, `--b2`, `--bc`, `--p`, `--s`, `--a`) are mapped to the canonical iNNfo semantic tokens:
    ```css
    :root {
      --b1: var(--innfo-surface, #ffffff);
      --b2: var(--innfo-surface-2, #f3f4f6);
      --b3: var(--innfo-border, #e5e7eb);
      --bc: var(--innfo-text, #111827);
      --p: var(--innfo-accent, #1f2937);
      --pc: #ffffff;
      --rounded-box: var(--innfo-radius-lg, 10px);
      --rounded-btn: var(--innfo-radius, 8px);
      --rounded-badge: var(--innfo-radius-sm, 6px);
    }
    ```
  - This ensures instant theme consistency (light/dark and custom concept colors) without CSS collisions.

### 2.3 Curated Lucide SVG Catalog (`innfo-icons.js`)

- Replaces the hardcoded ~20 SVGs in `visuals.js` with a structured dictionary of ~60-80 stroke-based Lucide icons (16x16 / 24x24 viewBox `0 0 24 24`).
- Exposed API:
  - `InnfoIcons.getSvg(iconName, { size, class, strokeWidth })`: returns raw SVG string.
  - `InnfoIcons.Icon({ name, size, class })`: Preact component rendering `<svg ...>${paths}</svg>`.
  - Fallback logic: if a concept declares an uncataloged Lucide name, falls back to a clean `help-circle` or `box` icon rather than breaking.

### 2.4 Bundle Pipeline (`scripts/lib/console-bundle.js`)

- The `SOURCES` array is updated to:
  ```javascript
  const SOURCES = [
    ['innfo-slug.generated.js', 'InnfoSlug'],
    ['preact.umd.js', 'preact'],
    ['htm.umd.js', 'htm'],
    ['uplot.iife.min.js', 'uPlot'],
    ['visuals.js', 'InnfoVisuals'],
    ['innfo-icons.js', 'InnfoIcons'],
    ['ui-kit.js', 'InnfoUI'],
    ['review.js', 'InnfoReview'],
    ['innfo-runtime.js', 'InnfoConsole'],
    ['render-model-viewer.js', 'InnfoModelViewer'],
    ['render-procedure-stepper.js', 'InnfoProcedureStepper'],
  ];
  ```
- `scripts/build-console-bundle.mjs --check` validates:
  - No `fetch(` calls.
  - No `type="module"`.
  - Exact match of committed bundle with fresh concatenation.

## 3. Backward Compatibility

- Existing imperative renderers continue to work without modification because `InnfoConsole`, `InnfoUI`, and `InnfoVisuals` keep their existing functions.
- The `file://` offline contract is strictly preserved: everything runs in a single evaluation pass with zero remote dependencies.
