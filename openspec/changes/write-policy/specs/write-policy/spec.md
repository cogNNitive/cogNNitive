# Delta for write-policy

Every Level-3 write goes through a changeset today, whatever the data. High-volume operational data (procedure executions, ledgers, readings) pays the full changeset ceremony for elements nobody reviews one by one, while imported snapshots already need a separate `read_only` marker. This change lands the contract and its enforcement in `apply_change`: a concept declares which kinds of write its instances accept, the declaration cascades from the bluepriNNt to the concept to the domaiNN, and a changeset that breaks it is rejected. A direct-write channel and the closure rule for citations are later changes.

## ADDED Requirements

### Requirement: A concept declares its write policy

A Concept Definition that declares `write_policy::` MUST declare one of `mutable`, `append-only` or `read-only`.
A bluepriNNt MAY declare `write_policy` in its frontmatter as the default for every concept that declares none.
A concept that declares nothing under a bluepriNNt that declares nothing MUST resolve as `mutable`.
`mutable` MUST allow adding, updating and removing instances; `append-only` MUST allow only adding them; `read-only` MUST allow no write.
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
