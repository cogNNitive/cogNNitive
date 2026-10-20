# Delta Spec: tag-driven-release-workflow

## MODIFIED Requirements

### Requirement: Manifest content is assembled per unit and published last

The stable manifest at `https://cognnitive.com/use/manifest.md` MUST be the last artifact written by a release. The live manifest MUST NOT reference a version whose web commit or mirror tag does not exist.

The manifest MUST list only the latest version of each key (its published shape is unchanged). Entries of the released key MUST be built from the tagged commit's Core inventory (`manifest/source.yaml`) and versions, with `ref` equal to the release tag and `commit` equal to C. For the `blueprints` key, `scripts/verify.js` and `scripts/release/assemble-manifest.js` MUST require only the 7 Core `bluepriNNts` (`domaiNN`, `changes`, `sidecar`, `sources`, `artifacts`, `procedures`, `blank`) in the assembled manifest while optional vertical `bluepriNNts` remain governed by `iNNfo/specs/bluepriNNts/catalog.json` and decoupled from core manifest assembly gates. Pins of units not covered by the released key MUST be retained from the previously published manifest and each retained `ref` MUST resolve to its recorded `commit` in the web clone. Nested units MUST be handled per unit: releasing `skills` MUST keep the nested `innfo-mcp` pin and version of the previous manifest, and releasing `innfo-mcp` MUST change only that nested unit.

Every release MUST additionally write an immutable snapshot of the published manifest at `docs/use/manifests/<tag>.md` in `cogNNitive-web`. A snapshot MUST NOT be modified after it is written.

(Previously: `assemble-manifest.js` and `verify.js` required every repository blueprint directory, including optional verticals, to be enumerated in `manifest/source.yaml` and the assembled core manifest.)

#### Scenario: Releasing one key preserves other pins
- GIVEN a published manifest pinning `skills` and `blueprints`
- WHEN `skills-v2.10.0` is released
- THEN the new manifest pins `skills` at `2.10.0`
- AND the `blueprints` pin is unchanged and still resolves

#### Scenario: Releasing blueprints key assembles only Core blueprints into manifest
- GIVEN optional vertical blueprints exist in `iNNfo/specs/bluepriNNts/catalog.json` outside `manifest/source.yaml`
- WHEN `blueprints-v0.21.0` is released
- THEN `verify.js` and `assemble-manifest.js` succeed without requiring optional verticals in `manifest/source.yaml`
- AND the assembled manifest contains the 7 Core `bluepriNNts` pinned at `blueprints-v0.21.0`

#### Scenario: Nested pin is retained
- GIVEN `nn-innfo` embeds `innfo-mcp` at `0.11.0`
- WHEN `skills-v2.10.0` is released
- THEN `nn-innfo` is rebuilt at the new skills pin
- AND its nested `innfo-mcp` pin remains `0.11.0`

#### Scenario: Snapshot written per release
- GIVEN `innfo-mcp-v0.12.0` completed
- WHEN `docs/use/manifests/innfo-mcp-v0.12.0.md` is read
- THEN it equals the manifest published by that release

#### Scenario: Failure before the manifest stage leaves the live manifest untouched
- GIVEN the publish, mirror-tag or staged-validation stage fails
- WHEN the job ends
- THEN the live manifest is byte-identical to its state before the run

#### Scenario: Retained pin that does not resolve
- GIVEN a retained pin whose `ref` does not resolve to its recorded `commit` in the web clone
- WHEN the manifest is assembled
- THEN the job fails before M is pushed
