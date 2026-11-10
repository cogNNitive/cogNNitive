# Delta for conntent-domain-console

## MODIFIED Requirements

### Requirement: Console edits are changeset operations

Every edit made in the `conntent` view (narration, field values, overrides, Kind edits, preset selection) MUST be emitted as a changeset operation (`update_field`, `add_element`, `comment`) through the console's single changeset, and picklists for models and voices MUST merge the blueprint reference catalog declared in blueprint frontmatter `catalog:` with the domain overlay per element slug so overlay elements inherit reference capabilities and api_ids.

#### Scenario: Picklists merge blueprint reference catalog with domain overlay
- GIVEN a domain catalog declaring models with only `allowed:: true` and `slug`
- AND a blueprint declaring a reference `catalog` in frontmatter
- WHEN console picklists are resolved
- THEN picklist options for capabilities such as image, avatar and voice resolve to their reference catalog `api_id` values
