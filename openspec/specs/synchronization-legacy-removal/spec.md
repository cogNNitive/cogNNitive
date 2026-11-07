# synchronization-legacy-removal Specification

## Purpose
TBD - created by archiving change domain-synchronizations. Update Purpose after archive.
## Requirements
### Requirement: External Watch Roots no longer exist

The system MUST NOT parse, honor, tolerate, scan or document a `## NN External Watch Roots:` block. The code that parsed it (`skills/nn-sources/scripts/lib/external-scanner.js` watch-root parsing, the `--scan-external`, `--watch-digest` and `--digest-decide` CLI flags) MUST be deleted, and `.cognnitive/watch-digest.json` MUST no longer be written. No compatibility layer, alias or fallback MAY remain.

#### Scenario: Flags are gone
- GIVEN `nn-sources` after this change
- WHEN `--scan-external`, `--watch-digest` or `--digest-decide` is passed
- THEN the CLI treats it as an unknown option and performs no scan

#### Scenario: Repository gate
- GIVEN the repository after this change
- WHEN searched for `External Watch Roots` in code, bluepriNNts, living specs and documentation
- THEN no live reference exists (archived changes and history excepted)

### Requirement: A leftover watch-roots block gets the generic concept-drift diagnostic

The watch-roots entries are deleted from `nn-mcp/src/tools/validate.ts` and no dedicated diagnostic or message exists for the removed construct. When a domaiNN entrypoint (`domaiNN_NN.md`) contains a `## NN External Watch Roots:` heading, validation reports it through the generic concept-drift diagnostic (an unknown heading), like any other undeclared block. The block MUST NOT be read as configuration, the `RESERVED_STRUCTURAL_HEADINGS` tolerance for it is deleted, and no migration tool is provided, because no shipped domaiNN uses the block.

#### Scenario: Leftover block is reported
- GIVEN a `domaiNN_NN.md` with a `## NN External Watch Roots:` block
- WHEN the domaiNN is validated
- THEN the generic concept-drift diagnostic reports the heading

#### Scenario: No block, no error
- GIVEN a `domaiNN_NN.md` without the block
- WHEN the domaiNN is validated
- THEN no watch-roots diagnostic is reported

### Requirement: Imported Domain code does not exist

`nn-core/src/imports/*` (Imported Domain and Import, including `projectSnapshot`) MUST be deleted together with its exports and tests. The `imported_domain` file category MUST NOT exist.

#### Scenario: Module is gone
- GIVEN the repository after this change
- WHEN `iNNfo` core exports are listed
- THEN none of the Imported Domain or Import symbols is exported
- AND no `imported_domain` identifier remains

### Requirement: Alias citations do not exist

The alias citation form `alias>path@unit` MUST NOT be parsed or resolved. The alias resolution in `console/fs-source-resolver.ts` MUST be deleted. A citation is a workspace-relative path with an optional unit anchor.

#### Scenario: Alias form is not special
- GIVEN a citation value `org>kNNowledge/org_NN.md@puesto-a`
- WHEN it is resolved
- THEN no alias lookup occurs
- AND the value is treated as an ordinary workspace-relative path and reported as not found

### Requirement: Preflight no longer reports watch roots

The `nn-preflight` domain probe MUST NOT emit a `watch_roots` key and MUST NOT read the entrypoint for watch roots. The `nn` front controller MUST NOT offer a watch-root scan, a watch-root declaration option, a watch-digest at session start, or a Help entry for watched folders.

#### Scenario: Probe output
- GIVEN any domaiNN
- WHEN `domain-probe.js --json` runs
- THEN the output has no `watch_roots` key

#### Scenario: Menu has no watch surfaces
- GIVEN any workspace
- WHEN `nn` presents the entry menu and `[h] Help`
- THEN no watch-root scan, declaration option or watched-folders entry is listed
- AND `--watch-digest` is not invoked at session start

