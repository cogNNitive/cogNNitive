# innfo-console-runtime Specification

## Purpose

One shared versioned runtime (`innfo-runtime.js`) plus a thin console shell (`artifact_shell.html`) for all HTML console artifacts. Eliminates inline runtime duplication across template assets while preserving `file://` double-click with zero build.

## Requirements

### Requirement: Shared UMD/IIFE Runtime

The system MUST ship a single versioned `innfo-runtime.js` as a UMD/IIFE global (`window.InnfoConsole`). The runtime MUST NOT use `fetch()` and MUST NOT use `type=module`. It MUST be hosted on GitHub Pages and jsDelivr, with a vendored local fallback for offline use.

#### Scenario: Offline file:// open

- GIVEN a generated console referencing the runtime
- WHEN opened via `file://` double-click with no network
- THEN the console renders fully from the local fallback

#### Scenario: No module primitives in runtime

- GIVEN the published `innfo-runtime.js`
- WHEN scanned for `fetch(` and `type=module`
- THEN neither token appears

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

The reference assets (`business/assets/model_viewer.html`, `workspace/assets/model_console.html`, `metrics/assets/timeline.html`) MUST thin onto the shell. No console artifact SHALL ship duplicated inline runtime. `workspace/assets/model_console.html` MUST render the origin-typed citation icons and the citation detail dialog defined by the `console-field-citations` capability. `business/assets/model_viewer.html` MUST remain unchanged and reachable from `main` for one release cycle after `workspace/assets/model_console.html` ships, because installed procedures fetch it by that path.
(Previously: only two reference assets existed — `business/assets/model_viewer.html` and `metrics/assets/timeline.html` — with no citation rendering and no relocation constraint.)

#### Scenario: Reference assets thinned

- GIVEN the three reference assets after this change
- WHEN scanned for inline runtime markers
- THEN no duplicated runtime block is found

#### Scenario: New workspace-level asset renders citations

- GIVEN a compiled model with `el.citations` populated
- WHEN `workspace/assets/model_console.html` renders that element
- THEN an origin-typed icon is shown per the `console-field-citations` rules

#### Scenario: Old business shell still resolves during the transition cycle

- GIVEN an installed procedure referencing `business/assets/model_viewer.html` by its pre-existing path
- WHEN that procedure runs during the one-cycle transition window
- THEN the fetch succeeds because the file has not been removed or moved

### Requirement: Exclude Internal Specs and Workspace Root from Model Console Tabs

`ConsoleHubView` MUST filter `modelStore.rootIds` so that only level-3 domain models appear as switchable model console tabs. It MUST NOT render tabs for internal schema/spec nodes (`spec:*`, `template:*`) or the workspace manifest root node (whose console is accessed via the dedicated "Workspace Hub" tab).

#### Scenario: Internal spec node excluded from console tabs

- GIVEN a workspace containing resolved spec roots such as `spec:workspace` or `spec:business`
- WHEN `ConsoleHubView` evaluates `discoveredModels`
- THEN no tab is rendered for `spec:workspace` or `spec:business`

#### Scenario: Workspace manifest root excluded from model console tabs

- GIVEN a workspace containing a root node with `type: 'workspace'`, template `workspace`, or source `workspace_NN.md`
- WHEN `ConsoleHubView` evaluates `discoveredModels`
- THEN no separate model tab is rendered for the workspace root manifest
- AND the "Workspace Hub" tab provides the single canonical entrypoint for workspace aggregation deliverables

#### Scenario: Domain model tabs rendered correctly

- GIVEN a workspace containing domain model roots (e.g. `business`, `metrics`, `innovation`)
- WHEN `ConsoleHubView` evaluates `discoveredModels`
- THEN a tab is rendered for each concrete domain model allowing the user to view its compiled console

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

When `needs[]` declares `feedback-export`, `InnfoConsole` MUST inject the banner, export button and modal itself through an idempotent routine, creating one `[data-innfo-feedback-root]` with `#innfo-feedback-banner`, `#innfo-feedback-open` and `#innfo-feedback-modal`. It MUST read `needs[]` from the DOM so boot order does not matter. Shells MUST NOT need feedback markup; the old `#innfo-banner`, `#innfo-export-open` and `#innfo-export-modal` markup and CSS MUST be removed from `artifact_shell.html` and `metrics/assets/timeline.html`. Injection MUST happen once even if the bundle boots more than once, MUST work offline via `file://`, and MUST NOT use `fetch` or `type=module`. The new ids MUST NOT clash with the procedure stepper's `#innfo-export-modal`. Styling MUST be minimal CSS classes.

#### Scenario: Canonical console gains feedback unchanged

- GIVEN `model_console.html` with unchanged markup declaring `feedback-export`
- WHEN opened
- THEN the export button is present and the modal opens

#### Scenario: Single injection

- GIVEN a console where the bundle boots twice
- WHEN the page loads
- THEN exactly one feedback root, one banner and one export button exist

#### Scenario: No clash with the stepper

- GIVEN a procedure console that has its own `#innfo-export-modal`
- WHEN the feedback UI is injected
- THEN both dialogs coexist with distinct ids

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
