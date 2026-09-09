# Delta for documentation-template

## ADDED Requirements

### Requirement: Collaboration Git Guide Page

The `documentation_NN.md` model MUST declare a new `Page` for Git collaboration: `source:: collaboration-git.md`, `parent:: [[Guides]]`, with the next free `order` after existing Guides pages. The page content MUST be English-only. The Guides sidebar MUST list the new page. The `source` file MUST exist on disk so sidebar generation validates.

#### Scenario: Guide renders under Guides

- GIVEN the updated `documentation_NN.md` and existing `collaboration-git.md`
- WHEN the Docs site renders the Guides section
- THEN a Collaboration with Git entry appears linking to the new route

#### Scenario: Sidebar generation validates the source

- GIVEN the new `Page` declaration
- WHEN `generate-docsify-sidebar.mjs` runs
- THEN it exits zero AND the sidebar contains the new entry

#### Scenario: Missing source aborts generation

- GIVEN the `Page` declaration without its `source` file on disk
- WHEN `generate-docsify-sidebar.mjs` runs
- THEN it aborts with a nonzero code
