# Delta for Template Ecosystem Documentation

## ADDED Requirements

### Requirement: Blueprint catalog table covers every shipped blueprint

`docs/innfo/documentation/templates.md` MUST list every shipped Level-2 blueprint with its name, title, version, and package path. Adding a blueprint without adding its row MUST be treated as a documentation drift gap.

#### Scenario: New blueprint row added

- GIVEN the blueprint `visual-catalog` with title "Visual Catalog App" and version `V_0-1-0`
- WHEN `docs/innfo/documentation/templates.md` is reviewed
- THEN a row for `visual-catalog` is present with its title, version, and package path

#### Scenario: Missing row is a drift gap

- GIVEN a shipped blueprint absent from the catalog table
- WHEN documentation is reviewed against `manifest/source.yaml`
- THEN the omission is reported as a drift gap
