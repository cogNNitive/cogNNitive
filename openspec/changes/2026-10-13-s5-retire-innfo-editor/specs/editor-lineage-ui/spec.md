# Delta for editor-lineage-ui

## REMOVED Requirements

### Requirement: Editor lineage UI

**Reason**: D13 retires the Vue `innfo-editor`; the vanilla console is the only UI stack.
The editor's lineage view is superseded by the console's Lineage tab.

**Migration**: None. Lineage is viewed in the console. The app and its deploy to
`docs/innfo/app/` are deleted.

#### Scenario: The editor lineage view is gone
- GIVEN the repository after this change
- WHEN the editor source is searched for
- THEN no editor lineage component exists
