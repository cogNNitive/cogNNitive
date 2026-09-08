# Proposal: Workspace Progressive-Disclosure Index

## Intent

An agent (or a person) entering a workspace today has one navigational entry point: `workspace_NN.md`, the Level-3 manifest that conforms to `workspace_spec_NN.md` (`template_version: V_0-3-0`). It lists every Model, Source, Procedure, Artifact and Tag in a single flat file, and each entry carries structural and provenance fields (`path`, `template`, `status`, `author`, `derived_from`, `generated_by` for Models; the raw/normalized fields for Sources) — but **no human-or-agent-readable summary of what each entry contains**.

Consequences for retrieval:

- To decide whether `models/business_V_0-1-0_business_NN.md` is relevant, the agent must open it. The manifest cannot answer "what is this".
- The manifest grows linearly with the workspace. A large, nested workspace forces the agent to load the whole inventory, or fall back to `glob` + frontmatter parsing of every file, to answer a scoped question.
- There is no per-folder view. Everything hangs off the root.

Google's Open Knowledge Format (OKF v0.2, `GoogleCloudPlatform/knowledge-catalog`, `okf/SPEC.md`) addresses exactly this with a reserved `index.md` per directory: no frontmatter (the bundle-root file may carry `okf_version`), a body of grouped sections, each line `* [Title](relative-url) - short description`. It is explicitly optional and synthesizable. Its stated purpose is **progressive disclosure — navigating one hierarchy level at a time without loading the entire bundle into context**.

iNNfo's provenance vocabulary already maps almost one-to-one onto OKF's trust/provenance families (`generated_by` ↔ `generated`, `derived_from` ↔ `sources`, `status` ↔ `status`, the `verified` marker ↔ `verified`). The gap is navigational, not semantic.

Goal: give a workspace a generated, per-folder progressive-disclosure index, driven by an authored one-line `summary` on each Model and Source, with the root index carrying `okf_version` so the same artifact is consumable by OKF tooling at no extra cost.

## Scope

### In Scope

- **`workspace_spec_NN.md`**: add a `summary` field (`type: string`, one-sentence intent) to the **Models** and **Sources** concepts. New template version (`V_0-4-0`), new write-once spec file — it does not edit any published `_V_x-y-z_` spec.
- **`innfo-core`**: a platform-neutral `buildWorkspaceIndex(...)` builder taking injected ports (folder walk, manifest parse) and returning the per-folder index tree as data — no file I/O of its own, so Node and the browser supply their own.
- **`innfo-mcp`**: a new tool that writes/refreshes the generated `index.md` sidecars from the manifest + folder walk. Read-mostly except for writing the sidecars themselves; it must never touch an authored file.
- **Generated `index.md` sidecars**: one per workspace folder that contains Models or Sources, plus a root `index.md`. OKF body shape (`# Section` / `* [Title](rel-path) - summary`). Each file carries a generated-by header comment and is never hand-edited. The root file carries `okf_version`.
- **`summary` source of truth**: the workspace manifest entries. Where an entry has no `summary`, the generator falls back to the target file's frontmatter `title`, and marks the line as summary-less rather than inventing text.
- **Validation hook**: `workspace-integrity-check`'s `check_workspace` gains an `indexStale` field — the generated index no longer matches the manifest. Informational, non-blocking, consistent with that change's passive-notice rule.

### Out of Scope

- Full OKF conformance — chunking boundaries, bundled embeddings, `log.md`. This change delivers the `index.md` + `okf_version` only.
- LLM-authored summaries. The generator never writes prose; `summary` is authored by a human or the modelling agent at model-creation time.
- Changing iNNfo's own `# NN index` wikilink block or the `## NN <Concept>: <name>` entry convention. The generated `index.md` is a sidecar, not an iNNfo document, and is never parsed as one.
- A search/retrieval tool. This change makes fast retrieval *possible*; it does not build the consumer.
- Editor UI for browsing the index — a later slice; the first cut is manifest + `innfo-core` + `innfo-mcp`.
- Auto-migration of existing workspaces to `V_0-4-0` — remains the consent-gated `nn-upgrade` path.

## Capabilities

### New Capabilities

- `workspace-progressive-disclosure-index`: a generated, per-folder navigation layer over a workspace — OKF-shaped `index.md` sidecars produced from the manifest and an authored one-line `summary` per Model and Source, enabling an agent to descend only the relevant branch instead of loading the whole inventory. The root sidecar is OKF-consumable via `okf_version`.

### Modified Capabilities

- `workspace-manifest` (the `workspace_spec` schema): Models and Sources gain an optional `summary` string. Existing fields and the Level-3 template shape are preserved; `summary` is additive and absence is tolerated.
- `workspace-integrity-check` (depends on that change): the consolidated report gains an `indexStale` per-workspace signal. No new failure class — staleness is a "regenerate" hint, not an error.

## Approach (non-binding — exact shape decided in spec/design)

1. Spec-first: add `summary` to Models and Sources in a new `workspace_spec` `V_0-4-0`; register the new template version in `manifest/source.yaml` (Template Inventory Guard) and the template catalog.
2. `innfo-core`: `buildWorkspaceIndex({ walkFolders, parseManifest })` → returns `{ folder, entries: [{ title, relPath, summary | null, kind, status }] }[]` plus the root aggregate. Pure; no `fs`.
3. `innfo-mcp`: new tool — call the builder with the Node ports, render each node to OKF markdown, write `index.md` per folder (root gets `okf_version`), report what changed. Never write outside `index.md` sidecars.
4. Wire `indexStale` into `check_workspace` (after `workspace-integrity-check` slices 2+ land): compare the on-disk sidecars against a fresh build.
5. Document the sidecar contract in the `nn-innfo` SKILL and the workspace spec philosophy section.

**Sidecar shape (INTENT):**

```markdown
<!-- generated by innfo — do not edit; run `build_workspace_index` to refresh -->

# Models

* [Core Business Model](business_V_0-1-0_business_NN.md) - Revenue, cost and channel structure for the launch entity.

# Sources

* [Interview Transcript](../sources/nn/interview.md) - Founder interview, 2026-09-06, on pricing assumptions.
```

Root `index.md` adds `okf_version` as its only frontmatter.

## Resolved Decisions

Settled in this conversation with the requester:

1. **The `summary` field on Models and Sources is part of this change** — not deferred, not split out.
2. **Retrieval is the driver.** Agent response speed and precision of finding relevant information. OKF interoperability is a near-free by-product (`okf_version` on the root sidecar), not the goal.
3. **The index is generated, never authored.** No second inventory to keep in sync by hand; the manifest stays the single source of truth. Drift is surfaced by `check_workspace`, fixed by regeneration.
4. **The generator does not invent summaries.** Missing `summary` degrades to a title-only line.

## Deferred Decisions — to be resolved in the SDD design phase

All four are explicitly deferred to `design`. None blocks committing this proposal or moving to `spec`.

1. **Sequencing vs other changes** — *resolved by events.* `2026-09-07-agent-modifications-source-provenance` archived (`570c36e`) without adding a `summary` field to the Sources concept; it reworked the source normalization pipeline only. No coordination target, no write-once collision. This change bumps `workspace_spec` `V_0-3-0 -> V_0-4-0` on its own and owns `summary` on both Models and Sources. Design only confirms the ordering relative to `2026-09-07-workspace-integrity-check` slices 2+.
2. **Threshold / opt-in** — for a small flat workspace the sidecars are overhead. Design decides whether the generator no-ops below a size threshold or always runs.
3. **Orphan files** — a Model file on disk but absent from the manifest: design decides list-title-only vs omit.
4. **Editor involvement** — design decides regenerate on `workspaceStore.open()` now vs a later slice.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/workspace_spec_NN.md` (+ versioned package) | New version | `summary` on Models and Sources; `V_0-4-0` write-once spec |
| `manifest/source.yaml` + template catalog | Modified | Register `workspace_spec` `V_0-4-0` (Template Inventory Guard) |
| `iNNfo/packages/innfo-core/src/` (+ specs) | New | `buildWorkspaceIndex` pure builder |
| `iNNfo/packages/innfo-mcp/src/tools/` | New | Tool that writes the `index.md` sidecars |
| `iNNfo/packages/innfo-mcp/src/server.ts` | Modified | Register the tool; update documented tool count |
| `iNNfo/packages/innfo-mcp/src/tools/check-workspace.ts` | Modified | `indexStale` signal (after `workspace-integrity-check` lands) |
| `actioNN/skills/nn-innfo/SKILL.md` | Modified | Document the sidecar contract and `summary` authoring |
| `iNNfo/apps/innfo-editor/` | Deferred | Optional regenerate-on-open + browse UI, later slice |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Two template bumps race (`V_0-4-0` here vs a concurrent `workspace_spec` bump) | Low | Provenance change archived without a schema bump; only `workspace-integrity-check` remains active and it does not touch `workspace_spec`. Confirm at spec time. |
| Generated sidecars drift from the manifest | Med | `check_workspace` `indexStale`; regenerate-on-demand; header comment forbids hand-editing |
| Value is marginal on small flat workspaces | Med | Open Decision 2 — threshold or accept the low cost |
| `index.md` collides with a file a workspace already uses | Low | Reserved-name convention documented; generator refuses to overwrite a non-generated `index.md` |
| Sidecar mistaken for an iNNfo model by a tool or the editor | Low | No iNNfo frontmatter, generated-by comment, documented as sidecar; parsers key off `spec_version` / `level` which it lacks |
| `V_0-4-0` unreachable outside the monorepo | Med | Same catalog-reachability dependency as `workspace-integrity-check`; not re-solved here |

## Rollback Plan

Additive throughout. Removing the new `innfo-mcp` tool registration and deleting the generated `index.md` sidecars restores current behaviour. `buildWorkspaceIndex` is unused dead code until called. `summary` is an optional field — models without it stay valid; reverting the template version leaves `summary`-bearing manifests forward-compatible (unknown key tolerance). No data migration.

## Dependencies

- ~~`2026-09-07-agent-modifications-source-provenance`~~ — archived (`570c36e`) without touching the Sources schema; no longer a dependency.
- `2026-09-07-workspace-integrity-check` slices 2+ — the home for the `indexStale` signal; not a hard blocker for the manifest + `innfo-core` + `innfo-mcp` core of this change.
- `@cognnitive/innfo-core` built before `innfo-mcp` consumes it (rebuild core before MCP tests).
- A canonical, publicly reachable URL for the template catalog so `V_0-4-0` classifies outside the monorepo.

## Success Criteria

- [ ] `workspace_spec` `V_0-4-0` adds an optional `summary` string to Models and Sources without editing any published spec file.
- [ ] The `innfo-mcp` tool produces one OKF-shaped `index.md` per folder containing Models or Sources, plus a root `index.md` carrying `okf_version`.
- [ ] Every generated line is `* [Title](rel-path) - summary`, with `summary` taken from the manifest and degrading to a title-only line when absent — never invented.
- [ ] Regenerating on an unchanged workspace is a no-op (byte-identical sidecars).
- [ ] `check_workspace` reports `indexStale: true` when the manifest changed after the last generation, and never flips a failure or an exit code.
- [ ] The generator refuses to overwrite an `index.md` that lacks the generated-by header.
- [ ] An OKF consumer can read the root `index.md` and descend into the folder sidecars without iNNfo-specific parsing.

---
Size: **medium** (workspace_spec version + innfo-core builder + one innfo-mcp tool + skill docs; editor deferred). Below the 800-line review budget if the editor slice stays out; revisit if Open Decision 4 pulls it in.
