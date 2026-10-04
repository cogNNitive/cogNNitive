# Delta for video-skill-dependency-bundling

## ADDED Requirements

### Requirement: Vendored Self-Contained Parser Artifact

The skill MUST resolve the VUS parser from a committed, self-contained ESM artifact shipped inside the skill directory. The artifact MUST bundle all of its runtime dependencies (including `zod`) so that parser resolution requires no npm registry access, no node_modules, and no TypeScript loader (`tsx`). The artifact MUST be drift-checked against the parser source by `scripts/verify.js`.

#### Scenario: Parser resolves with no npm install
- GIVEN an installed skill copy with no `node_modules` and no network access
- WHEN the parser is imported from the vendored artifact
- THEN it loads and exports `parse()` successfully
- AND no npm registry, monorepo path, or `tsx` loader is required

#### Scenario: Drift check fails on stale mirror
- GIVEN a vendored artifact whose content no longer matches the parser source
- WHEN `node scripts/verify.js` runs
- THEN it fails, naming the drifted artifact
- AND it passes when the artifact is regenerated in sync

### Requirement: Consent-Gated On-Demand Engine Install

The skill MUST install its Remotion renderer runtime on demand via a single idempotent, consent-gated command. BEFORE installing, it MUST state the approximate total download size AND that a headless browser downloads on first render. Re-running the command on an already-installed engine MUST NOT reinstall or modify the existing install. The parser MUST NOT require any npm install.

#### Scenario: First-time install requires consent and size notice
- GIVEN a machine with no Remotion runtime installed
- WHEN the install command is invoked
- THEN it presents the approximate total size and the first-render browser download notice BEFORE proceeding
- AND it proceeds only after the user consents

#### Scenario: Idempotent re-run is a no-op
- GIVEN the Remotion runtime is already installed
- WHEN the install command is invoked again
- THEN it reports the engine as present and performs no reinstall
