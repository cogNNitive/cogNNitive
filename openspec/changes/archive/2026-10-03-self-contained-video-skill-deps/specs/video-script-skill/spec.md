# Delta for video-script-skill

## MODIFIED Requirements

### Requirement: Owned Skill With No External Dependency

The system MUST provide a cogNNitive-owned video-script skill under `skills/` (e.g. `skills/nn-video-script/`) that authors VUS scripts and understands iNNfo workspace structure (Series/Video registration). The skill MUST NOT depend on, fork from at run time, or reference any repository outside the monorepo. The parser and the VUS specification it uses MUST resolve from cogNNitive-owned, self-contained artifacts committed inside the skill itself, allowing the installed skill copy to run without a monorepo checkout. (Previously: parser resolved from the monorepo package `@cognnitive/innfo-video-parser`.)

#### Scenario: Skill authors a script with no external repository
- GIVEN a workspace with a registered Video Element and its owning Series, and no external video repository present
- WHEN the skill authors a script for that Video
- THEN the script is written to the Video's own folder
- AND no external-repository path is referenced

#### Scenario: No external reference remains
- GIVEN the skill directory
- WHEN its files are inspected
- THEN they reference no repository outside cogNNitive

#### Scenario: Installed copy compiles with no monorepo checkout
- GIVEN an installed skill copy with no monorepo present
- WHEN the skill compiles a valid VUS script
- THEN it succeeds using only artifacts committed inside the skill

### Requirement: Internal Parser Resolution

`vus-parse.mjs` MUST resolve the VUS parser from the vendored, committed ESM artifact shipped inside the skill (`scripts/lib/innfo-video-parser.generated.mjs`) by relative path. It MUST NOT resolve the parser from an npm package (`@cognnitive/...`), from a monorepo-relative path (`../../../iNNfo/...`), or through a `tsx` loader, and MUST run to completion with no external-checkout environment variable set. It MUST NOT skip. (Previously: resolved from the monorepo npm package and ran the `--import tsx/esm` loader.)

#### Scenario: Parse with no external checkout
- GIVEN no external-checkout environment variable is set
- WHEN `node scripts/vus-parse.mjs <script.md>` runs on a valid script
- THEN the parser executes from the vendored artifact
- AND it reports zero issues

#### Scenario: No npm or tsx dependency in parser resolution
- GIVEN the skill's parser-resolution files
- WHEN they are inspected
- THEN they reference neither `@cognnitive/innfo-video-parser`, nor `../../../iNNfo/`, nor `tsx`

## ADDED Requirements

### Requirement: Declared Asset Provider Dependency

The skill MUST declare its external asset-provider dependency (TTS/media via WaveSpeed or Replicate) in its own frontmatter `depends_on`, so the setup step can check it. Direct provider fetch through environment-variable credentials SHALL remain the supported path in this change. The skill MUST NOT retain the local OS-native TTS fallback (Windows SAPI); it MUST be removed. Engine setup MUST verify provider credential and optional agent-MCP presence with user consent before proceeding.

#### Scenario: Provider dependency is declared
- GIVEN the skill's frontmatter
- WHEN it is inspected
- THEN it declares its asset-provider dependency under `depends_on`

#### Scenario: Local OS-native TTS fallback is gone
- GIVEN the skill scripts
- WHEN they are inspected
- THEN no OS-native (Windows SAPI) TTS synthesis path remains

#### Scenario: Setup checks provider credentials with consent
- GIVEN a workspace where the asset provider credential is absent
- WHEN the engine setup step runs
- THEN it reports the missing provider dependency and requests consent before any change
