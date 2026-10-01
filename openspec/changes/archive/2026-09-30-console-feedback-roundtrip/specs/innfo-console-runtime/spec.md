# Delta for innfo-console-runtime

## ADDED Requirements

### Requirement: Bundle-Injected Feedback UI

When `needs[]` declares `feedback-export`, `InnfoConsole` MUST inject the banner, export button and modal itself through an idempotent `ensureFeedbackUi(doc)`, creating one `[data-innfo-feedback-root]` with `#innfo-feedback-banner`, `#innfo-feedback-open` and `#innfo-feedback-modal`. `feedback.isEnabled(doc)` MUST read `needs[]` from the DOM so boot order does not matter. Shells MUST NOT need any feedback markup; the old `#innfo-banner`, `#innfo-export-open` and `#innfo-export-modal` markup and CSS MUST be removed from `artifact_shell.html` and `timeline.html`. Injection MUST happen once even though the shell's three script tags can boot the bundle more than once, MUST work offline via `file://`, and MUST NOT use `fetch` or `type=module`. The new ids MUST NOT clash with the procedure stepper's own `#innfo-export-modal`.

#### Scenario: Canonical console gains feedback unchanged

- GIVEN `model_console.html` with unchanged markup declaring `feedback-export`
- WHEN opened
- THEN the export button is present and the modal opens

#### Scenario: Single injection

- GIVEN a console where the bundle boots twice
- WHEN the page loads
- THEN exactly one feedback root, one banner and one export button exist

#### Scenario: Suggest from the viewer

- GIVEN `InnfoModelViewer` rendering a card with `[data-innfo-suggest]`
- WHEN the control is activated
- THEN a single delegated listener in `InnfoConsole` handles it once

### Requirement: Needs Lint Without Feedback Anchors

`needs-registry.json` MUST declare `feedback-export` with empty anchors (`feedback-export: []`), so the needs/anchor lint requires no DOM anchors for it. The time-boxed `model_console` exception, its `legacy:console/model-console-feedback-anchors` marker and its `legacy-ledger.yaml` entry MUST be removed. `procedure_console.html` MUST NOT declare `feedback-export` while it delivers no feedback UI.

#### Scenario: Exception gone

- GIVEN the repository after this change
- WHEN the lint and `legacy-ledger-guard` run
- THEN `model_console.html` passes without an exception and no orphan marker or ledger entry remains

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
