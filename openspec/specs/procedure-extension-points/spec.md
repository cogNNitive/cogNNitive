# procedure-extension-points Specification

## Purpose
TBD - created by archiving change 2026-10-28-contextual-resolution. Update Purpose after archive.
## Requirements
### Requirement: One Document Is One Procedure

A procedure MUST be identified by its document: one procedure document defines exactly one
procedure, whose id is the document stem without its `_procedures` suffix, lower-cased, with
underscores turned into hyphens. A document is a procedure document if and only if its name
follows the naming contract: a non-sidecar `_NN.md` whose stem ends in `_procedures`
(`status-report_procedures_NN.md`). A catalog (`procedures_NN.md`), a blueprint spec
(`spec_NN.md`) and any other document are NOT procedure documents, wherever they live. Every
loader of procedures (a scope's `procedures/` folder, a bluepriNNt package's `procedures/`
folder and the transitive discovery of a bluepriNNt chain) MUST apply this one rule. The
elements of a procedure document other than the `Procedure` element are its steps.

#### Scenario: Only documents named as procedures are procedures

- GIVEN a `procedures/` folder holding `status-report_procedures_NN.md`, `procedures_NN.md`, `spec_NN.md` and `notes_NN.md`
- WHEN the procedures of that folder are loaded by any loader
- THEN exactly one procedure, `status-report`, is found

#### Scenario: Renaming keeps the id

- GIVEN a package procedure `import_and_transcribe_audio_NN.md` renamed to `import_and_transcribe_audio_procedures_NN.md`
- WHEN its id is computed
- THEN the id is `import-and-transcribe-audio` before and after the rename

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

### Requirement: Slots Reference Their Step By Id

A slot MAY name the step of its procedure where it sits, with `step`. The value MUST be the
id of a step element of the same procedure document, and that id is the element's slug
(its explicit `slug::` or the slug derived from its name), unique within the document. Every
element of the document other than the `Procedure` element is a step. A slot MUST NOT
reference its step by display name: a name is not an id and a rename would silently
break the join. A `step` that names no step element of the document MUST be reported as
an error `UNKNOWN_SLOT_STEP` naming the procedure, the slot and the step; the reference is
then left out of the loaded slot, never guessed from a similar name.

#### Scenario: Slot sits at a step

- GIVEN a procedure document with a step element whose slug is `compile-health-dashboard` and a slot `post_step` with `step: compile-health-dashboard`
- WHEN the procedure is loaded
- THEN the slot carries `step: compile-health-dashboard`
- AND no diagnostic is reported

#### Scenario: Step named by its display name

- GIVEN the same document and a slot with `step: "Compile Health Dashboard"`
- WHEN the procedure is loaded
- THEN an error `UNKNOWN_SLOT_STEP` names the procedure, the slot `post_step` and the step `Compile Health Dashboard`
- AND the loaded slot carries no `step`

#### Scenario: Step that does not exist

- GIVEN a slot with `step: ghost` and no step element with that slug
- WHEN the procedure is loaded
- THEN an error `UNKNOWN_SLOT_STEP` names the procedure, the slot and `ghost`
- AND the other slots of the procedure load unchanged

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

#### Scenario: Fill names no procedure

- GIVEN a scope whose `fills` name a procedure id that is defined nowhere in its chain
- WHEN procedures are resolved for that scope
- THEN an error `UNKNOWN_FILL_PROCEDURE` names the procedure id and the supplying scope

### Requirement: Whole-Procedure Override Is A Recorded Fork

A scope MAY replace an ancestor procedure by defining a procedure with the same id, and such a replacement MUST be recorded as a fork identifying the forking scope, the original procedure and scope, and the original's version at fork time. A same-id procedure in a nearer scope that does not declare itself a fork MUST still shadow the original, and MUST be reported as an undeclared shadow.

#### Scenario: Declared fork is recorded

- GIVEN a series scope defining `draft-visuals` and declaring it a fork of the root's `draft-visuals` at version `2`
- WHEN procedures are listed for that series
- THEN the series procedure is listed with a fork record naming the root original and version `2`

#### Scenario: Undeclared shadow is reported

- GIVEN a series scope defining `draft-visuals` with no fork declaration
- WHEN procedures are listed for that series
- THEN the root's `draft-visuals` is reported as shadowed, and the series procedure is flagged as an undeclared shadow

#### Scenario: Fork names an original that is not there

- GIVEN a fork record whose procedure differs from the forking procedure, or whose scope holds none of the procedures it replaces
- WHEN procedures are listed
- THEN a warning `FORK_ORIGINAL_NOT_FOUND` names the fork and the recorded original
- AND a fork whose original is simply not in the chain raises nothing

#### Scenario: Procedure document cannot be read

- GIVEN a procedure document of a scope that cannot be read
- WHEN the scope procedures are loaded
- THEN an error `UNREADABLE_DOCUMENT` names the procedure and the scope, the other procedures load, and nothing throws

### Requirement: Original Advanced Warning

When the original procedure of a recorded fork has a version different from the version recorded at fork time, resolution and listing MUST warn, naming the fork, the recorded version and the current version of the original. The warning MUST NOT block execution.

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

