# Delta for console-architecture

## MODIFIED Requirements

### Requirement: Level 2 Template Domain Consoles

Template consoles MUST compose Level 1 primitives through a single config-driven shell
(`console/artifact_shell.html`) conforming to standard layout slots and events. Only
views that exist MAY be specified: specialized layouts are limited to `timeline` in
`metrics` and the procedure console. Funnel, Org Chart and Roadmap views MUST NOT be
promised.
(Previously: required domain-specific views including Funnel in `innovation`, Org Chart in `organization`, Roadmap in `projects`, none of which exist.)

#### Scenario: Template view composition
- GIVEN a domain template using the shared shell
- WHEN the template console mounts
- THEN it renders through shared Level 1 pills and cards

#### Scenario: No per-domain thin shells
- GIVEN the blueprint `assets/` folders
- WHEN the shells are listed
- THEN no analysis, documentation, innovation, organization or projects `*_console.html` exists
