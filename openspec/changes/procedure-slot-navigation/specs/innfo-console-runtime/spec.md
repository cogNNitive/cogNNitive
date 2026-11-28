# Delta for innfo-console-runtime

Scope: the procedures view renders a bound `procedure` slot at its declared step as one
navigable component, navigates to the target entry by document, and never expands or
executes the target.

## ADDED Requirements

### Requirement: A Bound Procedure Slot Renders At Its Step

The procedures view MUST render a bound `procedure` slot at the step named by the slot's `step`, as one navigable component and without expanding the target's steps inline.
The view MUST NOT start, alter or record a run from that component.
A bound slot with no `step`, or whose `step` names no step of the graph, MUST be reported among the view's structural defects and MUST NOT be placed at a guessed step.

#### Scenario: the component sits on its step

- GIVEN a procedure whose `post_step` slot names the step `compile-health-dashboard` and binds `audit`
- WHEN the view renders that procedure
- THEN one component for `audit` appears at the `compile-health-dashboard` step

#### Scenario: a slot with no step is reported

- GIVEN a bound `procedure` slot that declares no `step`
- WHEN the view renders that procedure
- THEN the slot is reported among the structural defects and no component is placed on any step

### Requirement: The Component Navigates To The Target Entry

Activating the component MUST select the entry whose document the binding names, and MUST NOT select by the target's display name or title.
Navigating MUST keep the entry the person left reachable in the view.

#### Scenario: activating opens the target

- GIVEN the component for `post_step` bound to `procedures/audit_procedures_NN.md`
- WHEN a person activates it
- THEN the view selects the entry of that document

#### Scenario: the left entry stays reachable

- GIVEN the same activation
- WHEN the view shows the target entry
- THEN the entry the person left is still selectable from the view

### Requirement: An Unaddressable Target Is Not A Control

When the binding's target has no entry in the payload, the component MUST render as a static label that names the missing document, and it MUST NOT be activatable.

#### Scenario: a missing target is a label

- GIVEN a binding naming a document the payload carries no entry for
- WHEN the view renders the step
- THEN the component is a static label naming that document and cannot be activated
