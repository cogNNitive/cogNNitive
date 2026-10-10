# Delta for video-skill-dependency-bundling

## MODIFIED Requirements

### Requirement: Consent-Gated On-Demand Engine Install

The skill MUST install its Remotion renderer runtime on demand via a single idempotent, consent-gated command. BEFORE installing, it MUST state the approximate total download size AND that a headless browser downloads on first render. Re-running the command on an already-installed engine MUST NOT reinstall or modify the existing install.
(Previously: also asserted that the vendored parser required no npm install.)

#### Scenario: First-time install requires consent and size notice

- GIVEN a machine with no Remotion runtime installed
- WHEN the install command is invoked
- THEN it presents the approximate total size and the first-render browser download notice BEFORE proceeding
- AND it proceeds only after the user consents

#### Scenario: Idempotent re-run is a no-op

- GIVEN the Remotion runtime is already installed
- WHEN the install command is invoked again
- THEN it reports the engine as present and performs no reinstall

## REMOVED Requirements

### Requirement: Vendored Self-Contained Parser Artifact

(Reason: there is no VUS parser; the engine consumes the structured iNNfo model, so no bundled ESM parser artifact exists to drift-check.)
(Migration: none.)
