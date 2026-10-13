# Delta for console-architecture

## ADDED Requirements

### Requirement: Console covers the editor's used feature set

Before the Vue `innfo-editor` is retired, the vanilla console MUST cover every editor
feature that has a real usage. Each editor feature MUST be classified as already in the
console, ported to `ui-kit.js`, or unused. Only features with a real usage MAY be ported;
a port MUST compose the existing `InnfoUI` primitives and the single shared modal. No
second UI stack MAY be introduced.

#### Scenario: A used editor feature is reachable in the console
- GIVEN an editor feature F with a real usage
- WHEN the console is opened
- THEN F (or its equivalent) is reachable
- AND F is composed of `InnfoUI` primitives, not a ported Vue component

#### Scenario: An unused feature is not ported
- GIVEN an editor feature with no real usage
- WHEN the port work is done
- THEN no `InnfoUI` component exists for it
- AND it is left to be deleted with the editor

#### Scenario: One shared modal
- GIVEN two editable components in the console
- WHEN each is edited
- THEN the same modal instance opens for both
