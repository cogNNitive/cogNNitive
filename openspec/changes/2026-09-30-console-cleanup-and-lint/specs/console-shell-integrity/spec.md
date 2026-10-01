# Console Shell Integrity Specification

## Purpose

Console shells declare `needs[]`, anchors and a runtime pin. This capability makes
drift between those three observable and blocks it in the verification gates.

## Requirements

### Requirement: Capability-only Needs Registry

`needs-registry.json` MUST map each need id to the list of DOM anchors it requires and
nothing else. It MUST NOT contain URLs, version pins or asset paths.

#### Scenario: Registry shape
- GIVEN `needs-registry.json`
- WHEN the guard loads it
- THEN every entry is `need -> { description, anchors: string[][], renderer? }`, where `anchors` is any-of over all-of DOM id sets
- AND any URL or version string fails the guard

### Requirement: Shell Discovery

The guard MUST discover console shells by shape (every `*.html` that declares `needs[]`
or loads the console bundle under the blueprint `assets/` folders and the `console/`
seam), not from a hand-maintained list. Discovery MUST be deterministic (sorted, no
time or network dependence).

#### Scenario: New shell is covered automatically
- GIVEN a new shell file declaring `needs[]`
- WHEN the guard runs
- THEN the shell is checked without editing the guard

### Requirement: Needs Subset of Registry

Every need declared by a shell MUST exist in the registry.

#### Scenario: Unknown need
- GIVEN a shell declaring `needs: ["nope"]`
- WHEN the guard runs
- THEN it fails naming the shell and the need

### Requirement: Required Anchors Present

For each declared need, every anchor the registry requires MUST exist in the shell DOM.

#### Scenario: Feedback anchors missing
- GIVEN a shell declaring `feedback-export` without `#innfo-export-open`, `#innfo-export-modal` or `#innfo-banner`
- WHEN the guard runs
- THEN it fails listing each missing anchor and the shell

#### Scenario: Complete shell passes
- GIVEN a shell declaring `feedback-export` with all three anchors
- WHEN the guard runs
- THEN that shell produces no violation

### Requirement: Pin Coherence

Every shell's `@innfo-console-vX.Y.Z` pin MUST equal the version of the console
assets declared in `manifest/source.yaml`. Floating refs such as `@main` MUST be rejected.

#### Scenario: Stale or floating pin
- GIVEN a shell pinning `@innfo-console-v0.4.0` or `@main` while the manifest declares another version
- WHEN the guard runs
- THEN it fails naming the shell, found pin and expected pin

### Requirement: Dead Runtime Key Rejected

The `innfo-config` of every shell MUST NOT contain a `runtime` key. It is read by
`parseConfig` and used by nothing, and it duplicates the pin.

#### Scenario: Runtime key present
- GIVEN a shell whose `innfo-config` contains `runtime`
- WHEN the guard runs
- THEN it fails naming the shell and the key

### Requirement: Gate Wiring

The guard MUST run on every `scripts/verify.js` and `scripts/check-integrity.js` run and
a violation MUST make both exit non-zero.

#### Scenario: Gate goes red
- GIVEN any guard violation
- WHEN `node scripts/verify.js` runs
- THEN it exits non-zero with the guard's message

### Requirement: Ledgered Model Console Exception

Until change `console-feedback-roundtrip` makes the bundle inject the feedback UI,
`workspace/assets/model_console.html` MAY be exempt from the anchor check for
`feedback-export` only. The exemption MUST be a single entry carrying a
`legacy:console/<id>` marker with a 1:1 `legacy-ledger.yaml` entry (`id`, `what`, `paths`,
`why`, `removal`, `owner`). Anchors MUST NOT be added to `model_console.html` by this
change. The exemption MUST NOT cover needs-subset or pin checks, and MUST NOT apply to any
other shell.

#### Scenario: Exemption is bounded
- GIVEN the exemption is present and ledgered
- WHEN `model_console.html` pins a wrong version
- THEN the guard still fails on the pin

#### Scenario: Unledgered exemption
- GIVEN the exemption marker without a ledger entry
- WHEN `legacy-ledger-guard` runs
- THEN it fails

### Requirement: Legacy Shell Removal

`business/assets/model_viewer.html` and its `assets:` entry in `business/spec_NN.md`
MUST be removed with a `template_version` bump. The five thin shells (analysis,
documentation, innovation, organization, projects) MUST be removed and their roles served
by the shared config-driven `console/artifact_shell.html`. Before deletion a test MUST show
no consumer reads the removed files or the `layout` field (canonical-registry, workspace
hub, `innfo-mcp`). No blueprint `assets:` entry, registry mirror or bundle MAY reference a
removed file. Whether the five blueprints drop their console entries or repoint them is a
design decision, settled as: the `assets:` entries of the 6 affected blueprints
(analysis, documentation, innovation, organization, projects, business) are dropped.
`layout` and `title` have no other consumer, so no per-blueprint config survives.

#### Scenario: No dangling references
- GIVEN the removals applied and `canonical-registry.ts` and the `innfo-mcp` bundle regenerated
- WHEN `verify.js` runs
- THEN no removed path is referenced and it exits zero

#### Scenario: Consumer found
- GIVEN a consumer of a removed shell or `layout` is detected
- WHEN the pre-deletion test runs
- THEN it fails and deletion is blocked
