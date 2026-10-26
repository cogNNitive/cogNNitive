# Delta for video-script-skill

Scope: the skill's renderer dependency moves from Remotion to HyperFrames; the frontmatter
engine/renderer, the setup step and the render step change; the skill and blueprint versions bump.

## MODIFIED Requirements

### Requirement: Declared Asset Provider Dependency

The skill MUST declare its external asset-provider dependency (TTS/media via WaveSpeed or
Replicate) **and its renderer dependency (HyperFrames)** in its own frontmatter `depends_on`, so
the setup step can check it. Direct provider fetch through environment-variable credentials SHALL
remain the supported path. The skill MUST NOT retain the local OS-native TTS fallback (Windows
SAPI). Engine setup MUST verify provider credentials, renderer availability and optional
agent-MCP presence with user consent before proceeding. The skill MUST NOT declare or install a
Remotion engine.
(Previously: declared only the asset provider; the frontmatter pinned `engine: @remotion/renderer`.)

#### Scenario: Provider and renderer dependencies are declared

- GIVEN the skill's frontmatter
- WHEN it is inspected
- THEN it declares its asset-provider dependency under `depends_on`
- AND it declares the HyperFrames renderer dependency with a pinned version

#### Scenario: No Remotion engine is declared

- GIVEN the skill's frontmatter and setup script
- WHEN they are inspected
- THEN no `@remotion/*` engine or installer is declared or referenced

### Requirement: Skill Is Installed By Projection From The video bluepriNNt

The skill MUST be made available to agents at `~/.agents/skills/nn-video-script/` solely by
installing the `video-script` bluepriNNt. It MUST NOT have a standalone distribution entry, alias,
redirect or dual path. Its `version` MUST be `V_0-5-0` as skill frontmatter, and any change under
`video-script/skills/**` MUST bump the `video-script` `blueprint_version`.
(Previously: version pinned to `V_0-4-0`; renderer was Remotion.)

#### Scenario: Installing video-script yields a working skill

- GIVEN a clean `~/.agents/`
- WHEN the `video-script` bluepriNNt is installed
- THEN `~/.agents/skills/nn-video-script/SKILL.md` exists and its scripts run

#### Scenario: Renderer change bumps the blueprint version

- GIVEN a change under `video-script/skills/**`
- WHEN the manifest pin is validated
- THEN the `video-script` `blueprint_version` is bumped

## ADDED Requirements

### Requirement: Render Step Uses The HyperFrames Pipeline

The skill's render step MUST emit the HyperFrames project from the manifest and invoke the
HyperFrames renderer. It MUST NOT bundle or install a React/Remotion runtime. The engine-provisioning
step MUST ensure the pinned HyperFrames CLI rather than a Remotion engine.

#### Scenario: Render uses HyperFrames

- GIVEN a compiled script and its manifest
- WHEN the skill's render step runs
- THEN it emits a HyperFrames project and renders it via the pinned HyperFrames CLI
- AND no Remotion bundle step runs

### Requirement: Cost Estimator Invoked Through Any Path

The cost estimator MUST run `main()` when invoked through a symlinked or junction path (its entry
guard MUST compare real paths), so an agent invoking it through a skill junction is never a silent
no-op.

#### Scenario: Junction invocation runs the estimator

- GIVEN the estimator invoked through a junction (`~/.config/opencode/skills/...`) that resolves to the real skill path
- WHEN the CLI runs
- THEN `main()` executes and the plan is written (not an exit-0 no-op)
