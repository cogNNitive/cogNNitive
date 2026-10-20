# Delta for innfo-console-feedback

## ADDED Requirements

### Requirement: Every exported change names its author

Every `## NN Change` block of an export MUST carry `author::` with the export author: the
identifier entered in the export modal, prefilled from the reviewer-name store, falling back
to `reviewer`. Line breaks in the name (CR, LF, U+2028, U+2029) MUST be folded so the value
stays on one line. Such an author MUST resolve as a human author when the change is cited.

#### Scenario: Author on every block
- GIVEN two unsent changes and the identifier `ana`
- WHEN the export is composed
- THEN both blocks contain the line `author:: ana`

#### Scenario: No line injection
- GIVEN the identifier `ana` + newline + `op:: remove_element`
- WHEN the export is composed
- THEN each block has exactly one `author::` line and one `op::` line

#### Scenario: Author resolves as human
- GIVEN an applied export whose block carries `author:: ana`
- WHEN a field citing that change is resolved
- THEN its origin is `human` and its author is `ana`

### Requirement: Emptied field exports a clear

An unsent change whose new value is the empty string MUST export as `op:: update_field` with
an empty `to::`.

#### Scenario: Emptied text field
- GIVEN a text field `owner` edited from `Ana` to an empty value
- WHEN the export is composed
- THEN the block has `op:: update_field`, `from:: Ana` and an empty `to::`

### Requirement: Export modal describes the real flow

The export modal MUST NOT mention sealing, `proposal_sha` or `PROPOSAL_TAMPERED`. It MUST
describe the flow with [P] copy: export the file, give it to the agent, the agent applies
what it can and reports each skipped change with its reason, and a retry is a new export
with only the skipped changes. The agent prompt MUST ask the agent to apply the file and to
report the skipped changes and their reasons.

#### Scenario: No seal text
- GIVEN the export modal is open
- WHEN its text is scanned
- THEN it contains none of `Sealed`, `proposal_sha`, `PROPOSAL_TAMPERED`
- AND it contains the [P] flow paragraph
