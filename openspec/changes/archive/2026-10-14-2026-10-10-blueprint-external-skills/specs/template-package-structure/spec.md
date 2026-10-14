# Template Package Structure & Local Cache (delta)

## MODIFIED Requirements

### Requirement: Canonical Source Layout (repository `main`)

Template packages in the source repository MUST use canonical unversioned filenames
under `iNNfo/specs/bluepriNNts/<template-name>/`:
- The primary Level 2 specification MUST be named `spec_NN.md` (the root workspace template is `workspace_spec_NN.md`).
- `procedures/`, `samples/`, and `assets/` (static layouts / media, e.g. `assets/console-view-timeline.js`) MUST also use unversioned filenames.
- A package MAY embed agent skills as `skills/<skill-name>/SKILL.md`, together with that skill's own scripts, references, tests and vendored data. An embedded skill is part of the package and MUST be versioned only through the package `blueprint_version`/`template_version`.
- A package MAY instead *reference* an external skill in its frontmatter `skills:` array, pinned to a commit SHA with a `sha256` digest and a declared `license`. A referenced skill is NOT part of the package source and MUST NOT be copied into the repository.
- Source paths MUST NOT encode a semantic version. The authoritative version MUST be declared in frontmatter as `template_version` (`V_x-y-z` or dotted `x.y.z`).

(Previously: the skill model had one tier — an embedded `skills/<name>/SKILL.md`;
external frontmatter skills were not described.)

#### Scenario: Canonical source template on `main`
- GIVEN the `business` template on `main`
- WHEN it is stored at `iNNfo/specs/bluepriNNts/business/spec_NN.md`
- THEN the file carries `template_version` in its frontmatter
- AND no `_V_x-y-z_` token appears in the path

#### Scenario: Package embeds a full skill
- GIVEN the `video` package containing `skills/nn-video-script/SKILL.md` plus its `scripts/` and `test/` folders
- WHEN the package layout is inspected
- THEN the skill folder is treated as package content with no versioned path segment

#### Scenario: Package references an external skill without vendoring it
- GIVEN a blueprint whose frontmatter `skills:` declares a third-party skill with `commit`, `sha256` and `license`
- WHEN the package layout is inspected
- THEN no folder for that skill exists under the package's `skills/`
- AND the reference is the only source of truth

## ADDED Requirements

### Requirement: Two-Tier Skill Model

A bluepriNNt skill MUST be one of two tiers with distinct guarantees, and this
distinction MUST be surfaced to the user:
- **`embedded`** — vendored inside the package, curated by the maintainer; the
  package version guarantees it.
- **`referenced`** — declared in frontmatter and fetched at install time from its
  upstream repo; the guarantee is bounded to *reproducible (pinned commit), unmodified
  since the pin (digest) and license-declared*. cogNNitive MUST NOT claim it vouches
  for a referenced skill's author.

#### Scenario: Referenced tier is documented as bounded
- GIVEN the package documentation
- WHEN it describes referenced external skills
- THEN it states the guarantee is pinned commit + verified digest + declared license
- AND it does not claim the maintainer reviewed or vouches for the skill

#### Scenario: Embedded tier keeps the full guarantee
- GIVEN an embedded skill
- WHEN its guarantee is described
- THEN it is stated as curated by the maintainer and covered by the package version
