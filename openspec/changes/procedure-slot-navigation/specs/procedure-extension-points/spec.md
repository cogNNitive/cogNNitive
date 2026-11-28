# Delta for procedure-extension-points

Scope: the binding a scope supplies for a declared slot is reported by the scoped
procedure listing, a `procedure` binding names the document that defines its target, and
a `procedure` slot stays outside run parameters.

## ADDED Requirements

### Requirement: A Resolved Slot Binding Is Reported

The scoped procedure listing MUST report, for each declared slot that a scope fills or a default resolves, a `binding` object carrying the resolved `value` and the supplying scope as `from`.
The listing MUST keep a slot with no filler and no default as a declaration with no `binding`, and MUST NOT invent a value for it.
The listing MUST NOT report a `binding` for a filler its contract rejected, because a rejected filler never binds and is already reported as a diagnostic.

#### Scenario: a filled procedure slot is reported

- GIVEN procedure `draft-visuals` declaring slot `post_step` of kind `procedure`, filled by a scope with `{ procedure: audit }`
- WHEN procedures are listed for that scope
- THEN `post_step` carries `binding.value` `{ procedure: "audit" }` and a `binding.from` naming the supplying scope

#### Scenario: an unfilled slot keeps its declaration

- GIVEN the same procedure with no filler for `post_step` anywhere in the chain
- WHEN procedures are listed for that scope
- THEN `post_step` is listed with its declaration and no `binding`

### Requirement: A Procedure Slot Binding Names Its Target Document

A binding whose `value` is a procedure reference MUST name the target procedure id and the domain-relative document that defines it, so a consumer addresses the target by document and never by display name.
The listing MUST NOT bind a reference to a procedure that is not defined in the chain, and `UNKNOWN_FILLER_PROCEDURE` MUST remain the diagnostic for that case.

#### Scenario: the target document is carried

- GIVEN `post_step` bound to the procedure `audit` defined in `procedures/audit_procedures_NN.md`
- WHEN the listing reports the binding
- THEN it names `audit` and `procedures/audit_procedures_NN.md`

#### Scenario: a target outside the chain is not bound

- GIVEN a scope filling `post_step` with `{ procedure: ghost }` and no `ghost` defined in its chain
- WHEN procedures are listed for that scope
- THEN `UNKNOWN_FILLER_PROCEDURE` is reported and `post_step` carries no `binding`

### Requirement: A Procedure Slot Is Not a Run Parameter

A slot of kind `procedure` MUST NOT be required as a run parameter and MUST NOT be substituted into a run, because only `value` slots are run parameters.
A run of a procedure whose `procedure` slot is filled MUST keep today's behaviour: the runner MUST NOT start, expand or record the bound procedure.

#### Scenario: a filled procedure slot does not block a run

- GIVEN a procedure whose `procedure` slot is filled by its scope
- WHEN the run starts with no parameter for that slot
- THEN the run starts and the bound procedure is not started
