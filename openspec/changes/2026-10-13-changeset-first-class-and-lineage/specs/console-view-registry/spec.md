# Delta for console-view-registry

## ADDED Requirements

### Requirement: Changes as a first view

The `changes` blueprint MUST ship a console view at
`iNNfo/specs/bluepriNNts/changes/assets/console-view-changes.js` (blueprint-view
convention: flat under `assets/`, `console-view-` prefix). The view MUST be registered
through `registerView`, default to `kind: readonly`, and render the payload's
`changes` collection as a tab of `domaiNN_console.html`, ordered after the built-in
Explorer/Matrices tabs. It MUST NOT mutate the draft store unless a future change makes
editing changes a requirement.

#### Scenario: The Changes tab renders
- GIVEN a domain whose console payload carries a `changes` collection
- WHEN `domaiNN_console.html` opens
- THEN a "Changes" tab appears and lists the changesets with author, status and their changes

#### Scenario: The view is readonly by default
- GIVEN the `changes` blueprint view
- WHEN it mounts
- THEN `kind` is `readonly` and it holds no draft store or changeset
