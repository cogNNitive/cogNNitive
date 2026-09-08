# Delta for Template Cache Staleness Detection

## ADDED Requirements

### Requirement: Freshness Surfaces as a Per-Model Field of the Workspace Report

When the workspace integrity pass computes template freshness (byte-hash comparison of
the local template against its canonical remote), the result MUST be exposed as a
per-model `freshness` field in the workspace report, not only as a side effect of
validating a single open model. Freshness fetches MUST be deduplicated by template URL
and concurrency-capped. Freshness MUST remain best-effort: it MUST NOT be required for
the pass to complete and MUST NOT, on its own, mark a model invalid.

#### Scenario: Per-model freshness in the workspace report
- GIVEN a workspace with 3 models, one of which has a locally cached template that differs
  from its canonical remote
- WHEN `check_workspace` runs
- THEN that model's `freshness` field indicates `stale`
- AND the other two indicate `fresh`
- AND no model's validity is set to invalid solely due to `freshness`

#### Scenario: Freshness fetches are deduplicated
- GIVEN 6 models sharing 2 distinct template URLs
- WHEN the workspace pass computes freshness
- THEN at most 2 freshness fetches are issued

## MODIFIED Requirements

### Requirement: Freshness check is non-fatal and offline-tolerant

A failed fetch (timeout, HTTP error, no network) MUST NOT fail resolution; mark
`unknown` and continue. In the workspace integrity report, an unreachable freshness
remote MUST degrade that model's `freshness` field to `unknown` (or `offline`) without
failing the workspace pass and without affecting any other model's freshness result.
(Previously: offline tolerance was specified only for single-model resolution during
`validateModel`.)

#### Scenario: Offline fetch fails during validation

- GIVEN the canonical remote is unreachable
- AND `checkFreshness` is enabled
- WHEN a local spec resolves
- THEN resolution succeeds and provenance is `unknown`

#### Scenario: Offline freshness for one model in a workspace pass

- GIVEN a workspace integrity pass over 5 models
- AND the freshness remote for one model's template is unreachable
- WHEN the pass runs
- THEN that model's `freshness` is `unknown` / `offline`
- AND the other 4 models still receive a freshness result
- AND the workspace pass does not fail
