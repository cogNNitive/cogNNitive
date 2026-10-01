# Spec Delta: Preflight Freshness Reporting (Layout Verdict)

## MODIFIED Requirements

### Requirement: Layout Detection in Preflight
`preflight-check.js` MUST evaluate domain layout using `legacy-detect` and emit a layout verdict in its JSON output (`layout: 'current' | 'legacy' | 'mixed'`). When a legacy or mixed layout is detected, preflight MUST report an informative recommendation to run `nn-upgrade`.

#### Scenario: Preflight detects legacy layout
- GIVEN a workspace with `models/`
- WHEN `preflight-check.js --json` runs
- THEN `layout` is reported as `'legacy'`
- AND actionable guidance for `nn-upgrade` is provided.
