# conntent-skill-dependency-bundling Delta Spec

Slice 3, PR 3b. Adds the consent-gated whisper.cpp prerequisite and the vendored component base set. Behaviour of captions is in `conntent-captions`.

## MODIFIED Requirements

### Requirement: Video Runtime Prerequisites Are Declared

The `coNNtent` bluepriNNt MUST declare in `depends_on`: the HyperFrames CLI (by package name; the exact pin lives in the skill's `package.json` `dependencies`), the `ffmpeg` and `ffprobe` binaries, a Node version floor, its required env keys, and whisper.cpp as an optional prerequisite needed only when `captions` resolves to a mode other than `off`. A stage that needs a missing env key MUST fail fast, naming the key, before doing work. A missing optional prerequisite MUST NOT block an episode that does not need it.
(Previously: whisper.cpp was not declared; `ffprobe` was not named separately.)

#### Scenario: Stage fails fast on a missing key
- GIVEN a required env key is unset
- WHEN the stage that needs it starts
- THEN it fails immediately naming the key

#### Scenario: Declaration is complete
- GIVEN the `coNNtent` frontmatter
- WHEN `depends_on` is read
- THEN it contains the CLI name, `ffmpeg`, `ffprobe`, the Node floor, the env keys and whisper.cpp marked optional
- AND `package.json` `dependencies.hyperframes` is an exact version

#### Scenario: Optional prerequisite does not block
- GIVEN whisper.cpp absent and every scene resolving `captions: off`
- WHEN `produce` runs
- THEN it does not fail on whisper

## ADDED Requirements

### Requirement: Whisper.cpp install is consent-gated and reported by `--check`

The runtime provisioner MUST offer to install whisper.cpp through one idempotent, consent-gated command, MUST list what it will install and the approximate download size in a single prompt before installing, and MUST report whisper readiness in `--check` mode without changing anything. The offer MUST be raised at domaiNN setup and on first need. The engine MUST NOT install it silently, as a side effect of `produce`, or through `npx --yes`.

#### Scenario: Check reports a missing whisper

- GIVEN a host without whisper.cpp
- WHEN the provisioner runs with `--check`
- THEN it reports whisper as missing (optional) and installs nothing

#### Scenario: One consent lists everything

- GIVEN a host without whisper.cpp
- WHEN the install command is invoked
- THEN one prompt lists the items and size before anything is installed, and it proceeds only after consent

#### Scenario: Idempotent

- GIVEN whisper.cpp installed
- WHEN the install command runs again
- THEN it reports it present and does nothing

#### Scenario: Produce never installs

- GIVEN captions on and whisper missing
- WHEN `produce` runs
- THEN it fails with `whisper-missing` and no installer runs

### Requirement: The installed skill carries the base set

The installed bluepriNNt package MUST carry the component base set defined by `conntent-component-portfolio` "The Package Vendors A Pinned Base Set" (the single owner of its size, sources and licences) in its `library/components/`, so that an installed skill renders offline. The installer MUST NOT fetch registry items.
<!-- shared with slice 2: component format, resolution and base-set rules in conntent-component-portfolio -->

#### Scenario: Installed package holds the set

- GIVEN a freshly installed package
- WHEN `library/components/` is listed
- THEN it equals the package base set

#### Scenario: Offline render after install

- GIVEN no network and an episode using base-set components
- WHEN the render stage runs
- THEN it succeeds and no registry request is made
