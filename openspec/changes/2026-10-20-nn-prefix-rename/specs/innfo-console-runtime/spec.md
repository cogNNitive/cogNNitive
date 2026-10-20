# Delta Spec: innfo-console-runtime

Scope guard: only file names and the release tag family of the console assets change. The capability id stays `innfo-console-runtime`. The globals `window.InnfoConsole`, `window.InnfoUI`, `window.InnfoAddress` and `InnfoSlug`, the `--innfo-*` CSS tokens, the `innfo-config`, `innfo-schema`, `innfo-model` slot ids, element ids and `data-innfo-*` attributes, and the `innfo-console:v3:` localStorage key are internal identifiers and MUST NOT be renamed.

## MODIFIED Requirements

### Requirement: Shared UMD/IIFE Runtime

The system MUST ship a single versioned `nn-runtime.js` as a UMD/IIFE global (`window.InnfoConsole`). The bundle MUST include `ui-kit.js` (`window.InnfoUI`), `nn-address.generated.js` (`window.InnfoAddress`), ordered before any module that consumes them.

The runtime MUST instantiate `createKu({ index, onAction })` once at boot and expose the builder as `ctx.ui.Ku`. All console renderers (cards, tables, matrices, rail, facets, guide, timeline, stepper, dialogs) MUST render knowledge units exclusively via `ctx.ui.Ku`.

The legacy methods `ctx.modal.edit` and `ctx.modal.comment` are DELETED from the runtime context; views MUST NOT attempt to invoke modal editors directly. All unit edits and review actions flow through `onAction(action, descriptor)`.

(Previously: the runtime file was `innfo-runtime.js` and the address file `innfo-address.generated.js`; the globals are unchanged.)

#### Scenario: Ku exposed on runtime context
- GIVEN a booted console runtime
- WHEN a view's `mount(ctx)` executes
- THEN `ctx.ui.Ku` is a callable DOM builder function
- AND `ctx.modal.edit` is undefined
- AND `ctx.modal.comment` is undefined

#### Scenario: Renderers consume Ku
- GIVEN table and matrix views rendered by `InnfoConsole`
- WHEN the DOM is inspected
- THEN cells and headers carry `data-innfo-component="ku-unit"`
- AND no legacy `.chip` or unbadged unit text exists

#### Scenario: Edit action dispatches through onAction
- GIVEN a unit edit pencil clicked
- WHEN the click event bubbles
- THEN the delegated listener invokes `onAction('edit', descriptor)`

#### Scenario: Renamed sources keep the same global
- GIVEN the runtime built from `nn-runtime.js` and `nn-address.generated.js`
- WHEN the page loads
- THEN `window.InnfoConsole` and `window.InnfoAddress` are defined

### Requirement: Bundle Matches Its Sources

`nn-console.bundle.js` MUST equal the output of `scripts/build-console-bundle.mjs` over its declared `SOURCES`, which MUST include `ui-kit.js` and MUST NOT include `render-model-viewer.js`. The build MUST emit only `nn-console.bundle.js`; no `innfo-console.bundle.js` exists after PR 2. Root npm scripts `build:console` (build) and `check:console-bundle` (drift check) MUST exist. A node:test drift suite, wired into `verify.js` and `check-integrity.js`, MUST fail when a checked-in bundle differs from a fresh build. The build process MUST be documented.
(Previously: the bundle was `innfo-console.bundle.js`.)

#### Scenario: Fresh bundle passes
- GIVEN sources unchanged since the last build
- WHEN `check:console-bundle` runs
- THEN it passes

#### Scenario: Stale bundle fails
- GIVEN `ui-kit.js` edited without rebuilding
- WHEN the drift suite runs
- THEN it fails naming the bundle

#### Scenario: Drift check can go red
- GIVEN the checked-in bundle with one byte altered
- WHEN the drift suite runs
- THEN it fails

#### Scenario: Viewer not in the bundle
- GIVEN the declared `SOURCES`
- WHEN listed
- THEN `render-model-viewer.js` is absent and the bundle contains no `InnfoModelViewer`

#### Scenario: Single bundle after PR 2
- GIVEN the repository after PR 2
- WHEN the console assets directory is listed
- THEN `nn-console.bundle.js` exists and `innfo-console.bundle.js` does not

### Requirement: Released Bundle Is Versioned

A changed bundle MUST ship under a new `nn-console-v*` tag and a new CDN file; a published tagged bundle MUST NOT be overwritten. Only `nn-console-v*` tags release; existing `innfo-console-v*` tags and their CDN files MUST remain as published. Version references MUST be produced by the release tooling (`sync-versions.mjs`), never hand-edited. Shell edits under `bluepriNNts/**` MUST be accompanied by a `blueprints-v*` tag (not `templates-v*`) and a repin in the same batch. Frozen vendored bundle copies (the three sample/export copies and two innfo-core test fixtures) MUST each be declared frozen or regenerated explicitly.
(Previously: tags were `innfo-console-v*`, and the requirement bound the change and change C (`2026-10-01-console-review-ux`) to ONE tag.)

#### Scenario: Refs are derived
- GIVEN the release batch
- WHEN `validate-manifest` and `check-integrity` run
- THEN both pass with generated refs only

#### Scenario: First nn-console release
- GIVEN the console assets renamed in PR 2
- WHEN the first release is cut
- THEN the tag is `nn-console-v<version>` with a version strictly greater than the highest existing `innfo-console-v*`

#### Scenario: Shell edit requires blueprints tag
- GIVEN a shell under `bluepriNNts/**` changed
- WHEN the release batch is validated
- THEN a new `blueprints-v*` tag and repin are present

#### Scenario: Vendored copies
- GIVEN the five vendored bundle copies
- WHEN the bundle is rebuilt
- THEN each is regenerated or declared frozen

## ADDED Requirements

### Requirement: Console asset files use the nn prefix

From PR 2 the console runtime sources, stylesheet and bundle MUST be named with the `nn-` prefix: `nn-runtime.js`, `nn-icons.js`, `nn-preact-init.js`, `nn-address.generated.js`, `nn-slug.generated.js`, `nn-ui.css` and `nn-console.bundle.js`, under `iNNfo/specs/bluepriNNts/console/`. The regenerated payload (`console-payload.generated.cjs`) and the generated shells MUST reference the new names. No console asset file name MAY begin with `innfo-` after PR 2.

#### Scenario: Files renamed
- GIVEN `iNNfo/specs/bluepriNNts/console/` after PR 2
- WHEN it is listed
- THEN the seven `nn-` files exist and the former `innfo-*` runtime sources and `innfo-ui.css` do not

#### Scenario: Payload regenerated
- GIVEN the payload generator run after the rename
- WHEN `console-payload.generated.cjs` is checked against a fresh build
- THEN there is no drift

### Requirement: Internal console identifiers are unchanged by the rename

No PR MAY change the following in the runtime: the `window.InnfoConsole`, `window.InnfoUI`, `window.InnfoAddress` and `InnfoSlug` globals, the `--innfo-*` CSS custom properties, DOM ids and classes beginning `innfo-`, `data-innfo-*` attributes, the `innfo-config`, `innfo-schema` and `innfo-model` slot ids, and the `innfo-console:v3:` localStorage key. Drafts saved by reviewers MUST therefore survive the rename.

#### Scenario: Saved drafts survive
- GIVEN a reviewer with a draft stored under the `innfo-console:v3:` key before PR 2
- WHEN the console built after PR 2 boots for the same domaiNN
- THEN the draft is loaded from the same key

#### Scenario: Styling tokens unchanged
- GIVEN `nn-ui.css` after the rename
- WHEN its custom properties are listed
- THEN they are the same `--innfo-*` names as before
