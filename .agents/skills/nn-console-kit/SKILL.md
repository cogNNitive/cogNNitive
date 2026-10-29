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
* Payload data is injected into HTML shells via embedded `<script id="nn-model">` JSON slots.

### Rule C: No Ad-Hoc NPM Runtime Dependencies
* All runtime code must belong to the 12 canonical sources listed in `scripts/lib/console-bundle.js`.
* Adding a third-party library requires explicit maintainer approval and a standalone UMD vendor file placed under `iNNfo/specs/bluepriNNts/console/vendor/`.

---

## 2. Canonical Bundle Sources (`scripts/lib/console-bundle.js`)

The console bundle is composed strictly in dependency order:

1. `nn-slug.generated.js` (`nnSlug`) — Slug generation
2. `nn-address.generated.js` (`nnAddress`) — Canonical address parsing
3. `vendor/preact.umd.js` (`preact`) — Preact core
4. `vendor/htm.umd.js` (`htm`) — Hyperscript Tagged Markup
5. `nn-preact-init.js` (`nnPreact`) — Global `html` binding
6. `uplot.iife.min.js` (`uPlot`) — Lightweight time-series & metrics plotting
7. `visuals.js` (`nnVisuals`) — Visual card components & uPlot wrappers
8. `nn-icons.js` (`nnIcons`) — Inline SVG icon library
9. `ui-kit.js` (`nnUI`) — UI primitives (badges, status tags, accordions)
10. `review.js` (`nnReview`) — Interactive changeset review widgets
11. `nn-runtime.js` (`nnConsole`) — Application state, router, and view switcher
12. `render-procedure-stepper.js` (`nnProcedureStepper`) — Interactive step-by-step procedure runner

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
