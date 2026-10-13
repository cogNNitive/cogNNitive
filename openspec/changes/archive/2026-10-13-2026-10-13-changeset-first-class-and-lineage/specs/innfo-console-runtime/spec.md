# Delta for innfo-console-runtime

## MODIFIED Requirements

### Requirement: Exported changesets are resolvable by apply_change

The console changeset export MUST emit the Level-3 changeset frontmatter of `changeset-document-model` (`level: 3`, `parent_spec: { name: "changes", url }`, `blueprint_version`, `status: proposed`), so `parseChangeset` accepts it and `validate_knowledge` reports it valid. `draftToChange` MUST emit a `target` whose model part is the model's file stem and whose element part is the element slug, never the display name. A draft of kind `new` MUST export as `op:: add_element` (concept, name, fields); a `new` draft lacking a concept or name MUST export as `op:: comment`. When the target element hash is known, the change MUST carry `base_hash`. (Previously: the export wrote `parent_spec: "changes"` with `blueprint_version: "0.1.0"`, and the element part could be a name or a slug.)

#### Scenario: Round trip from console to apply
- GIVEN console drafts of kind `correction`, `delete` and `new` against a fixture domain
- WHEN they are exported, parsed with `parseChangeset` and applied with `applyChange`
- THEN every change resolves its target and applies without a resolution error

#### Scenario: Export is a valid L3 changeset with slug targets
- GIVEN a correction draft on an element whose slug is `vision` and whose name is `Our Vision`
- WHEN the changeset is exported
- THEN its frontmatter has `level: 3` and `parent_spec.name: changes`
- AND the change `target` is `<model>@vision&<field>`, not `<model>@Our Vision&<field>`
