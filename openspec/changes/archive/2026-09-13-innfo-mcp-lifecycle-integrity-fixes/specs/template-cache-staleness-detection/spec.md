# Delta for Template Cache Staleness Detection

## MODIFIED Requirements

### Requirement: validateModel surfaces TEMPLATE_CACHE_STALE warning

`validateModel` (validate.ts) MUST emit a `[TEMPLATE_CACHE_STALE]` warning
(severity `warning`, non-blocking for `valid`) when the resolved template's
provenance is `stale`, including the canonical URL and a remediation hint
naming `check_workspace` as the self-heal remedy (the write-once rehydration
that `check_workspace` already performs), not manual file surgery under
`specs/`. The warning MUST reflect the content-hash result, not
`spec_version`.

(Previously: the remediation hint told the agent to delete/replace the local
copy under `specs/` by hand, and never mentioned `check_workspace`.)

#### Scenario: Stale template still validates

- GIVEN a cached template in `specs/` differing from the canonical remote
- AND `checkFreshness` is enabled
- WHEN `validateModel` runs
- THEN a `[TEMPLATE_CACHE_STALE]` warning is emitted
- AND `valid` is NOT forced to false by this warning alone

#### Scenario: Remediation hint names check_workspace

- GIVEN a `[TEMPLATE_CACHE_STALE]` warning is emitted
- WHEN the agent reads the warning's `promptHint`/message
- THEN it names `check_workspace` as the remedy
- AND it does not instruct manual file deletion/replacement under `specs/`
