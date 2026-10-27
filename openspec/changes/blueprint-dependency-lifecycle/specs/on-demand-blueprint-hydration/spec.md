# Delta for on-demand-blueprint-hydration

## ADDED Requirements

### Requirement: Catalog Release Tag Contains The Entry Content

For each catalog entry, `release_tag` MUST name a ref that contains that entry's current content. Fetching the entry at `release_tag` MUST yield content matching the adopted version. The catalog check MUST remain deterministic.

#### Scenario: Release tag contains the content
- GIVEN a catalog entry with a content version V
- WHEN the entry is fetched at its `release_tag`
- THEN the fetched content matches V

#### Scenario: Unreleased entry has no tag and is refused
- GIVEN a catalog entry whose content matches no `blueprints-v*` tag
- WHEN the catalog is generated
- THEN its `release_tag` is `null`
- AND `install --blueprint <name>` refuses with "not yet released"
- AND `status` shows it as `unreleased`, not `outdated`

#### Scenario: Check is deterministic
- GIVEN an unchanged repository
- WHEN the catalog check runs twice
- THEN both runs produce identical results

### Requirement: Catalog Resolves From The Published URL When Not Repo-Local

The skills manager MUST resolve `catalog.json` from the published URL when the repo-relative catalog file does not exist. A manager installed outside the repository MUST be able to run `install --blueprint <name>`.

#### Scenario: Installed manager falls back to the URL
- GIVEN a manager run from `~/.agents/` with no repo-relative catalog
- WHEN `install --blueprint video-script` runs
- THEN the catalog is fetched from the published URL
- AND the blueprint content matches the adopted version

#### Scenario: Catalog unreachable
- GIVEN no repo-local catalog and no network
- WHEN `install --blueprint <name>` runs
- THEN it fails with a diagnostic naming the catalog URL

## MODIFIED Requirements

### Requirement: Embedded Skill Projection Upon On-Demand Hydration

`skills-manager.js install --blueprint <name>` MUST be the only writer of embedded skills. It MUST project `<bp>/skills/*` into `~/.agents/skills/<skill-name>/`, create the agent junctions, and record state. `hydrate_blueprint` MUST NOT project skills, create junctions or write state; it MUST return the exact `install --blueprint <name>` command for the user to run.
(Previously: both `hydrate_blueprint` and `skills-manager.js install --blueprint` projected embedded skills, and MCP hydration wrote no state or junctions.)

#### Scenario: CLI install projects and records
- GIVEN catalog blueprint `<bp>` contains embedded skill `<bp>/skills/nn-domain-helper`
- WHEN `skills-manager.js install --blueprint <bp>` runs
- THEN `nn-domain-helper` is projected into `~/.agents/skills/nn-domain-helper/`
- AND junctions and a state entry exist for it

#### Scenario: MCP hydration reports the command
- GIVEN a blueprint with embedded skills
- WHEN `hydrate_blueprint` runs for it
- THEN no directory under `~/.agents/skills/` is written and no state entry is created
- AND the response contains the exact `install --blueprint <bp>` command
