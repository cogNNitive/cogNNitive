---
level: 3
parent_spec:
  name: "procedures"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/procedures/spec_NN.md"
model_version: "V_0-2-0"
title: "Generate Anydeo Script Procedure"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/).

# NN index

* [[Procedure]]
* [[Work]]
* [[Artifact]]
* [[Tools]]
* [[Roles]]

# NN Procedure

## NN Procedure: Generate Anydeo Script
category:: transformation
summary:: Frame a Video from its bound Subject and Series, author and gate an Anydeo V_0-3-3 script with skills/nn-video-script, register it, then finalize and register the rendered assets once VidGeNN has produced them.
inputs_required:: Subject Element (via sources::) and Series registry model
outputs_expected:: Registered Video Assets
executed_by:: Video Producer
procedure_model:: procedures/generate_anydeo_script_NN.md

# NN Work

## NN Work: Generate Anydeo Script Workflow
step_type:: task
next:: [[Frame the Script]]
condition:: A Subject and a Series are available for the Video
input:: [[Subject and Series Selection]]
output:: [[Registered Video Assets]]
output_status:: verified
tool:: [[nn-video-script Skill]]
scope:: internal
Orchestrate script generation end to end: frame the video from its Subject and Series, author and validate Anydeo V_0-3-3 scenes and layers, register the script, then finalize and register the rendered assets once VidGeNN has rendered them.

## NN Work: Frame the Script
parent:: [[Generate Anydeo Script Workflow]]
step_type:: task
next:: [[Author Anydeo Scenes]]
condition:: The Video's Subject and Series are both bound
input:: [[Subject and Series Selection]]
output:: [[Script Outline]]
output_status:: verified
tool:: [[AI Agent]]
scope:: internal
Bind exactly one Subject (via the owning Video's `sources::`) and exactly one Series. Stage any workspace-scope asset the script needs into the Series' own `shared/` folder by copy, never as a live reference. Derive the narrative outline from the Subject's cited sources and the Series' `series_rules.md` tone.

## NN Work: Author Anydeo Scenes
parent:: [[Generate Anydeo Script Workflow]]
step_type:: task
next:: [[Validate Script]]
condition:: Outline is ready
input:: [[Script Outline]]
output:: [[Draft Script]]
output_status:: verified
tool:: [[nn-video-script Skill]]
scope:: internal
Copy the Series' `script_template.md` and fill every `{{slot}}<!-- slot: ... -->` pair with real content, following `references/series-template-convention.md` and `references/vus-authoring-notes.md`. Both the placeholder and its instruction comment must be gone from the emitted `script.md`. Never edit `script_template.md` itself.

## NN Work: Validate Script
parent:: [[Generate Anydeo Script Workflow]]
step_type:: task
next:: [[Register Script Artifact]]
condition:: Draft script is emitted
input:: [[Draft Script]]
output:: [[Validated Script]]
output_status:: verified
tool:: [[nn-video-script Skill]]
scope:: internal
Run `node scripts/check-script.mjs <script.md> --series-root <series-dir>` first — the zero-unresolved-placeholder gate, the leftover-slot-comment check, the `//ANYDEO_SPEC:` header check, and the no-upward-escape asset check, in that order — then run `node scripts/vus-parse.mjs <script.md>`. Either check failing stops the procedure before anything is registered; an unresolved `{{...}}` is invisible to the VUS grammar, so `check-script.mjs` MUST run before `vus-parse.mjs`.

## NN Work: Register Script Artifact
parent:: [[Generate Anydeo Script Workflow]]
step_type:: task
next:: [[Render Video]]
condition:: Script passed both validation checks
input:: [[Validated Script]]
output:: [[Registered Script Artifact]]
output_status:: verified
tool:: [[File Editor]]
scope:: internal
Write the script to the video's own folder — `series/{series-slug}/assets/{video-slug}/script.md` when the Video belongs to a Series, or `{modelDir}/assets/{video-slug}/script.md` for a standalone Video — set `script::` on the owning Video Element, and set `status:: scripting`.

## NN Work: Render Video
parent:: [[Generate Anydeo Script Workflow]]
step_type:: task
next:: [[Finalize Video Assets]]
condition:: Script is registered
input:: [[Registered Script Artifact]]
output:: [[Rendered Output]]
output_status:: verified
tool:: [[VidGeNN]]
scope:: external
User-driven: the Video Producer renders the registered script in VidGeNN, producing `renders/{ref}/master.mp4` (and, when VidGeNN emits them, a thumbnail and a voiceover) next to the script. This step runs outside iNNfo's own tooling.

## NN Work: Finalize Video Assets
parent:: [[Generate Anydeo Script Workflow]]
step_type:: task
next:: [[Register Video Assets]]
condition:: A render is available under renders/
input:: [[Rendered Output]]
output:: [[Finalized Video Assets]]
output_status:: verified
tool:: [[nn-video-script Skill]]
scope:: internal
Run `node scripts/finalize-video.mjs --video-dir <dir> [--ref <r>] [--force-thumbnail]`. It picks `renders/{ref}/` (failing when several candidates exist and no `--ref` is given), copies `master`/`thumbnail`/`voiceover` into the video's own folder via a temp-file-then-rename, preserves an existing thumbnail unless `--force-thumbnail` is passed, skips a missing voiceover without error, and prints the field values to set. It never edits the model file itself.

## NN Work: Register Video Assets
parent:: [[Generate Anydeo Script Workflow]]
step_type:: task
condition:: Finalize has printed the field values to set
input:: [[Finalized Video Assets]]
output:: [[Registered Video Assets]]
output_status:: verified
tool:: [[File Editor]]
scope:: internal
Set `master::`, `thumbnail::`, and (when present) `voiceover::` on the owning Video Element using the values `finalize-video.mjs` printed, and set `status:: rendering`.

# NN Artifact

## NN Artifact: Subject and Series Selection
type:: input
description:: The Subject Element (cited via the owning Video's sources::) and the Series registry model the Video belongs to.

## NN Artifact: Script Outline
type:: intermediate
description:: Ordered narrative beats framing the scenes to author, derived from the Subject's sources and the Series' series_rules.md.

## NN Artifact: Draft Script
type:: intermediate
description:: A script.md authored from the Series' script_template.md, before check-script.mjs and vus-parse.mjs have run.

## NN Artifact: Validated Script
type:: intermediate
description:: A script.md that passed both the zero-unresolved-placeholder/asset-escape gate and the VUS parser check.

## NN Artifact: Registered Script Artifact
type:: output
description:: The validated Anydeo script stored in the video's own folder and referenced by the owning Video Element's script:: field, with status:: scripting.

## NN Artifact: Rendered Output
type:: intermediate
description:: The master/thumbnail/voiceover files VidGeNN produced under renders/{ref}/, not yet promoted into the video's own folder.

## NN Artifact: Finalized Video Assets
type:: intermediate
description:: The master/thumbnail/voiceover files copied out of renders/{ref}/ into the video's own folder by finalize-video.mjs, plus the field values it printed.

## NN Artifact: Registered Video Assets
type:: output
description:: The finalized assets referenced by the owning Video Element's master::, thumbnail::, and voiceover:: fields, with status:: rendering.

# NN Tools

## NN Tools: nn-video-script Skill
type:: automated
description:: The skills/nn-video-script skill authoring (from script_template.md), gating (check-script.mjs, then vus-parse.mjs), and finalizing (finalize-video.mjs) V_0-3-3 script syntax inside a Series folder. Never restates voice IDs or property names in prose; always resolves them from the pinned spec via scripts/vus-spec.mjs.

## NN Tools: AI Agent
type:: automated
description:: Cognitive agent framing the narrative outline from the Subject's cited sources and the Series' series_rules.md.

## NN Tools: VidGeNN
type:: external
description:: The rendering engine that turns a registered, validated script into rendered media under renders/{ref}/. User-driven and outside iNNfo's own tooling; read-only reference from cogNNitive's side.

## NN Tools: File Editor
type:: automated
description:: Tool writing the emitted script and the finalized asset field values to the workspace and updating the owning Video Element (innfo-mcp).

# NN Roles

## NN Roles: Video Producer
type:: owner
description:: Owns the video's scope, approves the generated script, and triggers rendering in VidGeNN.
