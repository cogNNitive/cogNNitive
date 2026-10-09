# Console Schema Resolution Specification

## Purpose

Define the single shared core path that resolves a model's Level 2 blueprint and derives the console `schema` slot, so the export CLI and the MCP `build_console_payload` tool emit byte-identical `schema` slots for the same model.

## Requirements

### Requirement: Shared Schema Resolution Path

The CLI (`scripts/export-console.mjs`) and the MCP `build_console_payload` tool MUST resolve the model's blueprint schema through ONE shared implementation in `innfo-core`. For a given model, both producers MUST emit byte-identical `schema` slots. The `schema` slot carries no timestamp; `generated` and `citationsResolvedAt` live in `meta` and are NOT part of the `schema` comparison.

#### Scenario: Byte-identical slots

- GIVEN one model resolvable through the shared path
- WHEN the CLI and the MCP tool each produce the payload
- THEN the two `schema` slots are byte-identical
- AND no timestamp appears in either `schema` slot

#### Scenario: Single implementation

- GIVEN the repository after this change
- WHEN the schema resolution+derivation definition is counted
- THEN exactly one such path exists, in `innfo-core`

### Requirement: Deterministic Resolution Precedence

Schema resolution MUST try, in order: (1) `<root>/specs/bluepriNNts/<name>/spec_NN.md` (unversioned package); (2) `<root>/specs/bluepriNNts/<name>/<version>/`; (3) flat `./specs`; (4) global cache; (5) canonical registry. A domain-local hit MUST win over the global cache and the canonical registry.

#### Scenario: Workspace package wins

- GIVEN `business` present as an unversioned workspace package AND in the global cache
- WHEN schema resolution runs
- THEN the workspace package is selected

#### Scenario: Canonical fallback

- GIVEN a blueprint absent from every workspace and global tier
- WHEN schema resolution runs
- THEN the canonical registry supplies it

### Requirement: Unversioned Package Recognition

An unversioned package directory MUST be recognized only when a spec file exists in it, never merely because the directory exists. When matched, resolution MUST return `isPackageDir: true` and `packagePath = <root>/specs/bluepriNNts/<name>` so procedure and sample discovery does not regress.

#### Scenario: Package-dir shape preserved

- GIVEN an unversioned package with `procedures/` and `samples/`
- WHEN the resolver matches it
- THEN the result carries `isPackageDir: true` and `packagePath = <root>/specs/bluepriNNts/<name>`

#### Scenario: Empty directory not matched

- GIVEN a directory `specs/bluepriNNts/<name>/` with no spec file
- WHEN resolution runs
- THEN the unversioned branch does not fire

### Requirement: Recursive Includes Composition

`includes` composition MUST resolve recursively through the same tier chain and MUST behave identically to `resolveBlueprintSchema` (`compose.ts`).

#### Scenario: Include resolved through the chain

- GIVEN a blueprint with an `includes` entry resolvable only in the workspace chain
- WHEN the schema is derived
- THEN the include contributes to the derived schema as in `resolveBlueprintSchema`

### Requirement: Graceful Degradation

When no blueprint resolves, resolution MUST degrade to the derived schema exactly as today and MUST NOT abort the export or the build.

#### Scenario: Unresolvable blueprint

- GIVEN a model whose blueprint resolves nowhere
- WHEN the CLI exports or the MCP tool builds
- THEN a derived `schema` slot is emitted
- AND no error aborts the operation

### Requirement: Deterministic Golden Fixture

The golden-parity fixture MUST isolate `INNFO_GLOBAL_DIR` and `INNFO_SKILLS_DIR` in-process and in the CLI subprocess, so resolution is deterministic and exercises the fixture blueprint.

#### Scenario: Fixture isolation

- GIVEN the golden-parity fixture
- WHEN the suite runs on a machine with a real global install
- THEN resolution uses only the isolated fixture directories
