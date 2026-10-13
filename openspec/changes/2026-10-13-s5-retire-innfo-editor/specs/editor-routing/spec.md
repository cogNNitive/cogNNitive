# Delta for editor-routing

## REMOVED Requirements

### Requirement: Editor routing

**Reason**: D13 retires the Vue `innfo-editor`; routing lives in the console (hash
tabs).

**Migration**: None.

#### Scenario: No editor router remains
- GIVEN the repository after this change
- WHEN the editor source is searched for
- THEN no router component exists
