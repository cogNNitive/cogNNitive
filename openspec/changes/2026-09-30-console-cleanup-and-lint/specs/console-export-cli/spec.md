# Delta for console-export-cli

## ADDED Requirements

### Requirement: Whole-URL Pin Normalization

`scripts/export-console.mjs` MUST replace the WHOLE pinned console bundle URL (owner,
repo name, path and version) with a single constant built from the banner version, not
only the `@innfo-console-vX.Y.Z` segment. Emitted output MUST NOT contain a floating
ref, a stale version, the legacy `templates/console` path, or a repo name different from
the manifest repo. The exporter MUST NOT read `manifest/source.yaml` at run time; a test
MUST tie its output to `getConsoleReleaseInfo().cdnUrl`.

#### Scenario: Stale pin, wrong repo and legacy path
- GIVEN a shell pinning an older version, the `cogNNitive/cogNNitive` repo and a `templates/console` path
- WHEN the CLI exports a model with it
- THEN the output URL equals `getConsoleReleaseInfo().cdnUrl` in full

#### Scenario: Artifact shell export
- GIVEN `artifact_shell.html`
- WHEN the CLI exports
- THEN the output pin equals the current version and the manifest repo and path

### Requirement: Markers Contract Locked by Test

The payload `markers` field has two legitimate shapes that the bundle already consumes:
`element.markers` is a map and `schema.markers` is a list of definitions. A test MUST lock
both shapes on the exporter's output. This requirement MUST NOT change exporter code.

#### Scenario: Element markers shape
- GIVEN an export of a model with markers
- WHEN the payload is parsed
- THEN every `element.markers` is an object (map)

#### Scenario: Schema markers shape
- GIVEN an export of a model with or without markers
- WHEN the payload is parsed
- THEN `schema.markers` is an array of definitions
