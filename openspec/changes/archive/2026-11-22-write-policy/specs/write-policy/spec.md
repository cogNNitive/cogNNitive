# Delta for write-policy

Every Level-3 write goes through a changeset today, whatever the data. High-volume operational data (procedure executions, ledgers, readings) pays the full changeset ceremony for elements nobody reviews one by one, while imported snapshots already need a separate `read_only` marker. This change lands the contract and its enforcement in `apply_change`: a concept declares which kinds of write its instances accept, the declaration cascades from the bluepriNNt to the concept to the domaiNN, and a changeset that breaks it is rejected. It also publishes the property in iNNfo V_0-8-0 and adds the closing event of a model (`close_model`). A direct-write channel and the closure rule for citations are later changes.

## ADDED Requirements

### Requirement: A concept declares its write policy

A Concept Definition that declares `write_policy::` MUST declare one of `mutable`, `append-only` or `read-only`.
A bluepriNNt MAY declare `write_policy` in its frontmatter as the default for every concept that declares none.
A concept that declares nothing under a bluepriNNt that declares nothing MUST resolve as `mutable`.
`mutable` MUST allow adding, updating and removing instances; `append-only` MUST allow adding them and filling a value that is still empty, and MUST NOT allow overwriting a written value or removing an instance (write once); `read-only` MUST allow no write.
A `write_policy::` value that is not one of the three policies MUST be reported as `WRITE_POLICY_UNKNOWN` when the schema composes.

#### Scenario: A concept is declared append-only
- GIVEN a Concept Definition `Procedure Execution` with `write_policy:: append-only`
- WHEN the bluepriNNt schema is extracted
- THEN the concept carries the policy `append-only`

#### Scenario: An unknown value is reported
- GIVEN a Concept Definition `Log` with `write_policy:: sometimes`
- WHEN the bluepriNNt schema composes
- THEN the composition reports `WRITE_POLICY_UNKNOWN` for `Concept Definition.Log.write_policy`

### Requirement: The write policy cascades and the domaiNN can only tighten it

The concept declaration MUST override the bluepriNNt default, in either direction.
The domaiNN root and its `scope: true` folders MAY declare `write_policy`, and each such declaration MUST only keep or tighten the policy inherited from above, never loosen it.
An isolated scope MUST NOT loosen a policy declared by a scope above it.
An unknown value at any level MUST resolve as `read-only` (fail closed).

#### Scenario: The domaiNN tightens a mutable concept
- GIVEN a concept declared `mutable`, a domaiNN root declaring `append-only` and a scope folder declaring `read-only`
- WHEN the write policy is resolved for that scope
- THEN it is `read-only`

#### Scenario: The domaiNN cannot loosen an append-only concept
- GIVEN a concept declared `append-only` and a domaiNN root declaring `mutable`
- WHEN the write policy is resolved
- THEN it is `append-only`

#### Scenario: Isolation does not loosen
- GIVEN a domaiNN root declaring `read-only` and an isolated scope declaring `mutable`
- WHEN the write policy is resolved for the isolated scope
- THEN it is `read-only`

### Requirement: Changeset operations are classified against the write policy

Each changeset operation that writes concept instances MUST be classified as `add` (`add_element`, `add_model`), `update` (`update_field`, `set_fields`, `rename_element`, `update_element_text`, `move_model`) or `remove` (`remove_element`, `remove_model`, `extract_instance`).
Every other operation MUST stay outside the write policy.
An operation whose kind the resolved policy does not allow MUST be reported as `WRITE_POLICY_DENIED`, naming the concept, the policy and the operation.

#### Scenario: An update on an append-only concept is denied
- GIVEN a concept `Procedure Execution` whose resolved policy is `append-only`
- WHEN an `update_field` on one of its instances is checked
- THEN it is reported as `WRITE_POLICY_DENIED`
- AND an `add_element` on the same concept is allowed

### Requirement: apply_change enforces the write policy

`apply_change` MUST resolve the write policy of the concept each instance-writing change targets, from its Concept Definition, its bluepriNNt frontmatter and the `scope: true` documents of the model's domaiNN chain, and MUST reject the changeset with `WRITE_POLICY_DENIED` before any write when the policy does not allow that change.
When the model has no domaiNN root, only the bluepriNNt levels MUST apply.
When the domaiNN scope chain cannot be read, the changeset MUST be rejected with `WRITE_POLICY_UNRESOLVED`, because an unread scope might tighten the policy. (Previously: an unreadable or malformed document in the model's folder chain did not affect `apply_change`.)
A concept that declares nothing, under a bluepriNNt and a domaiNN that declare nothing, MUST keep accepting every change it accepted before.

#### Scenario: The domaiNN tightens through a root scope document
- GIVEN a mutable concept `Work` and a `scope: true` document at the domaiNN root declaring `write_policy:: read-only`
- WHEN a changeset with an `update_field` on a `Work` element is applied
- THEN it is rejected with `WRITE_POLICY_DENIED`
- AND the model is byte-identical

#### Scenario: An unreadable scope chain fails closed
- GIVEN a `scope: true` document at the domaiNN root whose frontmatter is malformed
- WHEN any instance-writing changeset is applied in that domaiNN
- THEN it is rejected with `WRITE_POLICY_UNRESOLVED`

### Requirement: An append-only instance is written once

An instance-writing change on an `append-only` concept that only writes values the instance does not have yet (the fields an `update_field` or `set_fields` sets are empty, or the text an `update_element_text` sets is empty) MUST be checked as an addition.
Any other update of an `append-only` instance MUST be reported as `WRITE_POLICY_DENIED`.

#### Scenario: A log entry is completed, then frozen
- GIVEN an `append-only` concept `Log` and an element `Entry Two` added with no `note`
- WHEN a later changeset sets `note` on `Entry Two`
- THEN it is applied
- AND a further changeset that changes `note` again is rejected with `WRITE_POLICY_DENIED`

### Requirement: Whole-model operations respect the write policy

`apply_change` MUST check the write policy for whole-model operations too: an `add_model` of a distributed instance MUST be checked as an addition of its root concept, a `remove_model` as a removal and a `move_model` as an update of every concept with instances in the model, and an `extract_instance` as a removal of the extracted element's concept.

#### Scenario: An append-only instance model cannot be removed
- GIVEN a distributed concept `Run` declared `append-only` and an instance model of it
- WHEN a changeset with a `remove_model` of that instance is applied
- THEN it is rejected with `WRITE_POLICY_DENIED`
- AND the instance file is unchanged

### Requirement: iNNfo V_0-8-0 declares the write policy

iNNfo V_0-8-0 MUST declare `write_policy` as a `select` property of Concept Definition with the options `mutable`, `append-only` and `read-only`, MUST document the cascade, and MUST resolve offline from the canonical registry. iNNfo V_0-7-0 MUST stay unchanged as a separate file.

#### Scenario: The property is known to the metaschema
- GIVEN a bluepriNNt with a concept declaring `write_policy:: append-only`
- WHEN it is validated against iNNfo V_0-8-0
- THEN no "not declared on Concept Definition" diagnostic is reported for `write_policy`

### Requirement: A model is closed by a closing event

The changeset operation `close_model` MUST target a bare Level-3 model id and MUST set `closed: true` in the model frontmatter; the changeset that carries it is the record of the closure.
After a model is closed, `apply_change` MUST reject every instance-writing change to it, in the same changeset too, and a second `close_model`, with `MODEL_CLOSED`, whatever the write policy.

#### Scenario: Nothing is appended after the closing event
- GIVEN a model holding an `append-only` concept
- WHEN a changeset closes it with `close_model` and a later changeset adds an element to it
- THEN the later changeset is rejected with `MODEL_CLOSED`
- AND the model is byte-identical to its closed state
