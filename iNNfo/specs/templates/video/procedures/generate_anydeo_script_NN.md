---
level: 3
parent_spec:
  name: "procedures"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/procedures/spec_NN.md"
model_version: "V_0-1-0"
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
summary:: Turn a topic or normalized source into an Anydeo V_0-3-3 script and register it as a workspace artifact.
inputs_required:: Topic Brief
outputs_expected:: Anydeo Video Script
executed_by:: Video Producer
procedure_model:: procedures/generate_anydeo_script_NN.md

# NN Work

## NN Work: Generate Anydeo Script Workflow
step_type:: task
next:: [[Frame the Script]]
condition:: A topic or source is provided
input:: [[Topic Brief]]
output:: [[Registered Script Artifact]]
output_status:: verified
tool:: [[Anydeo Script Builder]]
scope:: internal
Orchestrate script generation: frame the narrative, author Anydeo V_0-3-3 scenes and layers, then register the emitted script as a workspace artifact.

## NN Work: Frame the Script
parent:: [[Generate Anydeo Script Workflow]]
step_type:: task
next:: [[Author Anydeo Scenes]]
condition:: Topic and cited sources are available
input:: [[Topic Brief]]
output:: [[Script Outline]]
output_status:: verified
tool:: [[AI Agent]]
scope:: internal
Derive the narrative beat structure from the topic and the cited `sources::` of the owning Video element.

## NN Work: Author Anydeo Scenes
parent:: [[Generate Anydeo Script Workflow]]
step_type:: task
next:: [[Register Script Artifact]]
condition:: Outline is ready
input:: [[Script Outline]]
output:: [[Anydeo Video Script]]
output_status:: verified
tool:: [[Anydeo Script Builder]]
scope:: internal
Emit a V_0-3-3 script using scene headers (`@`), layer children (`@@`), `layer_type`, `scene_templates`, and `scene_tts_model` settings.

## NN Work: Register Script Artifact
parent:: [[Generate Anydeo Script Workflow]]
step_type:: task
condition:: Script emitted
input:: [[Anydeo Video Script]]
output:: [[Registered Script Artifact]]
output_status:: verified
tool:: [[File Editor]]
scope:: internal
Write the script to the video's own folder (`assets/{video-slug}/script.md`) and set `script` on the owning Video element.

# NN Artifact

## NN Artifact: Topic Brief
type:: input
description:: The topic, audience, and intent the video must express.

## NN Artifact: Script Outline
type:: intermediate
description:: Ordered narrative beats framing the scenes to author.

## NN Artifact: Anydeo Video Script
type:: output
description:: A V_0-3-3 Anydeo script file with scenes, layers, and TTS settings.

## NN Artifact: Registered Script Artifact
type:: output
description:: The Anydeo script stored in the video's own folder and referenced by a Video element.

# NN Tools

## NN Tools: Anydeo Script Builder
type:: automated
description:: The anydeo-script-builder skill authoring V_0-3-3 script syntax.

## NN Tools: AI Agent
type:: automated
description:: Cognitive agent framing narrative structure from topic and sources.

## NN Tools: File Editor
type:: automated
description:: Tool writing the emitted script to the workspace and updating the model.

# NN Roles

## NN Roles: Video Producer
type:: owner
description:: Owns the video project scope and approves the generated script.
