# Delta for console-view-registry

## ADDED Requirements

### Requirement: Changes view

The `changes` bluepriNNt MUST ship a console view at `iNNfo/specs/bluepriNNts/changes/assets/console-view-changes.js` (blueprint-view convention: flat under `assets/`, `console-view-` prefix), registered through `registerView` with `kind: readonly`. It MUST render the domain payload's `changes` collection as a "Changes" tab of `domaiNN_console.html`, ordered after the built-in tabs, listing proposed changesets first and, for each changeset, its author, status and changes (op, target, notes, evidence citation). It MUST NOT hold the draft store, the shared modal or the changeset of the console.

#### Scenario: The Changes tab renders
- GIVEN a domain whose console payload carries one proposed and one applied changeset
- WHEN `domaiNN_console.html` opens
- THEN a "Changes" tab lists both, the proposed one first, with author, status and changes

#### Scenario: The view is readonly
- GIVEN the `changes` bluepriNNt view
- WHEN it mounts
- THEN `kind` is `readonly` and its `ctx` carries no draft store, modal or changeset
