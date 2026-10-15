# Delta for console-architecture

## ADDED Requirements

### Requirement: Console covers the editor's used feature set

Before the Vue `innfo-editor` is retired, a parity audit MUST be committed as `audit.md` in this change, classifying every editor route, view and component as *in console*, *port* or *drop*, each with the evidence of a real use (no evidence means *drop*). The audit MUST record an explicit decision for: the workspace lineage graph, the file preview modal, tag authoring and tag search, the dual-mode sidebar and breadcrumb ancestry, model and submodel creation, workspace presets and deep links, and validation and template-freshness warnings. Only *port* rows MAY be ported; a port MUST compose the existing `InnfoUI` primitives, the single shared modal for editable components, and `registerView` for read-only views. No second UI stack MAY be introduced. Model creation MUST NOT be ported: models are created by agent changesets (`add_model`, `add_element`) and the console offers only a "New element" draft.

#### Scenario: A used editor feature is reachable in the console
- GIVEN an audit row classified *port*
- WHEN S3 is complete
- THEN the feature (or its equivalent) is reachable in `domaiNN_console.html`
- AND it is composed of `InnfoUI` primitives, not a ported Vue component

#### Scenario: An unused feature is not ported
- GIVEN an audit row classified *drop*
- WHEN the port work is done
- THEN no `InnfoUI` component or view exists for it
- AND it is deleted with the editor

#### Scenario: The lineage graph decision is explicit
- GIVEN the committed `audit.md`
- WHEN it is read
- THEN it states whether the workspace lineage graph is ported as a view or dropped

#### Scenario: One shared modal
- GIVEN two editable components in the console
- WHEN each is edited
- THEN the same modal instance opens for both

## Dropped from this delta (reconciled 2026-10-13)

The `MODIFIED: Level 3 Model Custom Consoles` requirement was dropped. The console spine
(`single-console-shell`) REMOVES that requirement and replaces it with the ADDED "One Console
Shell, Scoped Domain Consoles"; its content (one `domaiNN_console.html`, views registered in
the runtime, no Workspace Hub, no orphan shell asset) is now owned by the spine. Re-adding it
here would modify a requirement that no longer exists when this change applies.
