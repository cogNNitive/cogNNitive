# Delta for editor-tag-authoring

## REMOVED Requirements

### Requirement: Editor tag authoring

**Reason**: D13 retires the Vue `innfo-editor`. Any tag-authoring feature with a real
usage was ported to the console in S3; the editor's own implementation is deleted.

**Migration**: None; the console is the authoring surface.

#### Scenario: No editor tag-authoring remains
- GIVEN the repository after this change
- WHEN the editor source is searched for
- THEN no tag-authoring component exists
