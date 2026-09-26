# Release Version Generation Specification

## Purpose

Every distributed-artifact version is authored in exactly one place and
generated everywhere else. Extends the existing generator + `--check`
pattern (`sync-template-versions.mjs`, `template-catalog.mjs`) to the two
version sites still hand-copied — skill versions in `manifest/source.yaml`
and the innfo-mcp version square — and makes `channels.stable.refs[].ref` a
derived string instead of a hand-typed one. No new dependency, no new
comparison guard.

## Requirements

### Requirement: Stable channel ref is derived from an authored channel version

Each `channels.stable.refs[]` entry's `ref` MUST be computed as
`<key>-v<version>` from a sibling authored `version` field (plain semver,
quoted string, never a bare number — the shipped `yaml-lite.js` parser never
returns numbers). `ref` MUST NOT be hand-typed.

#### Scenario: Bumping the channel version changes the ref

- GIVEN `{ key: skills, version: "2.1.0" }`
- WHEN `version` is bumped to `"2.2.0"` and the manifest is generated
- THEN `ref` MUST become `skills-v2.2.0` with no other file hand-edited

#### Scenario: A malformed version cannot produce a valid ref

- GIVEN a `version` not shaped `\d+\.\d+\.\d+` (e.g. `"v2.1"`)
- WHEN the ref is derived
- THEN generation MUST fail `--check` rather than emit a ref that violates `TAG_SHAPE_RE`

#### Scenario: Preview channel refs are untouched

- GIVEN `channels.preview.refs[]` entries whose `ref` is the branch `main`
- WHEN stable-channel derivation runs
- THEN no preview entry MUST be modified or required to carry `version`

### Requirement: Skill versions in the manifest are generated from SKILL.md frontmatter

`manifest/source.yaml` `skills[].version` MUST be generated from each
skill's `SKILL.md` frontmatter `version`, using the same generator +
`--check` shape already used for `templates[].version`.

#### Scenario: A skill version bump propagates without a manual edit

- GIVEN a skill's frontmatter `version` changes `V_3-4-0` → `V_3-5-0`
- WHEN the generator runs
- THEN `manifest/source.yaml` MUST read `V_3-5-0` for that skill
- AND `verify.js`'s `--check` MUST fail if the file is stale

### Requirement: The innfo-mcp version square collapses to one authored source

With `iNNfo/packages/innfo-mcp/package.json` version as the single authored
value, `innfo-core`'s version, the `@cognnitive/innfo-core` dependency
range, `docs/innfo/cdn/manifest.json` `latest`, and the `innfo-mcp` stable
ref (via the derivation above) MUST all be generated from it, never
independently hand-edited. `checkVersionSquare`'s version-comparison logic
MUST be decommissioned and its `verify.js` call site removed.

#### Scenario: Bumping the MCP package version regenerates every dependent site

- GIVEN the MCP `package.json` version changes `0.10.0` → `0.11.0`
- WHEN the generator runs
- THEN core's version, the dependency range, the CDN manifest `latest`, and
  the stable ref MUST all read `0.11.0` / `innfo-mcp-v0.11.0` unedited

#### Scenario: The CDN bundle presence check survives independently

- GIVEN the CDN bundle file is tsup output no generator can produce
- WHEN `checkVersionSquare`'s comparison legs are removed
- THEN a file-presence check for that bundle path MUST still run, relocated
  out of a module framed as a version-invariant validator
- AND no local rebuild's byte content MUST ever be compared to the committed bundle

### Requirement: Manifest generation stays byte-identical and backward-compatible

`docs/use/manifest.md` MUST remain a pure, byte-identical function of its
committed inputs — no timestamp, counter, or git-derived moving value may
enter it. The manifest's tag+SHA pinning shape MUST NOT change, so an
existing `~/.agents/bootstrap-state.json` and an older installed
`nn-preflight` keep working unmodified.

#### Scenario: Two consecutive generations with no input change are identical

- GIVEN no committed file changed between two runs
- WHEN `generate-manifest.js --channel stable --check` runs twice
- THEN both renders MUST be byte-identical

#### Scenario: An older installed client still resolves the manifest

- GIVEN an `nn-preflight` installed before this change, and an existing
  `bootstrap-state.json`
- WHEN it fetches the generated `docs/use/manifest.md`
- THEN it MUST parse and resolve pins exactly as before, because
  `refs[].version` lives only in maintainer-side `manifest/source.yaml`,
  never in the distributed manifest

## Notes for design (not decided here)

- Which script(s) implement the generators is a design choice.
- `checkTagPinFreshness` is explicitly preserved and unmodified: it catches
  "edited a skill, forgot to bump the channel version," a class this
  capability does not touch.
- Whether `version-square.js` is deleted outright or kept with only the
  bundle-presence check is left to `design.md` (proposal open question 3).
