# Delta for conntent-console-views

## REMOVED Requirements

### Requirement: Views Are Registered, Not Standalone

(Reason: superseded by `conntent-domain-console` "One registered coNNtent view". The Episode review and Series views no longer exist; the single `conntent` view and the read-only `conntent-delivery` view replace them. The ban on `draft-template.html`, its builder and `review_console.html` is carried by `conntent-skill` "Retired V_0 Tooling Is Absent".)
(Migration: none. No alias, no redirect.)

#### Scenario: Views appear as tabs
- GIVEN a domaiNN adopting `coNNtent`
- WHEN the console opens
- THEN no tab titled Episode review or Series exists

### Requirement: Episode Review View

(Reason: superseded by `conntent-domain-console` "Episode Review section and gate strip", "Scene rows and per-scene verdict controls", "Console edits are changeset operations". Carried over: narration editing, verdict and comment per scene, one ordered preset selector, picklists from the catalog, cost against the budget. Changed: verdicts are `review_gate` operations (`changeset-review-gate`), not `update_field` on a verdict field.)
(Migration: none.)

#### Scenario: Old asset is gone
- GIVEN the bluepriNNt `assets/`
- WHEN listed
- THEN `console-view-episode-review.js` does not exist

### Requirement: Series View

(Reason: superseded by `conntent-domain-console` "Series Board section", "Episode Status section" and "Data reaches the view only through the data hook". Carried over: episodes by state, real cost from the ledger, stage timings, machine-fingerprint comparison, stale price flag, empty state.)
(Migration: none.)

#### Scenario: Old assets are gone
- GIVEN the bluepriNNt `assets/`
- WHEN listed
- THEN `console-view-series.js` and `console-view-series.data.mjs` do not exist

### Requirement: No Control Without Effect

(Reason: moved verbatim in intent to `conntent-domain-console` "No control without effect", now bound to the field registry and `review_gate` operations. The Slice 0 clause about `draft-template.html` is obsolete because that file no longer exists.)
(Migration: none.)

#### Scenario: Requirement lives in the new capability
- GIVEN `conntent-domain-console`
- WHEN its requirements are listed
- THEN "No control without effect" is present

### Requirement: Views Stay Within The Registry Budget

(Reason: moved to `conntent-domain-console` "Views stay within the registry budget", which now names the `conntent` and `conntent-delivery` views.)
(Migration: none.)

#### Scenario: Requirement lives in the new capability
- GIVEN `conntent-domain-console`
- WHEN its requirements are listed
- THEN "Views stay within the registry budget" is present
