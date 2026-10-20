# Spec: on-demand-blueprint-hydration

## Purpose

Enable catalog-driven remote discovery, bearer-token authenticated retrieval, local caching, and embedded skill projection for optional domain/vertical `bluepriNNts` during `hydrate_blueprint` MCP calls and `skills-manager.js install --blueprint <name>` CLI operations.

## ADDED Requirements

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

When an on-demand fetched blueprint package contains `<bp>/skills/*` directories (matching its `embedded_skills` metadata in `catalog.json`), both `hydrate_blueprint` and `skills-manager.js install --blueprint <name>` MUST project those embedded skill packages into `~/.agents/skills/<skill-name>/`.

#### Scenario: Hydrating a catalog blueprint projects its embedded skills
- **GIVEN** catalog blueprint `<bp>` contains embedded skill `<bp>/skills/nn-domain-helper`
- **WHEN** `<bp>` is hydrated via `hydrate_blueprint` or installed via `skills-manager.js install --blueprint <bp>`
- **THEN** `nn-domain-helper` is projected into `~/.agents/skills/nn-domain-helper/`
- **AND** the hydration response reports the newly projected skill path
