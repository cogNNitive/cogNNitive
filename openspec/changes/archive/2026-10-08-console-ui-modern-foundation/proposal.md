# Proposal: Modern Console UI Foundation (Preact + HTM, DaisyUI, Lucide)

## Why

The current generation of iNNfo domain and blueprint consoles (`metrics/timeline`, `procedures/stepper`, `workspace/model_viewer`, `matrix-grids`) relies on imperative DOM manipulation (`document.createElement`) and a minimal set of hand-coded SVGs in `visuals.js`.

While the zero-dependency, single-file bundle architecture (`innfo-console.bundle.js`) and the `file://` offline contract are major strengths, scaling the UI brings three clear bottlenecks:

| Problem | Evidence | Impact |
|---|---|---|
| **Imperative DOM rendering** | `innfo-runtime.js` and renderers contain thousands of lines of manual `document.createElement`, `classList`, and `appendChild` chains. | High cognitive load, high risk of DOM-state bugs, difficult maintenance of complex interactive views (tables, trees, wizards). |
| **Lack of high-level UI component primitives** | Only basic tokens are provided in `ui-kit.js`. Advanced UI elements (modals, sticky-column tables, responsive drawers, collapse panels) are styled ad-hoc per console shell. | Visual inconsistency across blueprint consoles; difficult to produce rich, responsive dashboards. |
| **Fragmented and partial icon set** | The iNNfo specification contracts (`iNNfo_V_*.md`, `workspace_spec_*.md`) declare `icon: Lucide icon identifier`, and the editor uses `lucide-vue-next`, but the console runtime only carries ~20 hand-coded SVGs in `visuals.js`. | Inability to render domain concept icons without falling back to emojis or generic file icons. |

## What Changes (Phase 1: Foundation)

This change establishes the foundational UI layer inside the offline console bundle without adding runtime build steps, external network calls, or breaking the `file://` contract.

1. **Declarative Virtual DOM without compilation (Preact + HTM):**
   - Vendoring minified `preact` and `htm` into the console sources.
   - HTM uses native tagged template literals (`html\`<div class="card">${title}</div>\``), giving component ergonomics and reactive state in ~4 KB without Babel, JSX, or bundlers in the client.
   - Exposing `html`, `render`, `useState`, `useEffect`, etc., via the bundle.

2. **Modern Component Design System (DaisyUI CSS):**
   - Compiling a standalone, lightweight CSS asset (`innfo-ui.css`) from DaisyUI component styles (`.table`, `.modal`, `.card`, `.badge`, `.tabs`, `.drawer`, `.steps`, `.stats`).
   - Binding DaisyUI semantic tokens directly to the existing `--innfo-*` token architecture, preserving full light/dark mode and active app color identity.

3. **Curated Lucide SVG Catalog:**
   - Expanding `visuals.js` (or introducing `innfo-icons.js`) with a curated catalog of ~60-80 Lucide icons in clean, stroke-based inline SVG format.
   - Providing a declarative `<Icon name="table" size=16 />` helper compatible with Preact + HTM.

4. **Strict `file://` Offline Guarantee:**
   - Bundled sequentially via `scripts/build-console-bundle.mjs` into `innfo-console.bundle.js`.
   - Guaranteed zero `fetch()`, zero `type="module"`, and zero external network font/script dependencies.

### Out of Scope (Deferred to Phases 2 & 3)

- Complete rewrite of existing domain and procedure renderers (they will continue running unchanged via backward-compatibility anchors).
- Migration of legacy reference sample HTML files.

## Capabilities

### New Capabilities
- `console-declarative-runtime`: Exposes Preact and HTM runtime within `innfo-console.bundle.js` for declarative component rendering.
- `console-daisyui-styling`: Provides precompiled DaisyUI component classes mapped to `--innfo-*` tokens for offline shells.
- `console-lucide-catalog`: Provides inline SVG resolution for standard Lucide icon identifiers declared in domain schemas and blueprints.

### Modified Capabilities
- `console-bundle-pipeline`: Updated `scripts/lib/console-bundle.js` to include the new sources in dependency order and verify offline invariants.
