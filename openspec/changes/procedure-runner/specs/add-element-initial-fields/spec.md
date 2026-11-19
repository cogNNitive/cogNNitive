# Delta for add-element-initial-fields

An `append-only` event (a run's Execution Event) took two changesets: one `add_element`, then one `set_fields`, because a change could not target an element added in the same changeset and `add_element` carried no field values. The procedure runner records one changeset per call, so `add_element` now carries the element's initial fields in `to`, under the change's one evidence.

## ADDED Requirements

### Requirement: add_element carries initial fields

An `add_element` change MUST accept `to`, a JSON object of initial field values, in the same shape `set_fields` takes.
Each value in `to` MUST be validated exactly as `set_fields` validates it, and an invalid value MUST reject the whole change, leaving the model unchanged.
The element and its initial fields MUST be written by that one change, and the origin of each initial field MUST be that change.
An `add_element` change on an `append-only` concept MUST accept `to`, since writing an instance with its values is an add.
An `add_element` change without `to` MUST behave as before: the element is created with no field values.
The key `fields` on an `add_element` change MUST still be rejected, with a message that points at `to`.

#### Scenario: An event is one change
- GIVEN an open run whose `Execution Event` concept is `append-only`
- WHEN a changeset holds one `add_element` change with `to:: {"kind": "started", "actor": "ana"}`
- THEN the event exists with both fields and `ChangeLog.origin` of each field is that change

#### Scenario: An invalid initial value is rejected
- GIVEN a concept with a `number` field `amount`
- WHEN an `add_element` change carries `to:: {"amount": "many"}`
- THEN the change is rejected and the model is unchanged
