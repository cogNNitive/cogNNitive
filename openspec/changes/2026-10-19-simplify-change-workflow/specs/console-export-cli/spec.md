# Delta for console-export-cli

## MODIFIED Requirements

### Requirement: Changes collection in the domain payload

The domain payload MUST carry a `changes` collection built at export time from every
`changes/*_changes_NN.md` of the domain, whatever its status: one entry per changeset with
`{ path, title, author, status, appliedAt, resolution, changes: [{ id, op, target, author,
notes, status, resolution, sources, replaced_sources, from, to, name, concept, fields }] }`,
newest first by file stamp. A key absent from the file MUST be absent from the entry. The
collection MUST be an empty array (not absent) when the domain has no changeset, and MUST
NOT be written into any model. Per-element `history` MUST be derived from the same loaded
changesets.
(Previously: entries carried no `from`, `to`, `name`, `concept`, `fields` or `resolution`,
so the console could not show a diff, a reason or build a Revert.)

#### Scenario: Changes carried into the domain console
- GIVEN a domain with one proposed and one applied changeset
- WHEN the domain console is exported
- THEN the payload `changes` carries both with their changes
- AND no model file contains the collection

#### Scenario: Card data carried
- GIVEN an applied block with `from:: Ana`, `to:: Bea` and a conflict block with `resolution:: PRECONDITION_FAILED: x`
- WHEN the domain console is exported
- THEN the first entry carries `from` `Ana` and `to` `Bea`, and the second carries that `resolution`

#### Scenario: Empty is present, not missing
- GIVEN a domain with no `changes/` directory
- WHEN the domain console is exported
- THEN `changes` is `[]` and nothing throws
