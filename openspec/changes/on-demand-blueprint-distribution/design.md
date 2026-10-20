# Design: On-Demand Blueprint & Skill Distribution

## Technical Approach
Decouple optional vertical `bluepriNNts` from core bootstrap/release governance while eliminating network redundancy across `eNNvironment`, `iNNfo`, and `actioNN`:
1. **Network Deduplication**: Memoize `(repo, ref, commit)` GitHub API checks (`checkCommitExists`, `resolveRef`, `checkReleaseProvenance`) inside `validateManifest` and cache downloaded commit tarballs by `${repo}@${commit}` across `skills-commands.js` runs.
2. **Core vs. Catalog Split**: Restrict `manifest/source.yaml` and `@cognnitive/innfo-core`'s `canonical-registry.ts` to the 7 Core `bluepriNNts` (`domaiNN`, `changes`, `sidecar`, `sources`, `artifacts`, `procedures`, `blank`) plus L0/L1 specs (`defiNNition`, `iNNfo`). Enrich `iNNfo/specs/bluepriNNts/catalog.json` via `scripts/blueprint-catalog.mjs` to govern all 12 optional vertical `bluepriNNts` (and 2 frozen legacy specs) with tier, access, release tag, and embedded skills metadata.
3. **On-Demand & Authenticated Hydration**: Extend `@cognnitive/innfo-mcp` (`list_blueprints`, `hydrate_blueprint`) and `skills-manager.js` (`install --blueprint <name>`) to merge local disk state with `catalog.json`, authenticate via Bearer token (`COGNNITIVE_TOKEN` or `~/.agents/credentials.json`), fetch packages on demand via `fetchBlueprintPackageFromRemote`, and project embedded `<bp>/skills/*` into `~/.agents/skills/` and active agent directories.

## Architecture Decisions
| Decision | Options Considered | Choice | Rationale |
|---|---|---|---|
| Blueprint Governance Split | A) Keep all 19 in `source.yaml`<br>B) Single catalog pin<br>C) 7 Core in `source.yaml` + verticals in `catalog.json` | **C** | Prevents cross-key release blockades in `assemble-manifest.js`, shrinks `innfo-mcp.bundle.js` by ~250–300 KB, and stops `nn-preflight` from halting on unused verticals. |
| Tarball Deduplication | A) Persistent disk cache<br>B) Per-invocation temp directory cache keyed by `(repo, commit)` | **B** | Zero stale-cache invalidation complexity; reduces bootstrap downloads from 27 to <= 2 per run and cleans up via `fs.rmSync` on exit. |
| Auth Token Resolution | A) MCP tool input arg<br>B) Env var `COGNNITIVE_TOKEN` -> `~/.agents/credentials.json` | **B** | Keeps tokens out of LLM prompt history and tool logs while supporting headless CI and local agent sessions. |
| CLI Orchestrator Budget | A) Add logic in `scripts/skills-manager.js`<br>B) Parse `--blueprint` in CLI, delegate to `skills-commands.js` | **B** | `scripts/verify.js` enforces `< 200` lines on `scripts/skills-manager.js` (currently 199 lines); compact flag table keeps it under limit. |

## Data Flow
```text
[Agent / CLI]
     |
     +--> list_blueprints() -----> scan local (workspace -> global -> skills)
     |                             + merge catalog.json (installed, tier, access, when_to_use)
     |
     +--> hydrate_blueprint(name) / skills-manager install --blueprint <name>
               |
               +--> 1. Check local tiers (workspace / ~/.agents/bluepriNNts)
               +--> 2. Miss: lookup entry in catalog.json (resolve release_tag & access)
               +--> 3. Resolve Bearer token (COGNNITIVE_TOKEN || ~/.agents/credentials.json)
               +--> 4. fetchBlueprintPackageFromRemote(name, ver, { repo, ref, token })
               +--> 5. hydrateBlueprintPackageAtomically -> specs/bluepriNNts/<name>/V_<ver>/
               +--> 6. Project <pkg>/skills/* -> ~/.agents/skills/<skill> & agent dirs
```

## File Changes
| File | Action | Description |
|---|---|---|
| `manifest/source.yaml` | Modify | Keep only 7 Core `bluepriNNts` (`domaiNN`, `changes`, `sidecar`, `sources`, `artifacts`, `procedures`, `blank`). |
| `scripts/manifest/lib/manifest-rules.js` | Modify | Memoize `checkCommitExists`, `checkRefResolvesInDeclaredRepo`, and `checkReleaseProvenance` by `(repo, ref, commit)`. |
| `scripts/lib/skills-commands.js` | Modify | Add session tarball cache by `(repo, commit)`; implement catalog-backed `--blueprint <name>` install + skill projection. |
| `scripts/skills-manager.js` | Modify | Parse `--blueprint <name>` and compact option parsing to stay strictly `< 200` lines; sync bundle to `nn-skills-lifecycle`. |
| `scripts/blueprint-catalog.mjs` & `iNNfo/specs/bluepriNNts/catalog.json` | Modify | Emit `tier`, `access`, `when_to_use`, `embedded_skills`, and `release_tag` per catalog entry. |
| `scripts/verify.js` | Modify | Update `checkBlueprintInventory` so every disk folder is in `source.yaml` (Core/frozen/seam) OR `catalog.json` (verticals). |
| `scripts/release/assemble-manifest.js` | Modify | Retain/require pins only for Core `bluepriNNts` declared in `source.yaml`. |
| `skills/nn-preflight/scripts/preflight-check.js` | Modify | Audit only Core `manifest.blueprints` globally; audit optional verticals only when hydrated in workspace. |
| `scripts/generate-canonical-registry.mjs` & `iNNfo/packages/innfo-core/src/schema/canonical-registry.ts` | Modify | Embed L0/L1 specs + 7 Core `bluepriNNts` (add `domaiNN`, `blank`; drop 11 verticals/frozen). |
| `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts` | Modify | Add token resolver (`COGNNITIVE_TOKEN` / `~/.agents/credentials.json`), Bearer headers with redaction, and default repo `cogNNitive/cogNNitive-web`. |
| `iNNfo/packages/innfo-mcp/src/tools/spec.ts` | Modify | Merge `catalog.json` in `listBlueprints`; add on-demand remote fetch + embedded skill projection in `hydrateBlueprint`. |

## Interfaces / Contracts
```ts
// iNNfo/specs/bluepriNNts/catalog.json entry
export interface BlueprintCatalogEntry {
  name: string
  adopted: string
  tier: 'core' | 'free' | 'paid'
  access: 'public' | 'authenticated'
  when_to_use: string | null
  release_tag: string // e.g. "blueprints-v0.5.0"
  embedded_skills: string[]
  versions: Array<{ blueprint_version: string; spec_version: string | null; title: string | null; url: string }>
}

// iNNfo/packages/innfo-mcp/src/tools/spec.ts
export interface DiscoveredBlueprint {
  name: string
  version: string
  source: 'workspace' | 'global' | 'catalog' | string
  installed: boolean
  tier: 'core' | 'free' | 'paid'
  access: 'public' | 'authenticated'
  when_to_use?: string | null
  filePath?: string
  skillName?: string
}
```
- **Auth Contract**: `resolveAuthToken()` checks `process.env.COGNNITIVE_TOKEN`, then `~/.agents/credentials.json` (`{ "token": "..." }`). On HTTP `401`/`403` or missing token for `access: "authenticated"`, throws `BlueprintAuthError` with redacted headers and setup instructions.

## Testing Strategy
| Layer | What to Test | Tool |
|---|---|---|
| Unit (`scripts/`) | Memoization call counts in `manifest-rules.test.js`; tarball cache reuse & `--blueprint` in `skills-manager.test.js`; catalog schema in `blueprint-catalog.test.mjs`. | Node test suites via `node scripts/verify.js` |
| Unit (`innfo-core`, `innfo-mcp`) | 7-Core `canonical-registry` lookup; `listBlueprints` catalog merge; `hydrateBlueprint` remote fetch, Bearer auth, 401/403 redaction, and skill projection. | Vitest (`npm test`) |
| Integration / Gates | Inventory parity (`checkBlueprintInventory`), line-count guard (`< 200`), and bundle freshness (`canonical-registry`, `skills-manager-bundle`). | `node scripts/verify.js` |

## Migration / Rollout
Existing `~/.agents/bluepriNNts/*` installs remain valid on disk. Running `skills-manager.js update` or `bootstrap` tracks the 7 Core `bluepriNNts` via `manifest.md`, while vertical `bluepriNNts` transition seamlessly to on-demand catalog hydration and Tier-3 workspace upgrade checks.

## Open Questions
- None.
