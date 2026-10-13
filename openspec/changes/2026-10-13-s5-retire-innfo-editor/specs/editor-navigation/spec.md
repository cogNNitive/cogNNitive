# Delta for editor-navigation

## REMOVED Requirements

### Requirement: Editor navigation

**Reason**: D13 retires the Vue `innfo-editor`; navigation lives in the console.

**Migration**: None. The domain console is the navigation root (D14).

#### Scenario: No editor navigation remains
- GIVEN the repository after this change
- WHEN the editor source is searched for
- THEN no editor navigation component exists
