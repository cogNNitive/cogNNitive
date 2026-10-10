# Delta for innfo-console-runtime

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Exclude Internal Specs and Workspace Root from Model Console Tabs

(Reason: it governs `ConsoleHubView`, the Vue editor Consoles view and the "Workspace Hub" tab, all retired by D13/D18 and the hub removal.)
(Migration: None.)
