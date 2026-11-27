# Delta for console-payload-builder

Scope: each procedure entry carries the resolved binding of its slots, and every binding
target is addressable as an entry so a view can navigate to it.

## ADDED Requirements

### Requirement: Procedure Entries Carry Their Slot Bindings

The console payload MUST carry, for each procedure entry, the resolved `binding` of every slot that has one, beside the slot declaration the entry already carries.
The payload MUST keep a declaration with no binding, and MUST NOT emit a binding the scoped listing would not report.

#### Scenario: an entry carries a bound slot

- GIVEN a domaiNN whose root scope fills `draft-visuals.post_step` with `{ procedure: audit }`
- WHEN the console is exported
- THEN the `draft-visuals` entry carries `post_step` with its binding

#### Scenario: an uncoupled slot stays a declaration

- GIVEN a procedure declaring `post_step` with no filler in its chain
- WHEN the console is exported
- THEN the entry carries `post_step` with no binding

### Requirement: A Slot Target Is An Addressable Entry

When a binding's value is a procedure reference, the payload MUST name the target entry's domain-relative document, and that document MUST be present as a procedure entry even when no run names it and the console otherwise excludes it as a linked stepper.
When the target document cannot be read, the payload MUST keep the binding and MUST NOT create an entry with a graph it did not build.

#### Scenario: a linked stepper becomes an entry

- GIVEN `post_step` bound to `procedures/audit_procedures_NN.md`, a stepper no run names
- WHEN the console is exported for the whole domaiNN
- THEN an entry exists for that document and the binding names it

#### Scenario: an unreadable target keeps the binding

- GIVEN a binding whose target document is missing
- WHEN the console is exported
- THEN the binding still names that document, no entry with a graph is invented, and the export succeeds
