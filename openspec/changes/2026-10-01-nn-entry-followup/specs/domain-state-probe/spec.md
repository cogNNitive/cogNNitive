# Specification: Domain State Probe & Defect Remediation

## MODIFIED Requirements

### Requirement: Preflight Diagnostic Warning Propagation (P1)
`skills/nn-preflight/scripts/domain-probe.js` MUST correctly extract preflight warnings from `preflight-check.js`'s `results.items` array (filtering for items with actionable warning/blocker statuses), populating `preflight.warnings`.

#### Scenario: Preflight detects unnormalized sources or available upgrades
- GIVEN a workspace with unnormalized sources or template upgrade opportunities
- WHEN `domain-probe.js` runs
- THEN `preflight.warnings` MUST contain the corresponding diagnostic items
- AND MUST NOT return an empty list when `exitCode === 1`.

### Requirement: Deterministic Pending Source Hash Semantics (P2)
`domain-probe.js` MUST compute `sources.pending_count` as the number of raw files in `sources/import/` (and fallback `sources/original/`) that do NOT have a matching normalized Markdown file in `sources/nn/` with identical sha256.

#### Scenario: All imported sources are normalized
- GIVEN a workspace where every imported source has been normalized into `sources/nn/` with matching sha256
- WHEN `domain-probe.js` evaluates source state
- THEN `sources.pending_count` MUST be 0.

### Requirement: Fast, Bounded Startup Latency (P3)
`domain-probe.js` MUST operate with an offline / bounded execution budget for session start probes so that `/nn` entry point renders in <200ms without blocking on remote HTTP requests.

#### Scenario: Running domain probe in offline or high-latency environment
- GIVEN an offline environment or unreachable remote endpoints
- WHEN `domain-probe.js` executes
- THEN it MUST complete locally without hanging on serial network timeouts.
