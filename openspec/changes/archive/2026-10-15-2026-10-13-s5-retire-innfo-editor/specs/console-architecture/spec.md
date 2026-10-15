# Delta for console-architecture

## REMOVED Requirements

### Requirement: Three-Pathway Authorship and Review

(Reason: Pathway 2, the direct app GUI, is the Vue editor and hosted app retired with S5.)
(Migration: Replaced by "Two-Pathway Authorship and Review".)

## ADDED Requirements

### Requirement: Two-Pathway Authorship and Review

The system MUST support exactly two interaction pathways, both ending in changesets:
1. **Conversational agent**: the agent proposes changesets (including `add_model` and `add_element` to create models and elements) and applies them on the user's approval.
2. **Console review**: a zero-install `domaiNN_console.html` opened in a browser, where reviewers inspect elements, record drafts (including a "New element" draft) and export them as a changeset for the agent to apply.

No UI MAY write model or domain files directly.

#### Scenario: Stakeholder review via the console
- GIVEN a domain console file
- WHEN opened in a browser by a reviewer
- THEN the reviewer can inspect elements and record drafts without authoring tools
- AND the drafts leave the console only as an exported changeset

#### Scenario: Creation goes through a changeset
- GIVEN a user who asks for a new model
- WHEN the agent creates it
- THEN it does so with an `add_model` changeset, not with a direct file write
