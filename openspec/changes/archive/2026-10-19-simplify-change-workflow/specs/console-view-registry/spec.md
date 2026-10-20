# Delta for console-view-registry

## REMOVED Requirements

### Requirement: Changes view

(Reason: the core Changes tab (`review-workflow`, "One Changes Tab") shows applied history
with the shared card, so the read-only `changes` bluepriNNt view
`iNNfo/specs/bluepriNNts/changes/assets/console-view-changes.js` is a second, poorer
surface. The runtime already hides its tab button.)
(Migration: the file is deleted. A domain that still carries an installed copy under
`specs/bluepriNNts/changes/assets/` keeps loading it; its tab stays hidden.)

#### Scenario: No built-in Changes view
- GIVEN a domain with a changeset, exported from this repository
- WHEN `domaiNN_console.html` is generated
- THEN it inlines no `console-view-changes` view
