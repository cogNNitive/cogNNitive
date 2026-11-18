# Delta for skill-catalog

Two skills answered one request: `nn-site-generator` built a site and `nn-design-presets` supplied the tokens it was styled with, and the generator only linked out to the other skill for them. This change folds the presets into `nn-site-generator` — the `presets/` and `demo/` folders move under it, its body absorbs the preset reference material, and `nn-design-presets` stops existing as a distributed skill — so a request for a site and a request for a palette resolve to the same skill.

## ADDED Requirements

### Requirement: The canonical skill set has one UI skill

The catalog MUST contain exactly one skill that covers websites and visual design, and it MUST be `nn-site-generator`.
Its frontmatter `description` MUST name the visual trigger the removed skill carried, so the description alone identifies the skill responsible for palettes, typography, spacing and branding tokens.
No other skill in `manifest/source.yaml` MUST declare `nn-design-presets`.

#### Scenario: A visual request resolves to the UI skill
- GIVEN the canonical skill catalog
- WHEN a request asks for a site and its design tokens
- THEN both resolve to `nn-site-generator`
- AND no skill named `nn-design-presets` exists in the catalog

### Requirement: The presets ship inside the UI skill

The six preset token specs MUST live in `presets/` inside the surviving skill, and the interactive showcase MUST live in its `demo/` folder.
A skill consumer MUST be able to read a preset without activating a second skill.
The surviving skill's own `SKILL.md` MUST state that applying a preset is mandatory for any visual component, web application, HTML dashboard artifact or styled page.

#### Scenario: A preset is reachable from the UI skill alone
- GIVEN the surviving `nn-site-generator` skill folder
- WHEN an agent needs the tokens of one preset
- THEN it reads `presets/<name>.md` from that folder
- AND it loads no other skill to get them

### Requirement: The docs page set and the distribution manifest name the same skills

The canonical-skill page ids in the documentation model MUST equal the skill names in `manifest/source.yaml`.
Removing a skill from the manifest MUST remove its page, its nav entry, its AI-index entry and its interaction-flow targets in the same change.
No documentation page, skill file or manifest entry MUST reference a skill name the manifest does not distribute.

#### Scenario: Removing a skill keeps the two sets equal
- GIVEN a change that drops one skill from `manifest/source.yaml`
- WHEN the docs model and the generated docs suite are compared with the manifest
- THEN every manifest skill has a page and every page maps to a manifest skill
- AND the documentation suite and the skills tree contain no reference to the removed name

### Requirement: The released skills key ships the merged skill and no longer ships the removed one

The `skills` release key MUST publish `nn-site-generator` with its `presets/` and `demo/` folders and MUST NOT publish `nn-design-presets`.
A consumer installing skills from the bootstrap manifest MUST see the merged skill and MUST NOT be offered the removed one.

#### Scenario: The distribution manifest carries the merged skill
- GIVEN the release that follows this change
- WHEN the skills tree is published to the distribution repository
- THEN `skills/nn-site-generator/presets/` exists there
- AND `skills/nn-design-presets/` does not
