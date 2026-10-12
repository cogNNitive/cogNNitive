# innfo-console-runtime Specification

## Purpose

One shared versioned runtime (`innfo-runtime.js`) plus a thin console shell (`artifact_shell.html`) for all HTML console artifacts. Eliminates inline runtime duplication across template assets while preserving `file://` double-click with zero build.

## Requirements

### Requirement: Shared UMD/IIFE Runtime

The system MUST ship a single versioned `innfo-runtime.js` as a UMD/IIFE global (`window.InnfoConsole`). The console bundle MUST also include `ui-kit.js` (`window.InnfoUI`), ordered before any module that consumes it, and MUST inject the design tokens at boot. The runtime and kit MUST NOT use `fetch()` and MUST NOT use `type=module`. They MUST be hosted on GitHub Pages and jsDelivr, with a vendored local fallback for offline use.
(Previously: the bundle did not include `ui-kit.js` or token injection.)

#### Scenario: Offline file:// open
- GIVEN a generated console referencing the runtime
- WHEN opened via `file://` double-click with no network
- THEN the console renders fully from the local fallback

#### Scenario: No module primitives in runtime
- GIVEN the published `innfo-runtime.js` and bundle
- WHEN scanned for `fetch(` and `type=module`
- THEN neither token appears

#### Scenario: Kit available before consumers
- GIVEN the bundle loaded
- WHEN `InnfoConsole` and `InnfoModelViewer` initialize
- THEN `window.InnfoUI` is already defined

### Requirement: Console Shell with Config and JSON Slots

`artifact_shell.html` MUST declare an `innfo-config` block with a `needs[]` capability list and exactly two JSON slots: `innfo-schema` and `innfo-model`. Generated consoles MUST declare only `needs[]` plus slot payloads, MUST NOT inline runtime code, and MUST NOT supply feedback UI markup.
(Previously: did not forbid feedback markup, which the runtime needed as anchors.)

#### Scenario: Thin console renders from slots

- GIVEN a console with `needs: ["feedback-export"]` and populated slots
- WHEN opened via `file://`
- THEN the runtime hydrates the view and injects the feedback UI

#### Scenario: Undeclared capability stays dormant

- GIVEN a console whose `needs[]` omits `feedback-export`
- WHEN the runtime boots
- THEN no export UI is injected or rendered

### Requirement: No Duplicated Inline Runtime

The reference assets (`business/assets/model_viewer.html`, `workspace/assets/model_console.html`) MUST thin onto the shell. The `timeline` and `procedure` consoles are registered views (see `console-view-registry`), not reference assets: `metrics/assets/timeline.html` and `procedures/assets/procedure_console.html` no longer exist. No console artifact SHALL ship duplicated inline runtime; the bundle appears once per artifact. `workspace/assets/model_console.html` MUST render the origin-typed citation icons and the citation detail dialog defined by the `console-field-citations` capability. `business/assets/model_viewer.html` MUST remain unchanged and reachable from `main` for one release cycle after `workspace/assets/model_console.html` ships, because installed procedures fetch it by that path.
(Previously: the reference assets were `business/assets/model_viewer.html`, `workspace/assets/model_console.html` and `metrics/assets/timeline.html`, all required to thin onto the shell.)

#### Scenario: Reference assets thinned

- GIVEN the two reference assets after this change
- WHEN scanned for inline runtime markers
- THEN no duplicated runtime block is found

#### Scenario: Timeline and procedure shells are gone

- GIVEN the bluepriNNt assets after this change
- WHEN `metrics/assets/` and `procedures/assets/` are listed
- THEN neither `timeline.html` nor `procedure_console.html` exists

#### Scenario: New workspace-level asset renders citations

- GIVEN a compiled model with `el.citations` populated
- WHEN `workspace/assets/model_console.html` renders that element
- THEN an origin-typed icon is shown per the `console-field-citations` rules

#### Scenario: Old business shell still resolves during the transition cycle

- GIVEN an installed procedure referencing `business/assets/model_viewer.html` by its pre-existing path
- WHEN that procedure runs during the one-cycle transition window
- THEN the fetch succeeds because the file has not been removed or moved

### Requirement: Console compile procedure relocated to workspace level

The compile procedure file MUST move from `business/procedures/compile_model_viewer_NN.md` to `workspace/procedures/compile_model_console_NN.md`. This relocation MUST be accompanied by: updating the `business/spec_NN.md` frontmatter and history prose to drop the moved procedure reference, updating the business mirror in `canonical-registry.ts`, bumping both the source `template_version` and the `SHIPPED_TEMPLATE_VERSIONS` registration, rebuilding `innfo-console.bundle.js` with a new `innfo-console-v*` pin, and cutting a new `templates-v*` tag with a re-pin. No reference to the old `business/procedures/compile_model_viewer_NN.md` path MUST remain anywhere in the codebase after the relocation lands.

#### Scenario: Procedure moved and registered

- GIVEN the relocation commit has landed
- WHEN `workspace/procedures/compile_model_console_NN.md` is resolved as a template procedure
- THEN it is found under `workspace/procedures/`, registered in `canonical-registry.ts`, and its `template_version` is present in `SHIPPED_TEMPLATE_VERSIONS`

#### Scenario: No dangling references to the old procedure path

- GIVEN the relocation commit has landed
- WHEN `check:integrity` and `validate-manifest` run
- THEN neither reports a reference to `business/procedures/compile_model_viewer_NN.md`
- AND both checks pass

### Requirement: Bundle-Injected Feedback UI

When `needs[]` declares `feedback-export`, `InnfoConsole` MUST inject the banner, export button and modal itself through an idempotent routine, creating one `[data-innfo-feedback-root]` with `#innfo-feedback-banner`, `#innfo-feedback-open` and `#innfo-feedback-modal`. It MUST read `needs[]` from the DOM so boot order does not matter. Shells MUST NOT need feedback markup; the old `#innfo-banner`, `#innfo-export-open` and `#innfo-export-modal` markup and CSS MUST be removed from `artifact_shell.html` (the timeline shell no longer exists). Injection MUST happen once even if the bundle boots more than once, MUST work offline via `file://`, and MUST NOT use `fetch` or `type=module`. The new ids MUST NOT clash with any other dialog in the page: the procedure view's step-log dialog MUST be scoped to its own container and MUST NOT use `#innfo-export-modal`. Styling MUST be minimal CSS classes.
(Previously: the markup was removed from `artifact_shell.html` and `metrics/assets/timeline.html`, and the ids were required not to clash with the procedure stepper's own `#innfo-export-modal`.)

#### Scenario: Canonical console gains feedback unchanged

- GIVEN `model_console.html` with unchanged markup declaring `feedback-export`
- WHEN opened
- THEN the export button is present and the modal opens

#### Scenario: Single injection

- GIVEN a console where the bundle boots twice
- WHEN the page loads
- THEN exactly one feedback root, one banner and one export button exist

#### Scenario: No clash with the procedure view

- GIVEN a domaiNN console whose `procedure` view has a step-log dialog
- WHEN the feedback UI is injected
- THEN both dialogs coexist with distinct ids and no id appears twice in the document
- AND the log dialog does not use `#innfo-export-modal`

### Requirement: Needs Registry Without Feedback Anchors

`needs-registry.json` MUST declare `feedback-export` with empty anchors (`[]`). The shell guard (`scripts/lib/console-shell-guard.js`) MUST NOT contain a hard-coded exemption for `model_console.html` or for `feedback-export`.

#### Scenario: Exemption gone

- GIVEN the guard after this change
- WHEN it runs over the repository shells
- THEN `model_console.html` passes through the registry rule alone, and the source has no `model_console.html`-specific branch

#### Scenario: No anchors required

- GIVEN a shell declaring `feedback-export` with no feedback markup
- WHEN the guard runs
- THEN it passes

### Requirement: Bundle Matches Its Sources

`innfo-console.bundle.js` MUST equal the output of `scripts/build-console-bundle.mjs` over its declared `SOURCES`, which MUST include `ui-kit.js`. Root npm scripts `build:console` (build) and `check:console-bundle` (drift check) MUST exist. A node:test drift suite, wired into `verify.js` and `check-integrity.js`, MUST fail when the checked-in bundle differs from a fresh build. The build process MUST be documented.

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

#### Scenario: Preexisting drift is absorbed
- GIVEN the checked-in bundle differs from a fresh build before this change
- WHEN the first slice lands
- THEN the bundle is regenerated so the drift suite passes

### Requirement: Released Bundle Is Versioned

A changed bundle MUST ship under a new `innfo-console-v*` tag and a new CDN file; a published tagged bundle MUST NOT be overwritten. This change and change C (`2026-10-01-console-review-ux`) MUST ship under ONE `innfo-console-v*` tag. Version references MUST be produced by `channel-refs.js` and `sync-versions.mjs`, never hand-edited. Shell edits under `bluepriNNts/**` MUST be accompanied by a `blueprints-v*` tag (not `templates-v*`) and a repin in the same batch. Frozen vendored bundle copies (the three sample/export copies and two innfo-core test fixtures) MUST each be declared frozen or regenerated explicitly.

#### Scenario: Refs are derived
- GIVEN the release batch
- WHEN `validate-manifest` and `check-integrity` run
- THEN both pass with generated refs only

#### Scenario: One tag for B and C
- GIVEN B and C both merged
- WHEN the release is cut
- THEN a single `innfo-console-v*` tag covers both and no tag ships B's kit without C

#### Scenario: Shell edit requires blueprints tag
- GIVEN a shell under `bluepriNNts/**` changed
- WHEN the release batch is validated
- THEN a new `blueprints-v*` tag and repin are present

#### Scenario: Vendored copies
- GIVEN the five vendored bundle copies
- WHEN the bundle is rebuilt
- THEN each is regenerated or declared frozen

### Requirement: Untrusted text is never parsed as markup

The runtime MUST render model titles, concept names, element/field values, timeline
labels, search/hash tokens and error strings as text (via `textContent` or an escape
helper), never as raw `innerHTML`. The artifact shell MUST declare a
Content-Security-Policy that forbids inline script execution while still loading the
console bundle and its JSON data islands.

#### Scenario: Hostile model title and concept name render inert

- GIVEN a payload whose model title is `<img src=x onerror=alert(1)>` and a concept named `<script>x()</script>`
- WHEN the console renders the hub and the model view
- THEN both strings appear literally as text
- AND no element or handler is created from them

#### Scenario: Hostile hash token renders inert

- GIVEN the location hash carries a search token `"<svg onload=alert(1)>"`
- WHEN the active filter pills render
- THEN the pill shows the token as text and no `svg` element exists

#### Scenario: Hostile error string renders inert

- GIVEN `renderErrors` receives a message containing HTML
- WHEN errors are shown
- THEN the message is displayed as text

### Requirement: Exported changesets are resolvable by apply_change

`draftToChange` MUST emit a `target` whose model part is the model's file stem and whose
element part is an identifier `apply_change` resolves (name or slug). A draft of kind
`new` MUST export as `op:: add_element` (concept, name, fields); a `new` draft lacking a
concept or name MUST export as `op:: comment`. When the target element hash is known, the
change MUST carry `base_hash`.

#### Scenario: Round trip from console to apply

- GIVEN console drafts of kind `correction`, `delete` and `new` against a fixture domain
- WHEN they are exported, parsed with `parseChangeset` and applied with `applyChange`
- THEN every change resolves its target and applies without a resolution error

### Requirement: Per-draft staleness is visible

The runtime MUST use `isTargetChanged` to mark a draft whose target element changed
since the draft was created.

#### Scenario: Target edited after drafting

- GIVEN a draft created against element hash H1
- WHEN the console loads a payload where that element's hash is H2
- THEN the draft is flagged stale in the review UI

### Requirement: Element Media Lightbox

The runtime MUST provide `renderMediaDialog(doc, items, start)`: a native
`<dialog>` showing an element's image fields with prev/next navigation, a
position counter and an open/download link, navigable with the arrow keys. The
element card's image thumbnail MUST open it when the element has image fields.

#### Scenario: Open from the thumbnail
- GIVEN a card whose element has two image fields
- WHEN the thumbnail is clicked
- THEN `#innfo-media-dialog` shows the first image and a `1 / 2` counter

#### Scenario: Advance
- GIVEN the open lightbox
- WHEN next is clicked
- THEN the second image shows and the counter reads `2 / 2`

### Requirement: Field Detail Dialog

The runtime MUST provide `renderFieldDetailDialog(doc, field)` opening a
read-only `<dialog>` that renders one field's full value through `InnfoUI.FieldValue`.
In Table mode, double-clicking a field cell MUST open it for that cell.

#### Scenario: Double-click a cell
- GIVEN Table mode
- WHEN a field cell is double-clicked
- THEN `#innfo-field-dialog` opens with the field name and its typed value

### Requirement: Incoming Relations On Cards

Every element card MUST show its incoming relations (elements whose relations
target it) in a `Referenced by (n)` section, in addition to its outgoing
relations. Incoming relations are derived by scanning every element's
`relations` for a target equal to the card's id.

#### Scenario: Referenced element
- GIVEN element B whose relation targets element A
- WHEN A's card renders
- THEN it contains `.innfo-card-incoming` labelled `Referenced by (1)` linking to B

### Requirement: Concept Guidance Panel

The runtime MUST provide a right-hand concept guide (`#innfo-concept-guide`) that
appears when a single concept is in focus (a `concept:` filter) and shows the
concept's description, field schema, markers, associated matrices and element
count; it MUST be removed when no single concept is in focus.

#### Scenario: Concept in focus
- GIVEN a `concept:Fleet` filter and a Fleet concept with a description
- WHEN the explorer refreshes
- THEN `#innfo-concept-guide` renders the description, fields, matrices and element count

#### Scenario: Focus cleared
- GIVEN the guide is shown
- WHEN the concept filter is cleared
- THEN `#innfo-concept-guide` is removed
