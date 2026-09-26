# Proposal: Video Template Architecture (Script Skill, Project/Series Hierarchy, Placeholder Templates, Folder Contract)

## Intent

The `video` template (`iNNfo/specs/templates/video/spec_NN.md`, V_0-2-1) says the script is "owned by the `anydeo-script-builder` skill", but **that skill does not exist in cogNNitive**. It exists only in VidGeNN (`innV0/VidGeNN/.agent/skills/anydeo-script-builder/`). A real series (iNNtrevistas) was built by hand against VidGeNN, and that work surfaced four recurring problems:

- VUS syntax quirks nobody wrote down.
- Voice IDs copied into prose that drift from VidGeNN's canonical list. `English_Deep-VoicedGentleman` does not exist.
- Asset paths that escape the video folder (`../../assets/x.mp4`).
- A good 16-scene format that lived only inside one workspace.

This change builds the reusable layer in cogNNitive so the next series doesn't have to rediscover all of this. The metadata-only `Video` Element is correct and stays as it is.

## Scope

### In Scope

- **D1 · Forked skill.** A new cogNNitive skill, forked from `anydeo-script-builder`, that understands iNNfo (workspace structure, Series/Video registration). It is not a byte-copy. It declares a machine-checkable pin to VUS `V_0-3-3`, with `VidGeNN/packages/core/specs/V_0-3-3.json` as the canonical source. Voice IDs and property names come from the pinned spec and are never restated in prose. Dependency direction: cogNNitive → VidGeNN only. The pin reuses the `manifest/source.yaml` pinning pattern.
- **D2 · Four-level hierarchy: Workspace → Project → Series → Video.**
  - **Project** is the content: facts and sources.
  - **Series** is the production format: one procedure that extends the generic one, one script template, and shared assets.
  - **Video** combines exactly one Project with exactly one Series.
  - Project and Series are independent: one Project can be produced in several Series.
- **D3 · Placeholder convention.**
  - Series script templates use `{{slot}}` placeholders. These are a visual convention for the agent. No Handlebars or other templating runtime is involved.
  - Each slot carries its fill-in instructions inline, as an HTML comment right after the placeholder.
  - A separate document holds only rules that apply to the whole series (tone, sound tags).
  - The generic procedure adds a required gate: **zero unresolved `{{...}}` placeholders**. It runs alongside VUS parser validation. A leaked placeholder is a silent bug: `vus.peggy` treats it as narration `Content` and raises no error.
- **D4 · Folder contract.**
  - Assets are scoped at three levels: workspace, series, and video.
  - A script's asset paths never climb above its own Series folder.
  - `renders/` and `.anydeo/` are gitignored and are **not** iNNfo Artifacts.
  - The generic procedure gets a finalize/register step that copies `master`/`thumbnail`/`voiceover` out of `renders/<id>/` into the Element-owned asset location. This generalizes the "Resolve video assets" step from iNNtrevistas.
- Update `procedures/generate_anydeo_script_NN.md` and the template prose to reference the forked skill.

### Out of Scope

- Migrating the iNNtrevistas workspace. That is separate, later, manual work.
- Any change to the VidGeNN repo. It is a read-only reference.
- Changing the `Video` Element fields (title/description/script/thumbnail/voiceover/master/status).

## Settled vs. Open (Automatic mode)

| Item | Status |
|---|---|
| D1, D3, D4 rules; the outer shape of D2 | **Settled.** Do not reopen. |
| **Series** and **Project**: lightweight registry file vs. full iNNfo template/Element | **Open. The spec phase MUST decide.** Leaning: lightweight registry for Series. Project may stay a workspace-custom template (as iNNtrevistas does today). |
| Literal folder names (`series/<name>/videos/<slug>/`) | These show the scoping rule only. Final paths follow the D2 decision. |

The spec/design phases close the open items on their own best judgment and record the rationale. They do not wait for user input.

## Capabilities

### New Capabilities

- `video-script-skill`: the forked cogNNitive VUS skill, its VUS spec pin, and the no-prose-copy rule.
- `video-production-hierarchy`: Workspace/Project/Series/Video semantics, and how Series and Project are represented (to be resolved by the spec phase).
- `series-script-templates`: the `{{slot}}` convention, inline instructions, the series-wide rules document, and the zero-placeholder gate.
- `video-folder-contract`: three-level asset scoping, the no-upward-escape rule, ephemeral engine directories, and the finalize/register step.

### Modified Capabilities

- `workspace-directory-conventions`: adds the Series/Video folder layout and the gitignored engine directories.

## Approach

1. Fork the skill under `skills/` with an `nn-` prefix. Declare the VUS pin in frontmatter and in `manifest/source.yaml`. Add a check that validates the pin.
2. Generalize the procedure: author from the series template, run the zero-placeholder gate, run VUS parser validation, then finalize/register assets.
3. Document the D2 hierarchy and the D4 folder contract in the `video` template prose, plus a sample Series template.

## Affected Areas

| Area | Impact |
|---|---|
| `skills/<nn-video-script-skill>/` | New |
| `iNNfo/specs/templates/video/spec_NN.md` | Modified: prose and folder rule, `template_version` bump |
| `iNNfo/specs/templates/video/procedures/generate_anydeo_script_NN.md` | Modified |
| `iNNfo/specs/templates/video/samples/` | Modified: add a sample Series template |
| `manifest/source.yaml` | Modified: new skill entry and template/VUS pins |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| The template's current rule `{modelDir}/assets/{video-slug}/` conflicts with the D4 layout, so the template prose must change | High | Spec phase decides. Editing `spec_NN.md` needs a `template_version` bump, a `templates-v*` tag, and a manifest repin in the same batch. |
| "Project" collides with the existing `projects` template | Medium | Spec phase names the concept so it can't be confused with `projects`. |
| The VUS pin drifts from VidGeNN | Medium | Add a checkable pin with a failing check. The skill must not restate the spec in prose. |
| VidGeNN has two copies of `V_0-3-3.json` (core and skill) | Low | Pin only `packages/core`. |

## Rollback Plan

Revert the change commits on `dev`. Delete the new skill folder and its manifest entry. Restore the previous `spec_NN.md` and procedure. Nothing in VidGeNN or any user workspace is touched.

## Dependencies

- VidGeNN `packages/core/specs/V_0-3-3.json` (read-only).

## Success Criteria

- [ ] A cogNNitive skill exists, and its VUS pin can be checked mechanically.
- [ ] A script with an unresolved `{{...}}` fails the procedure gate.
- [ ] An asset path that escapes the Series folder is rejected.
- [ ] The spec artifacts record the D2 decision and its rationale.
- [ ] The VidGeNN repo and the iNNtrevistas workspace are unchanged.
