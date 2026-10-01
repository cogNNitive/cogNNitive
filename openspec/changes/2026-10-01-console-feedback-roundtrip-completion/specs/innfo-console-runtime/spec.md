# Delta for innfo-console-runtime

## ADDED Requirements

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

## MODIFIED Requirements

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
