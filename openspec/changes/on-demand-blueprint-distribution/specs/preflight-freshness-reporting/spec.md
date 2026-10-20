# Delta Spec: preflight-freshness-reporting

## ADDED Requirements

### Requirement: Uninstalled Optional Catalog Blueprints Are Ignored in Preflight

`skills/nn-preflight/scripts/preflight-check.js` MUST require only Core `bluepriNNts` for baseline installation readiness and MUST ignore optional vertical `bluepriNNts` governed by `catalog.json` when they are not installed locally. Installed optional catalog `bluepriNNts` MAY be reported for version/pin state without blocking uninstalled verticals.

#### Scenario: Uninstalled optional catalog blueprint does not block or warn
- **GIVEN** an environment with all 7 Core `bluepriNNts` installed and optional catalog `bluepriNNts` absent from `~/.agents/bluepriNNts/`
- **WHEN** `preflight-check.js` executes
- **THEN** no missing-blueprint error, warning, or blocker is emitted for uninstalled optional catalog `bluepriNNts`
- **AND** `exitCode` remains `0`
