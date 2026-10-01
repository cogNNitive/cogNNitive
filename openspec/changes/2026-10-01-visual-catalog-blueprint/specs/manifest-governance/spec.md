# Delta for Manifest Governance

## ADDED Requirements

### Requirement: Blueprint Distribution Registration

Every Level-2 blueprint shipped under `iNNfo/specs/bluepriNNts/` MUST have a matching `blueprints:` entry in `manifest/source.yaml` declaring `name`, `repo`, `path`, `version`, and `ref_key: blueprints`. The inventory guard (`node scripts/verify.js`) MUST fail when a package has no entry or an entry has no package.

#### Scenario: New blueprint is registered

- GIVEN the new package `iNNfo/specs/bluepriNNts/visual-catalog/`
- WHEN `manifest/source.yaml` is validated
- THEN a `blueprints:` entry for `visual-catalog` exists with all required keys
- AND `npm run check:versions` passes

#### Scenario: Unregistered package fails the guard

- GIVEN a blueprint package with no matching `blueprints:` entry
- WHEN `node scripts/verify.js` runs
- THEN the inventory guard reports an error
