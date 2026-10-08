# Tasks: Modern Console UI Foundation

## How to apply

- Work lands on `session/console-ui-phase1` in dedicated worktree.
- Lean execution: focus on bundle infrastructure and foundational capabilities.
- Keep the `file://` offline contract strictly intact.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~300-450 (bundle composition + icon catalog + css tokens) |
| 400-line budget risk | Low |
| Delivery strategy | single slice on `dev` |
| Chain strategy | n/a (single slice) |

---

## 1. Runtime Vendoring (Preact + HTM)

- [ ] 1.1 Add minimal standalone UMD builds of `preact` and `htm` to `iNNfo/specs/bluepriNNts/console/vendor/`.
- [ ] 1.2 Bind `window.html = window.htm.bind(window.preact.h)` during initialization.
- [ ] 1.3 Add a lightweight test asserting `window.html` produces valid VNodes in the console runtime.

## 2. Lucide Icon Catalog

- [ ] 2.1 Create `iNNfo/specs/bluepriNNts/console/innfo-icons.js` defining `InnfoIcons` with ~60 curated stroke-based Lucide SVGs matching iNNfo concepts and procedures.
- [ ] 2.2 Expose `InnfoIcons.getSvg(name)` and the Preact `InnfoIcons.Icon({ name, size, class })` component.
- [ ] 2.3 Add fallback handling for unknown icon names.

## 3. DaisyUI CSS Component Tokens

- [ ] 3.1 Precompile/extract DaisyUI core component classes (`table`, `modal`, `drawer`, `badge`, `card`, `tabs`, `steps`) into `innfo-ui.css`.
- [ ] 3.2 Map DaisyUI CSS variables to iNNfo semantic design tokens (`--innfo-surface`, `--innfo-border`, `--innfo-accent`, etc.).
- [ ] 3.3 Link/embed `innfo-ui.css` in `artifact_shell.html` and blueprint reference shells.

## 4. Bundle Pipeline & Integrity Verification

- [ ] 4.1 Update `SOURCES` in `scripts/lib/console-bundle.js` to include the new foundational scripts in dependency order.
- [ ] 4.2 Run `node scripts/build-console-bundle.mjs` to regenerate `innfo-console.bundle.js`.
- [ ] 4.3 Run `node scripts/build-console-bundle.mjs --check` to verify no disallowed `fetch(` or `type="module"` exist.
- [ ] 4.4 Run `npm run test` (or `vitest tests/console-shell.test.ts`) to ensure offline contracts pass.
