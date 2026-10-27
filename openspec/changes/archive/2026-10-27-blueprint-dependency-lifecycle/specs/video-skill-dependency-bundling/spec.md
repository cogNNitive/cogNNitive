# Delta for video-skill-dependency-bundling

## MODIFIED Requirements

### Requirement: Consent-Gated On-Demand Engine Install

The skill MUST install its HyperFrames renderer runtime on demand through one idempotent, consent-gated command. BEFORE installing, it MUST list every item it will install (the pinned HyperFrames CLI and its skills, and the npm dependencies) in a single consent prompt, and state the approximate total download size. Re-running the command on an already-installed engine at the pinned version MUST NOT reinstall or modify the existing install.
(Previously: described a Remotion runtime and a first-render headless browser notice.)

#### Scenario: First-time install requires one consent listing all items
- GIVEN a machine with no HyperFrames runtime installed
- WHEN the install command is invoked
- THEN one prompt lists the CLI pin, the skills, the npm dependencies and the approximate size BEFORE proceeding
- AND it proceeds only after the user consents

#### Scenario: Idempotent re-run is a no-op
- GIVEN the HyperFrames CLI is installed at the pinned version
- WHEN the install command is invoked again
- THEN it reports the engine as present and performs no reinstall

## ADDED Requirements

### Requirement: HyperFrames Pin Is Enforced And Render Never Self-Installs

Render scripts MUST resolve the CLI from the skill's own `node_modules/.bin/hyperframes` and verify the installed version equals the pin in the skill's `package.json` before running. A missing or different version MUST fail with `hyperframes-missing` or `hyperframes-version-mismatch: <found>≠<pin>` and the fix command (`skills-manager.js update video-script`). Render MUST NOT install anything itself, including through `npx --yes`.

#### Scenario: Wrong version blocks render
- GIVEN HyperFrames Q is installed and the pin is P
- WHEN a render starts
- THEN it exits non-zero naming P and the install command
- AND nothing is installed

#### Scenario: CLI absent
- GIVEN no HyperFrames CLI is available
- WHEN a render starts
- THEN it exits non-zero without downloading anything

### Requirement: Video Runtime Prerequisites Are Declared

The `video-script` bluepriNNt MUST declare in `depends_on`: the HyperFrames CLI (by package name; the exact pin lives in the skill's `package.json` `dependencies`), the `ffmpeg` binary, a Node version floor, and its required env keys. A stage that needs a missing env key MUST fail fast, naming the key, before doing work.

#### Scenario: Stage fails fast on a missing key
- GIVEN a required env key is unset
- WHEN the stage that needs it starts
- THEN it fails immediately naming the key

#### Scenario: Declaration is complete
- GIVEN the `video-script` frontmatter
- WHEN `depends_on` is read
- THEN it contains the CLI name, `ffmpeg`, the Node floor and the env keys
- AND `package.json` `dependencies.hyperframes` is an exact version
