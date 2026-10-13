# Delta for console-review-mode

## ADDED Requirements

### Requirement: New element draft

A model view MUST offer a "New element" action that opens the shared modal with a
concept picker (the concepts of the embedded schema), a name input, and one input per
field the schema declares on the chosen concept. Submitting MUST store a draft with
`kind: "new"`, `model_id`, `concept`, `element` (the name) and `proposed` (a map of the
filled fields). The draft store MUST accept a `kind: "new"` draft without `element_id`
and `base_hash`, and MUST reject it when `model_id`, `concept` or `element` is missing;
every other kind keeps requiring `element_id` and `base_hash`. The changeset export MUST
map the draft to `op:: add_element` with `concept`, `name` and `fields`. The action
MUST NOT create models and MUST work offline.

#### Scenario: New element exports as add_element
- GIVEN the console of model `strategy` with concept `Goal` in its schema
- WHEN the user adds a new element `Grow revenue` of concept `Goal` with field `owner` set to `CFO`
- THEN the exported changeset contains `op:: add_element`, `target:: strategy@Goal`, `concept:: Goal`, `name:: Grow revenue` and `fields::` with `owner`

#### Scenario: Store accepts a new draft without base_hash
- GIVEN a draft with `kind: "new"`, `model_id`, `concept` and `element` and no `element_id` or `base_hash`
- WHEN `addDraft` is called
- THEN the draft is stored

#### Scenario: Incomplete new draft rejected
- GIVEN a draft with `kind: "new"` and no `concept`
- WHEN `addDraft` is called
- THEN it throws naming the missing key

#### Scenario: Correction still requires base_hash
- GIVEN a draft with `kind: "correction"` and no `base_hash`
- WHEN `addDraft` is called
- THEN it throws as before
