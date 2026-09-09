# innfo-console-runtime Specification

## Purpose

One shared versioned runtime (`innfo-runtime.js`) plus a thin blueprint shell (`artifact_blueprint.html`) for all HTML console artifacts. Eliminates inline runtime duplication across template assets while preserving `file://` double-click with zero build.

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

### Requirement: Blueprint Shell with Config and JSON Slots

`artifact_blueprint.html` MUST declare an `innfo-config` block with a `needs[]` capability list and exactly two JSON slots: `innfo-schema` and `innfo-model`. Generated consoles MUST declare only `needs[]` plus slot payloads and MUST NOT inline runtime code.

#### Scenario: Thin console renders from slots

- GIVEN a console with `needs: ["feedback-export"]` and populated slots
- WHEN opened via `file://`
- THEN the runtime hydrates the view and gates features absent from `needs[]`

#### Scenario: Undeclared capability stays dormant

- GIVEN a console whose `needs[]` omits `feedback-export`
- WHEN the runtime boots
- THEN export UI is not rendered

### Requirement: No Duplicated Inline Runtime

The three reference assets (`business/assets/master.html`, `model_viewer.html`, `metrics/assets/projections.html`) MUST thin onto the blueprint. No console artifact SHALL ship duplicated inline runtime.

#### Scenario: Reference assets thinned

- GIVEN the three reference assets after this change
- WHEN scanned for inline runtime markers
- THEN no duplicated runtime block is found
