# Delta for field-transitions

A `select` field declares its allowed values and nothing about how a value may move: every option is reachable from every other, and 14 lifecycle fields across 11 bluepriNNts carry hand-written or absent enforcement. This change adds the missing half of a `select` declaration: `transitions`, a map from the current value to the values it may move to. It is a generic iNNfo primitive, not a procedure-specific one, and `apply_change` enforces it.

The declaration is level 2 only and is a validity rule over new writes, never a schema for history: a model whose value was set before the declaration stays valid, and only a new write is checked.

## ADDED Requirements

### Requirement: A select field may declare its transitions

A Field Definition of `type:: select` MAY declare `transitions` as an inline JSON object mapping a current value to an array of allowed next values, and every key and target MUST be one of the field's `options`.

The empty string `""` MUST denote an unset field.
Every option MUST be a key; a terminal value MUST state an empty array.
A `transitions` declaration on a field that is not `type:: select` MUST be reported as `TRANSITIONS_INVALID`.
A key that is not one of the options MUST be reported as `TRANSITIONS_UNKNOWN_VALUE`.
A target that is not one of the options MUST be reported as `TRANSITIONS_UNKNOWN_OPTION`.
A field with no `transitions` MUST accept any of its options, as before.

#### Scenario: A well-formed declaration composes
- GIVEN a `select` field with options `[idea, draft, archived]` declaring `transitions:: {"": ["idea"], "idea": ["draft", "archived"], "draft": ["archived"], "archived": []}`
- WHEN the bluepriNNt schema composes
- THEN no transitions problem is reported

#### Scenario: A terminal value must be stated
- GIVEN a `select` field with options `[idea, draft, archived]` whose `transitions` has no `archived` key
- WHEN the bluepriNNt schema composes
- THEN it reports `TRANSITIONS_INVALID` naming `archived`

#### Scenario: A transition to an undeclared value is reported
- GIVEN a `select` field with options `[idea, draft]` declaring a transition to `approved`
- WHEN the bluepriNNt schema composes
- THEN it reports `TRANSITIONS_UNKNOWN_OPTION` naming `approved`

### Requirement: Apply enforces the declared edge

At apply, a write that changes the value of a `select` field with declared `transitions` MUST follow a declared edge, and an undeclared one MUST conflict with `TRANSITION_NOT_ALLOWED`.

A conflict MUST name the field, the current value and the requested value.
Writing the value the field already holds MUST be accepted and MUST NOT be checked.
The current value MUST be the value the field holds when that change runs, in changeset order: an earlier change of the same changeset counts.
An `add_element` MUST check its initial fields as a write from `""`.
A field whose bluepriNNt declares no `transitions` MUST NOT be checked.

#### Scenario: A declared edge applies
- GIVEN an element whose `status` is `draft` and a field declaring `draft -> approved`
- WHEN a changeset sets `status` to `approved`
- THEN the change applies

#### Scenario: An undeclared edge conflicts
- GIVEN an element whose `status` is `draft` and a field declaring no `draft -> idea` edge
- WHEN a changeset sets `status` to `idea`
- THEN the change conflicts with `TRANSITION_NOT_ALLOWED`
- AND the element keeps `status:: draft`

#### Scenario: Re-stating the current value is accepted
- GIVEN an element whose `status` is `archived`, a terminal value
- WHEN a changeset writes `status` as `archived` again
- THEN the change applies

#### Scenario: An add checks the first edge
- GIVEN a field declaring `"" -> idea`
- WHEN an `add_element` writes its initial `status` as `approved`
- THEN the change conflicts with `TRANSITION_NOT_ALLOWED`

### Requirement: Transitions never revalidate history

A model whose value was written before its field declared `transitions` MUST stay valid, and `validate_knowledge` MUST NOT check transitions.

#### Scenario: An older value stays valid
- GIVEN an element holding `status:: drafted` written before the declaration, where `drafted` is not a declared option
- WHEN the workspace is validated
- THEN no transition problem is reported for that element
