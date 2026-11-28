---
name: nn-console-kit
version: "1.0.0"
description: Architecture, rendering rules, and bundle integrity guardrails for the cogNNitive domain console (Preact + HTM standalone bundle).
---

# nn-console-kit Skill (Domain Console Architecture & Governance)

## Overview

The `cogNNitive` domain console is a single-file, offline-capable, standalone UMD bundle located at `iNNfo/specs/bluepriNNts/console/nn-console.bundle.js`. It runs in any modern browser without an active server, bundler, or build tool.

Whenever an agent or developer touches the console UI, views, or bundle pipeline, they MUST adhere to these architectural constraints.

---

## 1. Architectural Invariants (MANDATORY)

### Rule A: No JSX — Pure HTM Tagged Templates Only
The console runtime does NOT compile JSX at runtime or during development.
* **FORBIDDEN**: `<div className="card"><span>{title}</span></div>`
* **MANDATORY**: `html\`<div class="card"><span>${title}</span></div>\`` using the global `html` tag provided by `vendor/htm.umd.js` and bound in `nn-preact-init.js`.

### Rule B: Zero Runtime Network Calls & No Modules
* The console must be fully self-contained and work offline on the `file://` protocol.
* **FORBIDDEN**: `fetch(...)`, `XMLHttpRequest`, or `<script type="module">`.
* Payload data is injected into HTML shells via embedded script slots. `nn-config`, `nn-schema` and `nn-view-data` are plain JSON. `nn-model` (`type="application/x-nn-deflate-base64"`) holds the model JSON compressed with deflate-raw (level 9) and base64-encoded; the runtime decodes it with `DecompressionStream('deflate-raw')` in `autoBoot` before the synchronous `boot(document, { modelText })`, and shows a visible error when the browser lacks it. Saved drafts and UI state live in the plain JSON `<script id="nn-drafts">` slot (`{ drafts, uiState }`, `{}` in a fresh export), never in `nn-model`.
* Decode the model of an exported console in Node: `node -e "const h=require('fs').readFileSync(process.argv[1],'utf8');const b=/id=.nn-model.>([^<]*)</.exec(h)[1];console.log(require('zlib').inflateRawSync(Buffer.from(b.trim(),'base64')).toString())" domaiNN_console.html`

### Rule C: No Ad-Hoc NPM Runtime Dependencies
* All runtime code must belong to the 14 canonical sources listed in `scripts/lib/console-bundle.js`.
* Adding a third-party library requires explicit maintainer approval and a standalone UMD vendor file placed under `iNNfo/specs/bluepriNNts/console/vendor/`.

### Rule D: One Chart Library — Chart.js Through `renderChart`
* Every quantitative chart (built-in tabs and custom views) is drawn with `nnConsole.renderChart(host, option, opts?)`. It delegates to vendored Chart.js (with the ChartTreemap plugin registered), applying console defaults, and returns the chart instance, or `null` with a warning when Chart.js is missing.
* Procedural diagrams (procedure runner flow), summary card tracks, and structural ego graphs use pure DOM/SVG without external library overhead.
* Never render a whole element graph: a force layout with ~2000 nodes blocks the page for ~18 s. Show concepts, or a one-hop neighbourhood of one element.

### Rule E: The Procedure Fold Runs As A Hashed Script, Never Through Eval
* The shell's `#nn-procedure-core` slot is inert (`type="application/json"`) in `artifact_shell.html`. `scripts/export-console.mjs` replaces it with an executable `<script type="text/javascript" id="nn-procedure-core">` holding the fold source, and the CSP generator allows it by its SHA-256 hash.
* The fold source assigns its module to a global (`nnProcedureFold` / `__nnFoldModule`), and `nn-procedure-core.js` picks it up from `window` first. That is what lets a real browser project a run's next state with no `unsafe-eval` in the CSP.
* **FORBIDDEN**: adding `unsafe-eval` to the CSP, or making the browser path depend on evaluating the slot's text. The `new Function` fallback still in `nn-procedure-core.js` throws under the CSP and is caught, so in a browser it always returns `false`; do not build on it.
* Why it matters: when the slot shipped as `application/json`, browsers never ran it, `available()` returned `false`, and the stepper silently fell back to passive mode, so choosing a decision did not move the diagram (found 2026-11-23, fixed by #830).

---

## 2. Canonical Bundle Sources (`scripts/lib/console-bundle.js`)

The console bundle is composed strictly in dependency order:

1. `nn-slug.generated.js` (`nnSlug`) — Slug generation
2. `nn-address.generated.js` (`nnAddress`) — Canonical address parsing
3. `vendor/preact.umd.js` (`preact`) — Preact core
4. `vendor/htm.umd.js` (`htm`) — Hyperscript Tagged Markup
5. `nn-preact-init.js` (`nnPreact`) — Global `html` binding
6. `vendor/chart.umd.min.js` (`Chart`) — Chart.js 4.4.7 (MIT), quantitative chart library
7. `vendor/chartjs-chart-treemap.min.js` (`ChartTreemap`) — chartjs-chart-treemap 2.3.0 (MIT), hierarchical treemap plugin
8. `visuals.js` (`nnVisuals`) — Colour vocabulary and visual helpers
9. `nn-icons.js` (`nnIcons`) — Inline SVG icon library
10. `ui-kit.js` (`nnUI`) — UI primitives (badges, status tags, accordions)
11. `review.js` (`nnReview`) — Interactive changeset review widgets
12. `studio.js` (`nnStudio`) — Timeline grid calculations, formulas, charts, and studio analytics
13. `nn-runtime.js` (`nnConsole`) — Application state, router, and view switcher
14. `render-procedure-stepper.js` (`nnProcedureStepper`) — Interactive step-by-step procedure runner

---

## 3. Workflow & Verification Loop

When modifying any console source file under `iNNfo/specs/bluepriNNts/console/`:

### Step 1: Edit Sources
Make your changes in the individual source files (e.g., `ui-kit.js`, `nn-runtime.js`), NEVER by editing `nn-console.bundle.js` directly.

### Step 2: Regenerate Bundle
```bash
npm run build:console
```
*(Runs `node scripts/build-console-bundle.mjs`)*

### Step 3: Drift Check
```bash
npm run check:console-bundle
```
Verifies that:
- `nn-console.bundle.js` matches fresh composition from sources.
- No `fetch(` calls exist.
- No `type="module"` exists.

### Step 4: Run Console Regression Tests
```bash
node scripts/export-console.test.mjs
```
Ensures metadata injection, HTML compilation, SHA-256 integrity, and model navigation remain green across all 52 tests.
