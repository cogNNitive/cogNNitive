# Specification: Modern Console UI Foundation

## 1. Declarative Virtual DOM Runtime

### Requirement: Preact & HTM availability in global scope
The console bundle SHALL expose Preact and HTM in the browser execution environment.
- `window.preact` SHALL provide standard Preact exports (`h`, `render`, `Component`, `useState`, `useEffect`).
- `window.htm` SHALL be bound to `window.preact.h` and exposed as `window.html`.
- `window.html` SHALL support tagged template literals to produce valid Preact VNodes without compilation.

### Requirement: Zero compilation and offline execution
- Neither Preact nor HTM SHALL require runtime network requests (`fetch`, `import()`) or transpilation steps (Babel, JSX).
- The runtime SHALL execute synchronously when loaded via standard `<script>` tags in `file://` environments.

## 2. Component Design System (DaisyUI)

### Requirement: Semantic component styles
The console styles SHALL provide DaisyUI component classes for:
- Tables: `.table`, `.table-zebra`, `.table-pin-rows`, `.table-pin-cols`.
- Modals: `.modal`, `.modal-box`, `.modal-action` integrating with native `<dialog>`.
- Layout & Navigation: `.drawer`, `.tabs`, `.card`, `.collapse`.
- Badges & Indicators: `.badge`, `.steps`, `.stats`.

### Requirement: Token mapping
- DaisyUI color and surface variables SHALL map to existing iNNfo tokens (`--innfo-surface`, `--innfo-surface-2`, `--innfo-border`, `--innfo-text`, `--innfo-accent`).
- Light and dark themes SHALL respond to the active `data-theme` attribute without style conflicts.

## 3. Lucide Icon Catalog

### Requirement: SVG icon resolution
The console bundle SHALL provide an icon provider `InnfoIcons`:
- `InnfoIcons.getSvg(name, options)` SHALL resolve valid Lucide icon identifiers to stroke-based inline SVG markup.
- `InnfoIcons.Icon(props)` SHALL render a Preact component with `stroke="currentColor"`, custom size, and CSS classes.
- Unknown or unmapped icon identifiers SHALL fall back to a default indicator icon (`help-circle` or `box`) without throwing errors.

## 4. Bundle Integrity

### Requirement: Single-file offline bundle
- All new foundational libraries SHALL be bundled into `iNNfo/specs/bluepriNNts/console/innfo-console.bundle.js` via `scripts/build-console-bundle.mjs`.
- The bundle SHALL pass `checkConsoleBundle` hygiene: no disallowed `fetch(` calls and no `type="module"`.
