# Delta for Console Export CLI

## ADDED Requirements

### Requirement: Hash Contract Change Invalidates Prior Review State Once

The export MUST emit element hashes under the markers-free contract of `console-payload-builder`. Drafts, `reviewed` marks and ledgers recorded against a pre-change hash MUST NOT be silently treated as current: a mark whose recorded hash differs from the exported `hash` shows `changed`, and a draft keyed to a moved target is flagged, never deleted. Exports MUST NOT carry any `markers` in the hash input or the payload.

#### Scenario: Old reviewed mark shows changed
- GIVEN a draft store holding a reviewed mark recorded with a pre-change hash
- WHEN the re-exported console loads the store
- THEN the element shows `changed` and does not count as reviewed
- AND the mark is not deleted

#### Scenario: Old draft is flagged, not lost
- GIVEN a draft against an element whose hash moved because of this change
- WHEN the console loads
- THEN the draft is still in the store and is flagged

#### Scenario: Hash stable afterwards
- GIVEN the same domaiNN exported twice after this change
- WHEN element hashes are compared
- THEN they are identical
