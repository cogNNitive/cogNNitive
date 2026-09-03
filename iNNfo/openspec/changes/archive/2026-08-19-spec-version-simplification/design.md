# Design: Spec Version Simplification

## Post-Implementation Correction (2026-08-19)

A5/A6 below specify `DEFAULT_INNFO_VERSION` → `V_0-3-0` and L1/L0 filenames
`iNNfo_V_0-3-0_NN.md` / `defiNNe_V_0-2-0_NN.md`. That is **not** what shipped, and
the shipped state is the correct one: `specs/iNNfo_V_0-1-0_NN.md` and
`specs/defiNNe_V_0-1-0_NN.md`, with `DEFAULT_INNFO_VERSION = 'V_0-1-0'` in
`constants.ts`. The old `V_0.2.x`/`V_0.3.0` numbers tracked the pre-simplification
scheme (folder snapshots + `latest/` alias); under the new immutable
filename-encoded scheme they'd assert a release history that never existed for
this layout — exactly the same reasoning A6 already gives for resetting the L2
templates to `V_0-1-0` instead of carrying `V_0-2-0`/`V_0-2-1` forward. Applying
that reasoning consistently, L0/L1 reset too. Treat every `V_0-3-0`/`V_0-2-0`
reference below as historical intent, superseded by `V_0-1-0`.

## Technical Approach

Make immutability structural: every spec artifact is addressable only by a versioned filename, so the L2 tree is `specs/templates/{name}/{name}_V_x-y-z_NN.md` and L0/L1 sit flat in `specs/`. Consumers then need exactly one URL strategy (main branch + versioned filename), because the *file name* is the pin — not the git ref, not a folder snapshot, not a `latest/` alias. The D3 badge is a read-only observer over that naming rule; it never mutates anything.

## Architecture Decisions

| # | Decision | Choice | Rejected | Rationale (verified) |
|---|---|---|---|---|
| A1 | Badge detection | Scan the resolver's own search dirs (`specs/`, `.specs/`, `.spec-cache/`) for `{templateName}_V_*_NN.md`, union with a bundled `SHIPPED_TEMPLATE_VERSIONS` map in `config/samples.ts`; badge fires when `max(found) > pinned` (triple compare on the `V_x-y-z` parsed from `parent_spec.name`) | Published `versions.json` / `INDEX.md`; GitHub API listing | A published index is a mutable alias — exactly what this change deletes. Scaffolding already writes templates into a flat workspace `specs/` (`useWorkspaceScaffolding.ts:206-227`), so a newer file physically appears there; zero network, zero false positives |
| A2 | Badge host | `components/editor/ModelInfoPanel.vue` (already imports `buildSpecificationUrl` at L524 and renders spec identity) + new `composables/useTemplateVersionNotice.ts` | Header.vue, LeftSidebar | Keeps detection pure/testable and the badge next to the existing parent-spec display |
| A3 | Migration mechanics | The `innfo:` prompt drives a **file-level** migration: read model → `get_template(new url)` → write a NEW file with major `model_version` bump and rewritten `parent_spec.name`/`url` → `validate_model` → original untouched | Reuse `apply_change op=bump_version` (`mutate.ts:220-342`) | That op renames by `rm(filePath)` (L341) and `rm(oldParentPath)` (L327), deleting both the old model **and** the published template. It contradicts R-VM-05 ("original MUST NOT be deleted") and this change's immutability rule. Its `parent_spec.name` regex (L271-274) is the *pattern* to mirror, not code to call |
| A4 | `_ensureGeneralSpec` URL | One strategy: `https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_{version}_NN.md` | Tag-pinned; `models/specs/` | The version now lives in the filename, so `main` is already content-pinned. Tag pinning fails for any spec version without a release tag — the reason the 3-URL chain existed |
| A5 | Constants | `buildSpecificationUrl` → flat main URL; `buildSpecificationUrlFromMain` **deleted** (callers switch); `buildDocumentationLocation` **deleted** (grep: zero call sites); add `buildTemplateUrl(name, version)`; `DEFAULT_INNFO_VERSION` → `V_0-3-0` | Rewriting all three | Rewriting a dead export is churn inside a diff already over budget |
| A6 | Initial `template_version` | `V_0-1-0` for all four (business, procedures, organization, projects) | Carrying `V_0-2-0`/`V_0-2-1` forward | Those filename versions encoded **L1 compliance**, not template identity (G1). Reusing them would assert a release history the templates never had, and `DEFAULT_TEMPLATE_VERSION` is already `V_0-1-0`. L1/L0 keep their real versions: `iNNfo_V_0-3-0_NN.md`, `defiNNe_V_0-2-0_NN.md` |
| A7 | `specializes` | Documented in the L1 spec body only; **not** emitted in any template frontmatter | Emitting `specializes: null` | Reserved-but-unimplemented keys invite parser handling for a field nothing reads |
| A8 | Procedures extension | **Relocate** `specs/v0.2.0/level2/procedures/extension/` → `apps/innfo-editor/src/extensions/procedures/` | Delete with `specs/v0.2.0/` (proposal's assumption) | **Correction:** it has two live consumers — `extensions/registry.ts:3` (manifest import) and `extensions/procedures/useProcedureFSM.ts:1` (re-export shim), feeding `GuidedProcedureView.vue`. Deleting it breaks the build |

## Data Flow

    ModelInfoPanel ──→ useTemplateVersionNotice ──→ scan specs/|.spec-cache/
          │                     │                   + SHIPPED_TEMPLATE_VERSIONS
          │                     ▼
          └──── badge ◄── newerVersion? ──→ innfoPrompt(migrationPrompt)
                                                     │
                                            clipboard → OpenCode → nn-innfo

## File Changes

| File | Action | Description |
|---|---|---|
| `specs/latest/level{0,1}/*_NN.md` | Move | → `specs/iNNfo_V_0-3-0_NN.md`, `specs/defiNNe_V_0-2-0_NN.md` |
| `specs/latest/level2/{business,procedures,organization,projects}/` | Move | → `specs/templates/{name}/{name}_V_0-1-0_NN.md` + `samples/` verbatim |
| `specs/latest/level2/projects/extension/*` | Move | → `apps/innfo-editor/src/extensions/projects/` (overwrites the shim) |
| `specs/v0.2.0/level2/procedures/extension/*` | Move | → `apps/innfo-editor/src/extensions/procedures/` (A8) |
| `specs/latest/`, `specs/v0.2.0/`, `specs/v0.2.1/`, `specs/CHANGELOG.md`, `models/specs/` | Delete | Remainder after the moves, incl. `businessV2`/`cogNNitive`/`biz` (D2) |
| `apps/innfo-editor/src/extensions/registry.ts` | Modify | Manifest imports → `./procedures/manifest.json`, `./projects/manifest.json` |
| `.../utils/constants.ts` | Modify | A5 |
| `.../config/samples.ts` | Modify | `SAMPLE_BASE` → `specs/templates`; add `SHIPPED_TEMPLATE_VERSIONS` |
| `.../stores/workspaceStore.ts` | Modify | `_ensureGeneralSpec`: 3 URLs → 1 (A4) |
| `.../ai-guide/guide.ts` | Modify | 4th `innfo:` prompt (template migration) |
| `.../composables/useTemplateVersionNotice.ts` | Create | Detection + prompt assembly |
| `.../components/editor/ModelInfoPanel.vue` | Modify | Passive badge + Copy button (reuses `AIGuidePanel.vue:197` clipboard pattern) |
| `apps/innfo-editor/vite.config.ts` | Modify | `serveLocalSpecs` root `specs/latest` → `specs`, mount `/specs` |
| L2 template frontmatter (×4) | Modify | Add `template_version: "V_0-1-0"`; `specification_url`/`parent_spec.url` → new paths |
| Shipped samples (×4) `parent_spec.url` | Modify | Pin to `specs/templates/{name}/{name}_V_0-1-0_NN.md` |
| `docs/documentation/innfo-editor.md:47-49`, `SKILL.md`s, `scripts/check-spec-version.mjs`, `openspec/specs/{spec-resolution,local-spec-resolution-cache}/spec.md` | Modify | Path shapes + residual scope |

## Interfaces / Contracts

```yaml
# L2 template frontmatter (added key)
template_version: "V_0-1-0"   # this template's own immutable identity; bump ⇒ new file
```

```ts
// composables/useTemplateVersionNotice.ts
export interface TemplateVersionNotice { current: string; latest: string; prompt: string }
export function useTemplateVersionNotice(): ComputedRef<TemplateVersionNotice | null>
```

Prompt (via `innfoPrompt()`): *"My model `{file}` pins `{template}_{current}`, but `{template}_{latest}` exists. Migrate it: create a NEW file with `model_version` bumped one MAJOR, rewrite `parent_spec.name`/`url` to `{latest}`, map any renamed concepts/fields, then run `validate_model`. Do NOT edit or delete the original file, and do NOT modify anything under `specs/`."*

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | Version compare, scan→`latest` selection, prompt text, `buildSpecificationUrl`/`buildTemplateUrl` | Vitest, fake `DirectoryHandleLike` |
| Integration | Badge visible/absent in `ModelInfoPanel`; `_ensureGeneralSpec` single fetch | Vitest + mocked `fetch` |
| Resolution | Every shipped sample resolves via R-LSR-01 against the new tree | `validate_model` over `specs/templates/**/samples/*` |
| Build | Gantt + Guided Procedure views still mount | `typecheck` + existing app tests |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Clipboard write is user-initiated and already shipped.

## Migration / Rollout

One PR, three ordered commits (D4): **(1) pure moves** — `git mv` only, no content edits (delete the two re-export shims first so the moves can land on their paths); **(2) deletions** — the four trees plus `specs/CHANGELOG.md`; **(3) content edits** — frontmatter, URLs, app code, docs, specs. Splitting rename from edit keeps commit 1 readable as renames while the PR stays atomic. No commit leaves both trees present. Rollback = revert the PR.

## Open Questions

None blocking.
