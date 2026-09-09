# Proposal: innfo-console Feedback Loop

## Intent

Each iNNfo template procedure duplicates full inline HTML (`business/assets/master.html` ~102KB, `model_viewer.html` ~18KB, `metrics/assets/projections.html` ~39KB). No shared runtime; reviewer feedback has no path back into models. Introduce `innfo-console`: one versioned runtime + thin blueprint, with a reviewer-to-model loop preserving `file://` double-click.

## Scope

### In Scope

- `innfo-runtime.js` (UMD/IIFE, GitHub Pages + jsDelivr) + `artifact_blueprint.html` (shell + `innfo-config` needs[] + JSON slots).
- Console UX: review banner, per-element suggest/edit in localStorage, Export modal (identifier to slug, instructions + agent prompt, timestamped JSON).
- Feedback pipeline: `sources/import/feedback/` via `nn-trannsform --scan` to `sources/nn/` (`sources::`), plus `Apply Feedback` (staleness check, diff preview, `apply_change`, validate, patch bump, regenerate stable-name console).
- Skill instructions for ad-hoc assembly.

### Out of Scope

- ESM/importmap; niche frameworks (FastUI, Vigil, htmz, Mavo rejected).
- `innfo-editor` integration; server multi-user sync; auto-apply without agent review.

## Capabilities

### New Capabilities

- `innfo-console-runtime`: shared runtime + blueprint shell for HTML artifacts.
- `innfo-console-feedback`: reviewer export JSON schema + Apply Feedback procedure.

### Modified Capabilities

- `source-normalization-pipeline`: ingest `sources/import/feedback/*.json` into `sources/nn/`.

## Approach

UMD/IIFE runtime only (no `fetch()`/`type=module`) for `file://`. Thin procedures onto blueprint; consoles declare only `needs[]` + slots. JSON carries `model_version`, `artifact_version`, `exported_at`; file `{PrimaryModel}_V_{version}_{slug}_feedback_{YYYYMMDD-HHMMSS}.json`. Canonical console keeps `{Model}_V_{version}_console.html`; timestamped copies archive-only.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/business/assets/master.html` | Modified | Thin onto blueprint; drop inline duplication |
| `iNNfo/specs/templates/*/assets/model_viewer.html` | Modified | Reuse runtime + JSON slots |
| `iNNfo/specs/templates/metrics/assets/projections.html` | Modified | Replace CDN shell with needs[] |
| `iNNfo/specs/templates/*/procedures/` | Modified | Console generation + Apply Feedback |
| `actioNN/skills/nn-trannsform/` | Modified | Scan `import/feedback/` to `sources/nn/` |
| `iNNfo/packages/innfo-mcp/` | Modified | `apply_change` for feedback |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| CDN/file:// divergence breaks offline open | Med | UMD only; file:// smoke test |
| Stale feedback applied to newer model | Med | Staleness check + diff preview |
| localStorage schema drift | Low | Versioned schema; ignore unknown fields |

## Rollback Plan

Delete `*_console.html` and feedback JSONs; revert procedures to inline generators; remove feedback scan branch. Models unchanged unless procedure explicitly ran.

## Dependencies

- Pages + jsDelivr hosting for `innfo-runtime.js`.
- `innfo-mcp apply_change`, `innfo-core` validation, `nn-trannsform --scan`.

## Success Criteria

- [ ] Console opens via `file://` double-click, zero build.
- [ ] Export JSON normalizes via `--scan` with `sources::` citation.
- [ ] Apply Feedback checks staleness, previews diff, bumps patch, regenerates console.
- [ ] No duplicated inline runtime in the three reference assets.
