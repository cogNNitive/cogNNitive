# MCP Bridge Specification

## Purpose

Define how actioNN consumes the `innfo-mcp` Model Context Protocol server published by the iNNfo repo: where the downloaded bundle and its version record live on disk, how the version to download is resolved and pinned, and how skills that need the MCP fall back to the local bundle when the live MCP tool is unavailable.

## Requirements

### Requirement: Bundle Storage Location

The downloaded `innfo-mcp` bundle MUST be stored at `.cogNNitive/mcp-bundle.js`, relative to the actioNN repo root — the same state directory that already holds `mcp-version.json` and the skill registry.

#### Scenario: Bundle written after a successful download

- GIVEN `scripts/update-mcp.js` determines an update is available
- WHEN the download completes
- THEN the bundle MUST be written to `.cogNNitive/mcp-bundle.js`
- AND no bundle file MUST be written under `scripts/bin/` or any other location

### Requirement: Installed Version Record

The currently installed `innfo-mcp` version MUST be recorded at `.cogNNitive/mcp-version.json`, as a JSON object with at least a `version` field (the manifest's `latest` value, e.g. `"v0.2.1"`) and an `updated_at` ISO-8601 timestamp.

#### Scenario: Version file updated after a successful download

- GIVEN a bundle download completes successfully
- WHEN `scripts/update-mcp.js` finishes
- THEN `.cogNNitive/mcp-version.json` MUST contain the newly installed `version` and a fresh `updated_at` timestamp

#### Scenario: Version file left untouched when no update is needed

- GIVEN the manifest's `latest` value equals the `version` already recorded in `.cogNNitive/mcp-version.json`
- WHEN `scripts/update-mcp.js` runs
- THEN no download MUST occur
- AND `.cogNNitive/mcp-version.json` MUST NOT be rewritten

### Requirement: Version Resolution via Manifest

The updater MUST NOT download an unpinned `main`-branch bundle. It MUST first fetch `https://innfo.cognnitive.com/cdn/manifest.json` — the same production CDN manifest consumed by `iNNfo/scripts/innfo-mcp.sh` and `innfo-mcp.ps1` — read its `latest` field (a string already carrying the `v`-prefixed version, e.g. `"v0.2.1"`), and use that exact string — unmodified — as the version segment when constructing the bundle download URL. The updater MUST NOT resolve the manifest from any other host (e.g. `raw.githubusercontent.com`): a GitHub-raw mirror of `docs/cdn/` can lag or diverge from the production CDN and would silently break the parity this requirement guarantees.

#### Scenario: Bundle URL built from the resolved version

- GIVEN the manifest reports `"latest": "v0.2.1"`
- WHEN the updater builds the download URL
- THEN it MUST request `https://innfo.cognnitive.com/cdn/innfo-mcp-v0.2.1.bundle.js`

#### Scenario: Update skipped when local version matches manifest

- GIVEN the local `.cogNNitive/mcp-version.json` records `version: "v0.2.1"`
- AND the manifest reports `"latest": "v0.2.1"`
- WHEN the updater compares them
- THEN it MUST treat the installation as up to date and skip the download, using the same string-equality comparison (after stripping an optional leading `v` from each side) as `iNNfo/scripts/innfo-mcp.sh` and `innfo-mcp.ps1`

### Requirement: Offline / Network Failure Fallback

If the manifest or bundle cannot be fetched (offline, DNS failure, non-200 response), the updater MUST NOT crash the calling process. It MUST log the error, and:

- If `.cogNNitive/mcp-bundle.js` already exists, proceed using that cached bundle.
- If no cached bundle exists, emit a clear warning that no local `innfo-mcp` bundle is available.

#### Scenario: Network failure with an existing cached bundle

- GIVEN `.cogNNitive/mcp-bundle.js` exists from a previous successful download
- AND the manifest fetch fails (e.g. no network)
- WHEN `scripts/update-mcp.js` runs
- THEN it MUST log the fetch error, then proceed using the cached bundle without raising

#### Scenario: Network failure with no cached bundle

- GIVEN `.cogNNitive/mcp-bundle.js` does not exist
- AND the manifest fetch fails
- WHEN `scripts/update-mcp.js` runs
- THEN it MUST emit a warning that no local bundle is available

### Requirement: Skill-Level Fallback Path Consistency

Any skill that checks for a local `innfo-mcp` bundle as a fallback when the live MCP tool (`innfo-mcp_list_models` or equivalent) is unavailable MUST check `.cogNNitive/mcp-bundle.js`, relative to the actioNN repo root — the same path `scripts/update-mcp.js` writes to. Skills MUST NOT reference a user-home path (e.g. `~/.agents/mcp/innfo-mcp.bundle.js`) that the updater never populates.

#### Scenario: Preflight fallback check

- GIVEN `innfo-mcp_list_models` is unavailable during a Tier 1 preflight check
- WHEN `nn-preflight` falls back to checking for a local bundle
- THEN it MUST check `.cogNNitive/mcp-bundle.js`

#### Scenario: Router fallback check

- GIVEN `innfo-mcp` responsiveness cannot be verified during `nn-router`'s environment readiness gate
- WHEN it falls back to checking for a local bundle
- THEN it MUST check `.cogNNitive/mcp-bundle.js`
