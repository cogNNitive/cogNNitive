# Delta for release-version-generation

## ADDED Requirements

### Requirement: The committed nn-mcp bundle is a reproducible function of the tracked tree

The build of `iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js` MUST inline `@cognnitive/nn-core` from this checkout's `iNNfo/packages/nn-core/src/index.ts` instead of resolving it through `node_modules/@cognnitive/nn-core`, so the emitted bytes depend only on tracked files and not on which checkout that link points at.
Two consecutive builds of one tree MUST produce byte-identical output, and a build from a checkout at a different absolute path MUST produce the same bytes.
`node scripts/build-mcp-bundle.mjs --check` MUST fail when the committed bundle's bytes differ from a fresh build, MUST name the first differing byte offset and the command that rebuilds it, and MUST NOT write into the working tree.
The check MUST keep failing on the version, announcement and single-file conditions it enforced before, and MUST stay fast enough for the pre-commit hook and `scripts/verify.js`.

This replaces the earlier rule that no local rebuild's bytes are compared to the committed bundle: that rule held only while the build inlined whichever `nn-core` build the node_modules link happened to name, and it let a bundle that did not match its source reach the release.

#### Scenario: Two builds of one tree produce one artifact
- **GIVEN** an unmodified checkout
- **WHEN** the bundle is built twice
- **THEN** both files are byte-identical and equal the committed `bin/nn-mcp.bundle.js`

#### Scenario: The checkout path does not reach the artifact
- **GIVEN** the same package sources copied to two differently named project directories
- **WHEN** each copy builds the bundle
- **THEN** both bundles are byte-identical

#### Scenario: A bundle that does not match its source fails the guard
- **GIVEN** a bundle whose version announcement matches `package.json` but whose bytes differ from a fresh build
- **WHEN** `node scripts/build-mcp-bundle.mjs --check` runs
- **THEN** it exits non-zero, reports the first differing byte offset, and prints `node scripts/build-mcp-bundle.mjs` as the fix
- **AND** the working tree is left exactly as it was
