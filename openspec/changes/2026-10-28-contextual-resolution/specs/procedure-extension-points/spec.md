# Delta for procedure-extension-points

Scope: procedures defined once with named slots that child scopes fill; slot contract
check; whole-procedure override recorded as a fork with an "original advanced" warning.
Phase G2 (listing surface in G3).

Terms. A **slot** is a named extension point declared by a procedure. A **filler** is a
value or sub-procedure a scope supplies for a slot. A **fork** is a procedure in a nearer
scope that replaces an ancestor procedure of the same id as a whole.

## ADDED Requirements

### Requirement: Procedures Declare Named Slots

A procedure MUST be able to declare zero or more named slots, each with a contract stating
whether it is required and what kind of filler it accepts (a value, or a sub-procedure).
Slot names MUST be unique within one procedure. A procedure with no slots MUST behave as
before.

#### Scenario: Slotted procedure declared at the root scope

- GIVEN a procedure `draft-visuals` at the domaiNN root declaring slots `style` (required, value) and `post_step` (optional, sub-procedure)
- WHEN procedures are listed for the root
- THEN `draft-visuals` appears with its two slots and their contracts

#### Scenario: Duplicate slot name

- GIVEN a procedure declaring two slots named `style`
- WHEN it is loaded
- THEN an error names the procedure and the duplicated slot

### Requirement: Child Scopes Fill Slots

A scope MUST be able to fill the slots of a procedure defined in any scope above it in its
chain, without redefining the procedure. For each slot, the filler of the nearest scope in
the chain MUST win. A filler MUST NOT alter any step of the procedure other than the slot's
position.

#### Scenario: Two series share one procedure

- GIVEN `draft-visuals` defined at the root, and series scopes `s1` (`style: noir`) and `s2` (`style: pastel`)
- WHEN the procedure is resolved for a document in each series
- THEN `s1` yields the procedure with `style` = `noir` and `s2` with `style` = `pastel`
- AND both resolutions reference the single root definition

#### Scenario: Nearest filler wins

- GIVEN a root-level default for slot `style`, a program filling it with `formal`, and a project filling it with `casual`
- WHEN the procedure is resolved for the project
- THEN `style` is `casual`, supplied by the project
- AND resolving for the program yields `formal`

### Requirement: Slot Contract Is Checked

Resolving a procedure MUST verify each slot against its contract. A required slot with no
filler in the chain and no default MUST be reported as an error naming the procedure and
the slot. A filler for a slot the procedure does not declare, or of a kind the contract
rejects, MUST be reported as an error naming the scope that supplied it. The check MUST
NOT silently ignore or coerce a filler.

#### Scenario: Required slot unfilled

- GIVEN `draft-visuals` with required slot `style` and a scope that fills nothing
- WHEN the procedure is resolved for that scope
- THEN an error reports that `style` of `draft-visuals` is required and unfilled

#### Scenario: Unknown slot filled

- GIVEN a scope filling slot `colour` that `draft-visuals` does not declare
- WHEN the procedure is resolved for that scope
- THEN an error names `colour`, the procedure and the supplying scope

#### Scenario: Wrong filler kind

- GIVEN slot `post_step` accepts a sub-procedure and a scope supplies a plain string
- WHEN the procedure is resolved
- THEN an error reports the kind mismatch for `post_step` and names the scope

### Requirement: Whole-Procedure Override Is A Recorded Fork

A scope MAY replace an ancestor procedure by defining a procedure with the same id. Such a
replacement MUST be recorded as a fork identifying the forking scope, the original
procedure and scope, and the original's version at fork time. A same-id procedure in a
nearer scope that does not declare itself a fork MUST still shadow the original, and MUST
be reported as an undeclared shadow.

#### Scenario: Declared fork is recorded

- GIVEN a series scope defining `draft-visuals` and declaring it a fork of the root's `draft-visuals` at version `2`
- WHEN procedures are listed for that series
- THEN the series procedure is listed with a fork record naming the root original and version `2`

#### Scenario: Undeclared shadow is reported

- GIVEN a series scope defining `draft-visuals` with no fork declaration
- WHEN procedures are listed for that series
- THEN the root's `draft-visuals` is reported as shadowed, and the series procedure is flagged as an undeclared shadow

### Requirement: Original Advanced Warning

When the original procedure of a recorded fork has a version different from the version
recorded at fork time, resolution and listing MUST warn, naming the fork, the recorded
version and the current version of the original. The warning MUST NOT block execution.

#### Scenario: Original moves ahead

- GIVEN a fork recorded against version `2` and the root original now at version `3`
- WHEN procedures are listed for the forking scope
- THEN a warning states the fork was made from `2` and the original is at `3`

#### Scenario: Original unchanged

- GIVEN a fork recorded against version `2` and the original still at `2`
- WHEN procedures are listed
- THEN no warning is emitted for that fork

### Requirement: Fork And Slot Results Are Serializable

Slot fillers, fork records and warnings MUST be plain serializable data that round-trips
through JSON unchanged, consistent with the `explain` trace of `contextual-resolution`.

#### Scenario: Round trip

- GIVEN a resolved slotted procedure with a fork record and a warning
- WHEN serialized to JSON and parsed
- THEN the parsed value deeply equals the original

## Out of scope

Per-scope `aggregate` of procedure catalogs, lockfile or materialization of resolved
procedures and `extends` (explicit multi-composition) are deferred. See the proposal's Deferred table
(`openspec/changes/2026-10-28-contextual-resolution/proposal.md`).
