# Delta for federated-lineage-evidence

A consumer domaiNN that synchronizes another one records evidence that cites a mirrored element, but that citation is rejected before any resolver runs: `parseKnowledgeUnitRef` only understands a heading unit for a `.md` path, so the mirror form `sources/sync/<alias>/<path>_NN.md@<slug>` parses to nothing. Reference fields already resolve the same address through the mirror lookup, so the two validators disagree about what a mirror address means. This change makes the mirror address parse and resolve for source and evidence validation as it already does for reference fields, and wires the dormant evidence-drift resolver so an edited evidence file is reported. It adds no address grammar for plain `sources/` citations, and it does not transport asset bytes.

## ADDED Requirements

### Requirement: A mirror address parses to a semantic element unit

A citation whose path identifies a mirror model under `sources/sync/<alias>/` and whose unit names an element MUST parse to a reference carrying that element and, when present, one field subunit.
The parse MUST accept the same unit grammar the reference lookup accepts: `<slug>` for the element and `<slug>&<field>` for one of its fields.
The parsed reference MUST resolve against the mirror file's content as a model element, not as a markdown heading.
A path outside `sources/sync/<alias>/` MUST keep the parsing it has today.
A mirror path with no unit, or with a unit the address grammar rejects, MUST stay unparseable and therefore malformed.

#### Scenario: An evidence entry cites a mirrored element
- GIVEN a consumer domaiNN whose `sources/sync/org/organization_NN.md` declares element `gerente`
- WHEN the citation `sources/sync/org/organization_NN.md@gerente` is validated
- THEN it parses and resolves with no diagnostic

#### Scenario: A field of a mirrored element is cited
- GIVEN the same mirror and an element `gerente` carrying field `name`
- WHEN the citation `sources/sync/org/organization_NN.md@gerente&name` is validated
- THEN it parses and resolves with no diagnostic

#### Scenario: An element absent from the mirror is reported
- GIVEN the same mirror
- WHEN the citation `sources/sync/org/organization_NN.md@nobody` is validated
- THEN it is reported as `KU_UNKNOWN_ELEMENT_SLUG` with severity `error`

#### Scenario: A path outside the mirror area is unchanged
- GIVEN a citation `sources/import/guide.md@## Overview`
- WHEN it is validated
- THEN it parses as a heading unit exactly as before

### Requirement: Source and evidence validation agree with reference fields

Source and evidence validation MUST use the same mirror parsing and resolution the reference-field validator already uses, so that one mirror address cannot be valid for a `reference` field and malformed for an evidence entry.
A mirror citation MUST resolve through the file the path names, keeping the existing containment rules of the source resolver.
A mirror citation MUST NOT be reported as `KU_MALFORMED` when the reference-field validator accepts the same address.

#### Scenario: The reference and the evidence agree
- GIVEN a consumer element whose `reference` field and whose applied-change evidence cite `sources/sync/org/organization_NN.md@gerente`
- WHEN the workspace is validated
- THEN the reference field reports no diagnostic
- AND the evidence entry reports no diagnostic

### Requirement: The evidence-drift resolver is wired

Workspace drift validation MUST supply a `sha256` resolver to `checkProvenance`, so that a change whose recorded evidence hash differs from the file's current hash is reported.
The resolver MUST hash the file the evidence entry names, relative to the workspace root.
When the cited file cannot be read, the resolver MUST return no hash and the comparison MUST stay silent for that entry, as it does today for an absent resolver.
The reported diagnostic MUST stay `EVIDENCE_SOURCE_CHANGED` at the severity the drift mode already gives it.

#### Scenario: An edited evidence file is reported
- GIVEN an applied change whose recorded evidence hash was stamped for `sources/import/report.md`
- WHEN `sources/import/report.md` changes after the change was applied
- AND the workspace drift validation runs
- THEN it reports `EVIDENCE_SOURCE_CHANGED` naming that change and that citation

#### Scenario: An unchanged evidence file stays silent
- GIVEN the same applied change and an unchanged `sources/import/report.md`
- WHEN the workspace drift validation runs
- THEN it reports no `EVIDENCE_SOURCE_CHANGED`
