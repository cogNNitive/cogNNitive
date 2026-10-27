# on-demand-blueprint-hydration Specification

## Purpose
TBD - created by archiving change on-demand-blueprint-distribution. Update Purpose after archive.
## Requirements
### Requirement: Catalog-Driven Remote Blueprint Retrieval

When a blueprint is requested via `hydrate_blueprint` (in `@cognnitive/innfo-mcp` / `@cognnitive/innfo-core`) or `skills-manager.js install --blueprint <name>`, and the blueprint is not present in the embedded Core registry or local `~/.agents/bluepriNNts/<name>/` cache, the system MUST resolve the blueprint entry from `catalog.json` and fetch the blueprint package on demand via `fetchBlueprintPackageFromRemote`, persisting the extracted package under `~/.agents/bluepriNNts/<name>/`.

#### Scenario: Hydrating an uncached free catalog blueprint fetches and caches it locally
- **GIVEN** optional blueprint ` architecture` or vertical `<name>` is listed in `catalog.json` with `access: "public"` and is not present in `~/.agents/bluepriNNts/<name>/`
- **WHEN** an agent invokes `hydrate_blueprint` for `<name>` or runs `skills-manager.js install --blueprint <name>`
- **THEN** the system fetches the blueprint package from its pinned remote release ref in `catalog.json`
- **AND** caches the blueprint files under `~/.agents/bluepriNNts/<name>/` before completing hydration

#### Scenario: Offline hydration of an uncached catalog blueprint returns an actionable diagnostic
- **GIVEN** a catalog blueprint `<name>` is not cached locally and network access is unavailable
- **WHEN** `hydrate_blueprint` is invoked for `<name>`
- **THEN** the operation fails with an actionable diagnostic instructing the user to connect to the network or pre-install via `skills-manager.js install --blueprint <name>`

---

### Requirement: Bearer-Token Authentication and Header Redaction

When fetching a catalog blueprint whose `access` requires authentication (or when user credentials are provided), `fetchBlueprintPackageFromRemote` MUST attach an `Authorization: Bearer <token>` HTTP header resolved from the `COGNNITIVE_TOKEN` environment variable or `~/.agents/credentials.json`. All error messages, console output, and diagnostic logs MUST redact the `Authorization` header and raw token value.

#### Scenario: Authenticated fetch succeeds with token from environment or credentials file
- **GIVEN** a catalog blueprint with restricted/paid `access` and a valid token in `COGNNITIVE_TOKEN` or `~/.agents/credentials.json`
- **WHEN** `fetchBlueprintPackageFromRemote` requests the remote blueprint archive
- **THEN** the request includes `Authorization: Bearer <token>` and downloads the package

#### Scenario: Failed authenticated fetch redacts token in diagnostics
- **GIVEN** a remote fetch with an `Authorization: Bearer <token>` header fails with HTTP 401 or 403
- **WHEN** the error diagnostic is formatted and returned to the caller or logged
- **THEN** the raw token value MUST NOT appear in any error message, stack trace, or log output

---

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

