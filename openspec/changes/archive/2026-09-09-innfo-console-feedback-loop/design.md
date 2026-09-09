# Design: innfo-console Feedback Loop

## Technical Approach

Introduce one shared console seam (`iNNfo/specs/templates/console/`) holding the blueprint shell, UMD runtime, and feedback schema. Thin the three reference assets onto the blueprint (slots only), gate console features via `innfo-config needs[]`, and close the reviewer loop through `import/feedback/` ingestion plus an agent-reviewed Apply Feedback procedure using existing `apply_change`/`validate_model` contracts.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| New `console/` package vs per-template runtime copies | Copies preserve locality but perpetuate 102/18/39KB duplication | New package; templates declare `needs[]` + slots only |
| UMD/IIFE `window.InnfoConsole` vs ESM/importmap | ESM is modern but breaks `file://` (CORS, `fetch`, `type=module`) | UMD only; static `<script>` tags; ban `fetch(`/`type=module`, verified by scan |
| CDN-first with vendored fallback vs CDN-only | CDN-only is smaller but offline double-click fails | Pages + jsDelivr primary, vendored `innfo-runtime.js` fallback inline-adjacent |
| `needs[]` capability gating vs feature flags in JS | Flags scatter logic; `needs[]` is declarative and template-owned | `needs: ["feedback-export"]` gates export UI; absent = dormant |
| Feedback branch in `convertOkFormat` vs separate CLI | Separate CLI duplicates walk/hash/frontmatter logic | Branch on `sources/import/feedback/*.json` inside existing scan; reuse `generateSourceFrontmatter`, hash-idempotency, archive snapshots |
| `apply_change` per-item + `validate_model` + `bump_version{patch}` vs bulk edit | Bulk edit is faster but loses provenance and rollback | One `apply_change` per accepted item (`update_field`/`rename_element`/`set_marker`), then `validate_model`, then single patch bump; abort with no bump/rewrite on failure |

## Data Flow

Reviewer console ──export JSON──→ `sources/import/feedback/` ──`--scan`──→ `sources/nn/import/feedback/` ──`sources::`──→ agent Apply Feedback ──`apply_change`──→ model ──`validate`+`bump`──→ regenerated console

```
console (localStorage drafts) ─→ feedback JSON ─→ scanner ─→ sources/nn ─→ agent ─→ innfo-mcp ─→ model V+patch ─→ stable console
                                      │                              │                │
                                 feedback.schema.json         diff preview +    validate_model
                                                              staleness check
```

Staleness: compare `meta.source_model_version` to live `model_version`; mismatch blocks until reviewer confirms.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/console/artifact_blueprint.html` | Create | Shell: `innfo-config` + `innfo-schema`/`innfo-model` slots + runtime `<script>` tags |
| `iNNfo/specs/templates/console/innfo-runtime.js` | Create | UMD `window.InnfoConsole`: hydrate, banner, suggest/edit, export modal, localStorage |
| `iNNfo/specs/templates/console/feedback.schema.json` | Create | Canonical feedback JSON schema (meta + items) |
| `iNNfo/specs/templates/business/assets/master.html` | Modify | Strip inline runtime; keep `needs[]` + slot payloads |
| `iNNfo/specs/templates/business/assets/model_viewer.html` | Modify | Same thinning; populate existing `#innfo-schema`/`#innfo-model` via blueprint |
| `iNNfo/specs/templates/metrics/assets/projections.html` | Modify | Replace CDN shell with `needs[]` + MODEL_DATA/DEPS/FORMULAS slots |
| `iNNfo/specs/templates/*/procedures/apply_feedback_NN.md` | Create | Apply Feedback procedure (staleness, preview, apply, validate, bump, regenerate) |
| `*/procedures/compile_*_NN.md`, `create_projections_NN.md` | Modify | Console-generation steps emit blueprint consoles (`{Model}_V_{v}_console.html`) |
| `actioNN/skills/nn-trannsform/scripts/lib/scanner-converters.js` | Modify | `.json` branch: `feedback/` → `convertFeedbackJson`, else structured-data `convertJson`; `convertChatJson` stays removed |
| `actioNN/skills/nn-trannsform/scripts/lib/scanner-core.js` | Modify | Emit `source_type: feedback`, `is_synthetic: true`; skip-and-report invalid JSON |
| `actioNN/skills/nn-trannsform/SKILL.md` | Modify | Document `import/feedback/` scan branch and frontmatter contract |

Package boundaries: `innfo-core`/`innfo-mcp` untouched (consume `apply_change`, `validate_model` only); no `innfo-editor` changes.

## Interfaces / Contracts

Feedback file: `{PrimaryModel}_V_{v}_{slug}_feedback_{YYYYMMDD-HHMMSS}.json`; `meta{source_model, source_model_version: V_x-y-z, artifact, artifact_version, exported_at: ISO-8601, author, feedback_slug, viewer}`, `items[]{id: fb-NNN, kind: correction|comment|new|delete, target{element_id|concept|element|field|matrix}, original?, proposed?, comment?, status: pending|applied|rejected}`. Unknown draft fields ignored.

```html
<script type="application/json" id="innfo-config">{"needs":["feedback-export"],"runtime":{"cdn":"…/innfo-runtime.js","fallback":"./innfo-runtime.js"}}</script>
<script type="application/json" id="innfo-schema">{/* reused Schema JSON Contract */}</script>
<script type="application/json" id="innfo-model">{/* reused Model JSON Contract */}</script>
```

MCP: `update_field{conceptName,elementName,fieldName,value}`, `rename_element{…,newName}`, `set_marker{…,markerName}`, `bump_version{bump:"patch"}` each with `{rationale, approved_by:"user"|"agent"}`; `validate_model` after all items.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Schema accepts valid / rejects `kind: rewrite`; slugify; `convertFeedbackJson` routing | Vitest (`iNNfo`) + Node runner (`nn-trannsform/test/unit/test-scanner.js`) |
| Integration | `--scan` ingests valid, skips invalid without abort; staleness block; abort on `validate_model` fail | Vitest + `test/test.ps1` scan fixtures |
| E2E | `file://` double-click renders offline + online; export→scan→apply→patch-bump→regenerate; no inline runtime markers | Playwright (`apps/innfo-editor`) + `file://` smoke test; `lint`, `typecheck` per step |

## Migration / Rollout

No migration. Additive package; thinned assets replace inline shells in place. Rollback: delete `*_console.html` + feedback JSONs, revert procedures, remove scan branch. Timestamped consoles are archive-only; canonical name stays `{Model}_V_{version}_console.html`.

## Open Questions (resolved 2026-09-09 with maintainer)

- [x] CDN/version pin path for `innfo-runtime.js`: primary `https://cdn.jsdelivr.net/gh/cogNNitive/cogNNitive@innfo-console-0.1.0/iNNfo/specs/templates/console/innfo-runtime.js` (tag cut at release), fallback `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/console/innfo-runtime.js`. Pre-tag dev uses `@main` + SRI hash recorded in the blueprint. Follows existing repo convention (raw + jsDelivr gh mirror).
- [x] `needs[]` registry location: `iNNfo/specs/templates/console/needs-registry.json`, versioned with the runtime — NOT `catalog.json` (machine-generated by `scripts/template-catalog.mjs`; stuffing hand-curated data there would fight the generator). Blueprint declares `needs[]`; runtime resolves pins from the registry.
