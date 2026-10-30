# Delta for innfo-console-runtime

Scope: the procedures view derives a procedure's structure from the model's declared
references (never from render-time heuristics), owns that derivation in exactly one place,
joins the catalog tier with the execution tier, renders decision branches, and surfaces
every structural defect.

## ADDED Requirements

### Requirement: Procedure Step Chain Is Derived From Declared References

The runtime MUST build a procedure's step chain from the model's declared references, not
from the order `Array.sort` leaves the siblings in. The **head** of the chain MUST be the
step that no sibling targets through `next::` (compared within the same parent), and the
chain MUST then follow `next::` (the relation first, then the `next::` field label). The
runtime MUST NOT treat the first element of a sibling array as the head. When `next::` does
not order two siblings, the tie-break MUST be document order (the order elements appear in
the model); the runtime MUST NOT use `localeCompare` or any name ordering to order a
workflow.

#### Scenario: Head is not alphabetically first

- GIVEN a procedure whose step chain is `Configurar el vídeo → Elegir imágenes → Redactar → Aprobar` and no sibling targets `Configurar el vídeo` with `next::`
- WHEN the chain is derived
- THEN it starts at `Configurar el vídeo` and reaches `Aprobar`
- AND no step is dropped even though `Aprobar` sorts before `Configurar` alphabetically

#### Scenario: Chain order is not name order

- GIVEN a procedure whose head is `Normalize Source` and whose chain ends `… → Report Ingestion`
- WHEN the chain is derived
- THEN it follows the declared `next::` order
- AND it does not reorder steps by name

#### Scenario: Document order breaks an unordered tie

- GIVEN two sibling steps with no `next::` edge between them anywhere in the chain
- WHEN the chain is derived
- THEN they keep the order they appear in the model

### Requirement: Procedure Structure Defects Are Visible

When the runtime cannot derive an unambiguous chain, it MUST record a structural defect and
render it; it MUST NOT silently drop or reorder steps. A defect MUST name the affected
element and the shape the runtime expected. The defect classes are: no head (a cycle), more
than one head (a fork), a `next::` target outside the same parent, and a step unreachable
from the head. The procedures view MUST show a structure summary (procedure count, step
count, ungrouped-step count) and one line per defect.

#### Scenario: Cycle is reported

- GIVEN a procedure whose steps form a `next::` cycle with no head
- WHEN the view renders
- THEN a defect naming the cycle is shown
- AND every step still appears (nothing is dropped)

#### Scenario: Two heads are reported

- GIVEN a procedure with two steps that no sibling targets
- WHEN the view renders
- THEN a defect naming both heads is shown
- AND both chains are visible

#### Scenario: Ungrouped steps are counted

- GIVEN a document whose `Work` elements have no root and no `parent::` links
- WHEN the view renders
- THEN the structure summary reports the ungrouped count
- AND the view does not present each ungrouped step as its own procedure without that signal

### Requirement: One Owner Of Console Tree Semantics

The runtime MUST be the single owner of console tree semantics: tree build, chain
derivation, `nextStep`, parent resolution, reference cleaning and sibling ordering all live
in `nn-runtime.js`. A view MUST consume them and MUST NOT carry a parallel implementation.
When the runtime is absent, the view MUST report it (its existing "runtime is not
available" state) rather than fall back to duplicated logic.

#### Scenario: No parallel ordering logic in the view

- GIVEN the procedure stepper source
- WHEN it is searched for chain-ordering, head-finding or parent-resolution logic
- THEN none is found
- AND the stepper calls the runtime for every structural operation

### Requirement: Procedure Tab Shows The Catalog Entry

The procedures view MUST join each executable workflow (a root `Work`) with its catalog
`Procedure` entry through the emitted `procedure_model` relation and render that entry's
`summary`, `category`, `executed_by`, `inputs_required` and `outputs_expected` in the
workflow header. When a root `Work` has no linked `Procedure`, the view MUST render the
workflow with its title and a note that no catalog entry is linked; it MUST NOT fabricate
values. Missing fields MUST be omitted, not shown as placeholders.

#### Scenario: Ficha is shown

- GIVEN a `Procedure` whose `procedure_model` relation targets a root `Work`
- WHEN that workflow's tab is active
- THEN the header shows the `Procedure`'s summary, category, responsible role and expected inputs/outputs

#### Scenario: No catalog entry linked

- GIVEN a root `Work` with no incoming `procedure_model` relation
- WHEN its tab is active
- THEN the header shows the workflow title and a "no catalog entry" note
- AND no fabricated summary appears

### Requirement: Decision Steps Render As Branches

A step whose `step_type::` is `decision` and that declares two or more `next::` targets MUST
render as a branch listing each outcome; a `decision` with a single `next::` target MUST
render as a normal step. Branch rendering is presentation only: the underlying `next::`
references MUST NOT be rewritten.

#### Scenario: Two outcomes are visible

- GIVEN a `decision` step with `next:: [[Approve]]` and `next:: [[Revise]]`
- WHEN the step renders
- THEN both `Approve` and `Revise` are shown as outcomes of the branch

#### Scenario: Single outcome is a linear step

- GIVEN a `decision` step with one `next::` target
- WHEN it renders
- THEN it renders as an ordinary step in the chain

### Requirement: Procedure Stepper Consumes The Shared Runtime

The `procedures` console view MUST consume the shared runtime for all structural operations
and MUST NOT carry a fallback copy of them: `render-procedure-stepper.js` re-implemented
`sortChildren`/`chainOf`/`firstChild`/`nextStep`/`resolveParentId` with a local fallback,
ordered siblings by `localeCompare`, and started the chain at the first child. It mounts as
a registered view (`console-view-registry`), renders one tab per executable workflow (a root
`Work`), and renders the chain derived per "Procedure Step Chain Is Derived From Declared
References". Its step-log dialog MUST stay scoped to its own container and MUST NOT use
`#nn-export-modal`.

#### Scenario: View reads structure from the runtime

- GIVEN a payload with a procedure whose head is not alphabetically first
- WHEN the view mounts
- THEN the rendered chain matches the declared `next::` order
- AND the view source contains no sibling-ordering logic

#### Scenario: Tabs are workflows

- GIVEN a document with one root `Work` and its steps
- WHEN the view renders
- THEN it shows one tab for the root `Work`, not one per step
