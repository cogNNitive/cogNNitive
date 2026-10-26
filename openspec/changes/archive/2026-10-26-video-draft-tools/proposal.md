# Proposal: Draft Tools Promoted To The Blueprint

## Intent

Promote the iNNteresante field-proven authoring tools — the draft JSON + self-contained review HTML
and the script generator — from the user workspace into the `video-script` blueprint as
**series-parameterized** tools, so every series gets the same review-before-spend workflow. The
concrete iNNteresante hardcoding is extracted into a series config first.

This is decision 8 (two-phase: extract config → promote) and decision 11 (unified source of truth,
`series_rules.md` loses model ids) of the 2026-10-26 grill.

## Why Now

The last-3-days work landed a complete authoring workflow in `_NN/video_NN`:
`build-draft-html.mjs` (self-contained HTML from a draft JSON) and `build-script-from-draft.mjs`
(generate the L3 script from the reviewed JSON). These are generic, but they hardcode iNNteresante:
Template names `[[iNNteresante :: Lucas Full]]`, music `../../shared/music/jazz.mp3`, the filename
`<slug>_video-script_innteresante_NN.md`, and a default avatar model. The workspace has no git and
is not the home for reusable tooling.

## Scope

| Slice | Content | Owner |
|---|---|---|
| 1 | Extract the iNNteresante hardcoding into a series config consumed by the tools | this change |
| 2 | Move `build-draft-html.mjs`, `build-script-from-draft.mjs`, `thumbnail-v1.mjs` into the blueprint skill | this change |
| 3 | Neutrally name the draft schema (`video-script.draft.v1`) | this change |
| 4 | Docs: `series_rules.md` editorial only (no model ids); retire `script_template.md` | this change |

### Non-goals

- Promoting `tools/formats.mjs` (duplicates the blueprint's `render-formats.mjs`).
- Building a new UI (the HTML is the existing pattern).
- Changing the draft JSON's field set beyond the neutral rename.

## Approach (binding maintainer decisions)

| # | Decision | Rejected alternative and why |
|---|---|---|
| D-DT1 | (a) two phases: extract config, then promote | Promote as-is: bakes one series into the blueprint |
| D-DT2 | The blueprint owns the tools; the series supplies a small config (templates, music default, naming, avatar model) | Per-series copies: drift |
| D-DT3 | Neutral schema name `video-script.draft.v1` | `innteresante.scene-decisions.v1`: series-branded in the blueprint |

## Capabilities

### New Capabilities
- None.

### Modified Capabilities

- `video-script-skill`: ships the draft/HTML/script/thumbnail tools, parameterized by a series config.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Generalizing too early (one series proven) | Med | Phase 1 extracts config without changing behaviour; a second series can validate before further generalization |
| Filename/naming assumptions leak | Med | Naming comes from the series config; a test asserts a non-iNNteresante config emits the right filename |

## Rollback Plan

Each phase is revertible. Phase 1 alone is a pure refactor inside the workspace; phase 2 adds
files to the blueprint (additive).

## Success Criteria

- [ ] The tools run against a non-iNNteresante series config and emit the correct filenames/templates.
- [ ] `rg "innteresante"` in the promoted tools returns nothing outside a default fixture.
- [ ] `node scripts/verify.js` is green; `blueprint_version` bumped; released.
