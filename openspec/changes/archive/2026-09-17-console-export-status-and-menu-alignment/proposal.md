# Proposal: Console Export Status, Stale Inspection, and Menu Alignment

## Intent
Align the iNNfo skill entry point, console compilation tooling, and ecosystem manifests with current capabilities and architectural standards:
1. **Unify and Clarify the `nn-innfo` Entry Menu**: Update [`skills/nn-innfo/SKILL.md`](skills/nn-innfo/SKILL.md) to consolidate audit and validation under `[c]`, introduce dedicated console artifact compilation under `[d]`, add documentation browsing under `[w]`, and maintain conversational wizard workflows under `[a]` and `[b]`.
2. **Upgrade Console Export CLI (`scripts/export-console.mjs`)**: Equip [`scripts/export-console.mjs`](scripts/export-console.mjs) with tree and status inspection (`--tree`, `--status`), content hashing (SHA-256) / freshness detection for stale or unbumped models, and selective export flags (`--filter`, `--stale`, `--all`).
3. **Cleanse Legacy Workflows and Manifests**: Remove the legacy `pdf-to-innfo-dashboard` workflow from [`manifest/source.yaml`](manifest/source.yaml) and purge outdated documentation references promising unsupported PDF export pipelines.

## Scope
1. **Skill Menu Alignment**:
   - Update [`skills/nn-innfo/SKILL.md`](skills/nn-innfo/SKILL.md) entry menu to:
     - `[a] (Recommended)` Create a new model (Conversational Wizard)
     - `[b]` Edit / extend an existing model (Conversational Wizard)
     - `[c]` Audit & validate model (MCP Syntax + Architecture Coherence)
     - `[d]` Export / update console artifacts (Workspace Consoles & Hub)
     - `[x]` Execute a model procedure — list procedures declared in the model and execute the chosen one
     - `[w]` View & consult documentation — browse iNNfo specs, primitives, and guides
     - `[y]` Cancel / help
   - Update downstream action handlers and active model selection gate logic in `SKILL.md` to reflect the re-mapped options `[c]`, `[d]`, and `[w]`.
2. **Console CLI Inspection & Selective Export**:
   - Enhance [`scripts/export-console.mjs`](scripts/export-console.mjs) with:
     - `--status`: Display compilation status (fresh, stale, uncompiled, version mismatch) across workspace models.
     - `--tree`: Render a hierarchical tree representation of models and their associated console artifacts.
     - `--stale`: Inspect or filter only models whose source content (SHA-256 hash or timestamp) is newer than the compiled console artifact.
     - `--filter <pattern>`: Filter models matching specific name or path substrings.
     - `--all`: Compile all discovered Level 3 models.
   - Add unit and integration tests in [`scripts/export-console.test.mjs`](scripts/export-console.test.mjs) under strict TDD.
3. **Manifest & Documentation Cleanup**:
   - Remove `pdf-to-innfo-dashboard` entry from [`manifest/source.yaml`](manifest/source.yaml).
   - Clean up false-promise PDF export mentions in [`docs/use/manifest.md`](docs/use/manifest.md), [`docs/use/manifest-next.md`](docs/use/manifest-next.md), and legacy sample documentation.
   - Synchronize and validate manifest channels (`npm run sync:versions` and `npm run check:versions`).

## Capabilities

### Modified Capabilities
- `innfo-skill-menu`: Refined conversational entry menu with merged validation/architecture audits (`[c]`), explicit console export actions (`[d]`), and direct documentation consultation (`[w]`).
- `console-export-cli`: Enhanced CLI exporter supporting status reporting, tree visualization, SHA-256 hash staleness detection, and selective filtering.
- `manifest-governance`: Pruned manifest workflow catalog containing only active, supported workflows.

## Affected Areas
- [`skills/nn-innfo/SKILL.md`](skills/nn-innfo/SKILL.md)
- [`scripts/export-console.mjs`](scripts/export-console.mjs)
- [`scripts/export-console.test.mjs`](scripts/export-console.test.mjs) *(New Test Suite)*
- [`manifest/source.yaml`](manifest/source.yaml)
- [`docs/use/manifest.md`](docs/use/manifest.md)
- [`docs/use/manifest-next.md`](docs/use/manifest-next.md)

## Risks
- **CLI Flag Compatibility**: Existing invocations relying on positional arguments or `--list`/`--all` must remain fully backward-compatible. *Mitigation*: Retain `--list` and positional argument support alongside new flags (`--status`, `--tree`, `--stale`, `--filter`).
- **Manifest Inconsistency**: Removing workflow items without running sync scripts could cause manifest check failures. *Mitigation*: Execute `npm run check:versions` as part of validation.

## Rollback Plan
Revert changes on branch `dev` via git checkout to the baseline commit prior to applying `2026-09-17-console-export-status-and-menu-alignment`.

## Success Criteria
1. `SKILL.md` entry menu presents the updated 7-option structure (`[a]`, `[b]`, `[c]`, `[d]`, `[x]`, `[w]`, `[y]`) with corresponding action routing.
2. `node scripts/export-console.mjs <root> --status` correctly identifies fresh, stale, and uncompiled models.
3. `node scripts/export-console.mjs <root> --tree` renders an accurate hierarchy of models and export artifacts.
4. `node scripts/export-console.mjs <root> --stale` and `--filter` correctly limit compilation to targeted models.
5. All automated unit tests in `scripts/export-console.test.mjs` pass.
6. `manifest/source.yaml` is free of `pdf-to-innfo-dashboard`, and `npm run check:versions` passes cleanly.
