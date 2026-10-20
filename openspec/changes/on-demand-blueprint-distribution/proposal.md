# Proposal: On-Demand Blueprint & Skill Distribution

## Intent
Decouple optional domain/vertical `bluepriNNts` and skills from the core `eNNvironment` `manifest/source.yaml` bootstrap and release pipeline. Currently, bundling every vertical forces ~264 GitHub API calls per release, 27 tarball downloads during `bootstrap`/`update`, ~300 KB of unused embedded registry payloads in `@cognnitive/innfo-mcp`, and false-positive blocks in `actioNN` (`nn-preflight`). Moving optional `bluepriNNts` to catalog-driven on-demand (and authenticated/paid) hydration scales the ecosystem across `eNNvironment`, `iNNfo`, and `actioNN`.

## Scope

### In Scope
- **Release & Bootstrap Bottlenecks (`eNNvironment`)**: Memoize `(repo, ref, commit)` GitHub API checks in `scripts/manifest/lib/manifest-rules.js` and cache commit tarballs by `(repo, commit)` in `scripts/lib/skills-commands.js`.
- **Core vs. Catalog Split (`eNNvironment`, `iNNfo`, `actioNN`)**: Restrict `manifest/source.yaml` and `scripts/generate-canonical-registry.mjs` (`canonical-registry.ts` in `@cognnitive/innfo-core`) to Core `bluepriNNts` (`domaiNN`, `changes`, `sidecar`, `sources`, `artifacts`, `procedures`, `blank`). Enrich `iNNfo/specs/bluepriNNts/catalog.json` (`scripts/blueprint-catalog.mjs`) with `tier`, `access`, `embedded_skills`, and release pins. Update `scripts/verify.js`, `scripts/release/assemble-manifest.js`, and `skills/nn-preflight/scripts/preflight-check.js` so optional verticals are governed by `catalog.json`.
- **On-Demand & Authenticated Hydration (`@cognnitive/innfo-mcp`, `@cognnitive/innfo-core`)**: Merge local and catalog metadata in `list_blueprints`. Enable `hydrate_blueprint` and `skills-manager.js install --blueprint <name>` to fetch missing `bluepriNNts` on-demand via `fetchBlueprintPackageFromRemote`, project `<bp>/skills/*` into `~/.agents/skills/`, and support `Authorization: Bearer <token>` (`COGNNITIVE_TOKEN` / `~/.agents/credentials.json`).

### Out of Scope
- Payment gateway or billing backend implementation for paid tiers.
- Redesigning internal schemas of existing vertical `bluepriNNts`.

## Capabilities

### New Capabilities
- `on-demand-blueprint-hydration`: Catalog-driven remote retrieval, bearer-token authentication, and embedded skill projection during `hydrate_blueprint` and CLI installation.

### Modified Capabilities
- `manifest-governance`: Restrict `manifest/source.yaml` inventory requirements to Core `bluepriNNts` and memoize remote commit verification.
- `tag-driven-release-workflow`: Decouple optional vertical `bluepriNNts` from core release assembly gates.
- `bootstrap-workflow`: Deduplicate commit tarball downloads by `(repo, commit)` and install only Core assets by default.
- `preflight-freshness-reporting`: Ignore uninstalled optional catalog `bluepriNNts` in `nn-preflight`.
- `template-dynamic-discovery`: Merge local disk state with `catalog.json` metadata (`installed`, `tier`, `access`, `when_to_use`) in `list_blueprints`.
- `template-skill-bundling`: Project embedded `<bp>/skills/*` into `~/.agents/skills/` upon on-demand hydration.

## Approach
Deduplicate network I/O in `manifest-rules.js` and `skills-commands.js` via in-memory/temp caches. Split `bluepriNNt` governance so `manifest/source.yaml` and `canonical-registry.ts` bundle only the 7 Core `bluepriNNts` (fixing missing `domaiNN`/`blank` entries), while `catalog.json` governs optional verticals. Extend `@cognnitive/innfo-core` (`resolver-node.ts`) and `@cognnitive/innfo-mcp` (`spec.ts`) to resolve catalog entries remotely with optional Bearer auth and project embedded skills.

## Affected Areas
| Area | Impact | Description |
|---|---|---|
| `manifest/source.yaml` & `scripts/manifest/` | Modified | Core-only blueprint entries; memoized GitHub API checks. |
| `scripts/lib/skills-commands.js` | Modified | Tarball caching by `(repo, commit)`; `--blueprint <name>` install support. |
| `scripts/generate-canonical-registry.mjs` & `blueprint-catalog.mjs` | Modified | Core-only `canonical-registry.ts`; enriched `catalog.json` schema. |
| `scripts/verify.js` & `skills/nn-preflight/` | Modified | Catalog-aware inventory checks and freshness reporting. |
| `iNNfo/packages/innfo-core` & `innfo-mcp` | Modified | Authenticated remote fetch, on-demand `hydrate_blueprint`, and merged `list_blueprints`. |

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Offline failure when hydrating uncached vertical `bluepriNNt` | Med | Return actionable diagnostic guiding user to connect or pre-install via `--blueprint`. |
| Token leakage in logs during authenticated fetch | Low | Redact `Authorization` headers in all error and diagnostic outputs. |

## Rollback Plan
Revert `manifest/source.yaml`, `scripts/`, and `iNNfo/packages/` commits; regenerate `canonical-registry.ts` and `innfo-mcp.bundle.js` to restore full static embedding.

## Dependencies
- GitHub API / raw release asset endpoints for catalog `bluepriNNt` tags.

## Success Criteria
- [ ] Release verification makes <= 45 GitHub API calls; `bootstrap` downloads <= 2 tarballs per unique commit.
- [ ] `innfo-mcp.bundle.js` shrinks by ~250–300 KB and embeds all 7 Core `bluepriNNts`.
- [ ] `list_blueprints` and `hydrate_blueprint` discover, authenticate, fetch, and project skills for catalog `bluepriNNts` on demand.
