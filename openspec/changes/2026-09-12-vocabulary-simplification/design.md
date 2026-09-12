# Design: Vocabulary Simplification — canonical term dictionary + `template` → `app` (user-facing)

## Technical Approach

Vocabulary-first with identifiers stable, per the proposal. Deliver the canonical dictionary as a machine-readable map (`iNNfo/specs/vocabulary.json`) + docs page, then apply a **sense-scoped, manual** user-facing copy pass (`template` → `app`) across editor labels, catalog titles, docs prose, and skill copy. All resolution-bearing identifiers remain byte-identical. Apply is sequenced after the sibling `2026-09-12-templates-consoles-and-procedures-ecosystem` archives.

Sense scoping is critical: only the **L2-schema sense** of "template" is renamed. The pass is manual (editor-assisted, never regex-blind) because 4 senses coexist in the same files.

## Architecture Decisions

| Decision | Tradeoff | Chosen |
|----------|----------|--------|
| Rename scope | user-facing only vs full identifier migration | User-facing only; identifiers stable (proposal out-of-scope) |
| Dictionary format | doc-only vs machine-map-only vs both | Both (`vocabulary.json` + `docs/innfo/documentation/vocabulary.md`) |
| Rename mechanism | regex-blind vs sense-scoped manual | Sense-scoped manual pass (4 senses coexist; `<template>` + `traNNsformations/` excluded) |
| Catalog titles | hand-edit vs regenerate | Change `title:` in specs, regenerate via `template-catalog.mjs` (titles are derived) |
| Apply sequencing | parallel vs after sibling | After sibling archives (touches dirty `catalog.json`/`spec_NN.md`) |

### Decision: `vocabulary.json` schema

**Choice**: Single JSON under `iNNfo/specs/vocabulary.json` keyed by canonical term, with `aliases`, `sense`, and `planned_migrations` per entry. Consumer = editor labels + skill copy (read-only).
**Alternatives**: YAML frontmatter block in AGENTS.md only (not machine-consumable); docs-only (no UI driver).
**Rationale**: Matches proposal's "both" decision; JSON is trivially importable by the editor and by skill scripts; mirrors `catalog.json` precedent (generated/managed artifact).

```json
{
  "version": "V_0-1-0",
  "terms": {
    "app": {
      "canonical": true,
      "aliases": ["template"],
      "sense": "Level-2 schema (_spec_NN.md pinned by parent_spec)",
      "excludes": ["traNNsformations", "vue-sfc-template", "generic-english"],
      "stable_identifiers": ["specs/templates/", "template_version", "get_template", "templates:", "templates-v*", "SHIPPED_TEMPLATE_VERSIONS"],
      "planned_migrations": ["specs/templates/ -> specs/apps/", "MCP tool names", "manifest templates: key", "templates-v* tags"]
    }
  }
}
```

## Data Flow

```
spec_NN.md title: "X App"  ── template-catalog.mjs ──>  catalog.json (titles)
vocabulary.json  ── editor label lookup ──>  HomeView / SampleBanner / ValidationReport copy
AGENTS.md glossary  ── docs generation ──>  docs/innfo/documentation/vocabulary.md
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `iNNfo/specs/vocabulary.json` | Create | Canonical dictionary (terms/aliases/senses/stable ids/planned migrations) |
| `docs/innfo/documentation/vocabulary.md` | Create | Human-readable dictionary page |
| `iNNfo/AGENTS.md` | Modify | Glossary block: `app` canonical, `template` deprecated alias |
| `iNNfo/specs/templates/{13}/spec_NN.md` | Modify | `title: "X Template"` → `"X App"` (sequenced) |
| `iNNfo/apps/innfo-editor/src/views/HomeView.vue` | Modify | "Creating Models from Templates" → "…Apps"; sample card copy |
| `iNNfo/apps/innfo-editor/src/components/layout/SampleBanner.vue` | Modify | "…template…" → "…app…" |
| `iNNfo/apps/innfo-editor/src/components/ValidationReport.vue` | Modify | `Template:` label → `App:` (keep `template_name` field identifier) |
| `iNNfo/apps/innfo-editor/src/components/layout/WorkspaceIntegrityNotice.vue` | Modify | User-facing "template" → "app" (identifiers unchanged) |
| `actioNN/skills/nn-innfo/SKILL.md` | Modify | L2-sense copy → app (~70 hits; `bundled_templates` identifier unchanged) |
| `actioNN/skills/nn-trannsform/SKILL.md` | Modify | L2-sense only; `traNNsformations/` sense untouched |
| `.agents/skills/nn-template-audit/SKILL.md` | Modify | Audit copy: L2-sense → app |
| `docs/**`, `iNNfo/USE_AI.md` | Modify | Conceptual prose → app (identifiers verbatim) |
| `_NN/models/cogNNitive_backlog_V_0-1-6_backlog_NN.md` | Modify | New work item: future identifier migration |
| `iNNfo/specs/templates/catalog.json` | Regenerate | `template-catalog.mjs` after title changes |

**Not renamed (byte-identical):** `specs/templates/` paths, `spec_url`, `parent_spec.url`, `template_version`/`template_name` fields, MCP tool names, manifest `templates:`/`ref_key: templates`/`templates-v*` tags, `SHIPPED_TEMPLATE_VERSIONS` keys, `?createTemplate=` query, Vue `<template>` blocks, `traNNsformations/`.

## Interfaces / Contracts

- `vocabulary.json` — single source for canonical terms. Editor label lookup reads it read-only; skill copy passes reference it. Schema above.
- No MCP, manifest, or resolver contract changes.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `vocabulary.json` well-formed + each stable identifier listed | Node assert test (pattern: `test-*.js`) |
| Unit | Catalog regeneration drift | `node scripts/template-catalog.mjs --check` |
| Integration | `verify.js` green (no inventory/immutability drift) | `npm --prefix iNNfo run verify`-adjacent gates |
| E2E | Editor still renders models pinned to templates | existing editor test suite (663) — labels-only change must not break |
| Guard | No identifier renamed by accident | grep guard: `template_version|templates/|get_template` still present |

## Migration / Rollout

No data migration. Deprecation window: `template` remains a documented alias for one release; this change only flips user-facing copy. Apply requires the sibling change archived first.

## Open Questions

- [ ] Scope pin for the element-vocabulary audit (Part 3): confirm L2 concept names + Ghostbusters samples only, no MCP tool rename proposals in this change.