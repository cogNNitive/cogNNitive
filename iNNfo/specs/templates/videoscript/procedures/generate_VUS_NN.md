---
level: 3
parent_spec:
  name: "procedures_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/procedures/procedures_V_0-2-0_NN.md"
model_version: "V_0-1-0"
title: "Generate VUS Procedure"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN Work

## NN Work: Generate VUS Document
step_type:: task
parent:: -
next:: -
condition:: VideoScript model updated or export triggered
input:: [[VideoScript Model]]
output:: [[Verified VUS Document]]
output_status:: verified
tool:: [[VUS Serializer Checklist]]
scope:: internal
tags:: [procedure, videoscript, vus-export, serializer]
Standard procedure to serialize a videoscript model into a pure VUS V_0-3-3 `.md` document that VidGeNN `ScriptParser.parse()` accepts with zero errors. The `.md` file is the only VidGeNN interface; no video parse, validate, or render code is added to core or MCP. Until the oracle is pinned for more, only the confirmed 9 properties plus `order` are used and every unconfirmed property is dropped.

## NN Work: Map Elements
parent:: [[Generate VUS Document]]
step_type:: task
next:: [[Emit VUS Text]]
condition:: Execution begins
input:: [[VideoScript Model]]
output:: [[Mapped Element Tree]]
output_status:: verified
tool:: [[iNNfo Core Validator]]
scope:: internal
tags:: [procedure, videoscript, mapping, order]
Validate the videoscript model against `videoscript_V_0-1-0`, resolve `video` / `section` / `scene` parent references, and sort Sections, Scenes, and Layers by ascending `order`. Drop every property outside the confirmed set (`video_anydeo_specification`, `video_title`, `scene_voice`, `layer_type`, `layer_level`, `layer_asset_source`, `layer_generation_subject`, `layer_effects`, `layer_effect_speed`, `layer_text_content`) instead of inventing VUS syntax.

## NN Work: Emit VUS Text
parent:: [[Generate VUS Document]]
step_type:: task
next:: [[Verify Against Oracle]]
condition:: Element tree mapped and sorted
input:: [[Mapped Element Tree]]
output:: [[VUS Document Draft]]
output_status:: verified
tool:: [[VUS Serializer Checklist]]
scope:: internal
tags:: [procedure, videoscript, emit, vus]
Serialize the mapped tree to VUS text with LF endings. Emit `//ANYDEO_SPEC: V_0-3-3` as the first line, then `# Video` (`- video_anydeo_specification: V_0-3-3`, `- video_title:`), then `# Templates` (`@template base` plus `- scene_voice:`), then `# Scenes`. Per element in ascending `order`: VideoScript feeds the header blocks; Section emits a grouping comment only; Scene emits `@base <Title>`, then `- scene_voice:` (inherited unless overridden), then the narration as a bare plain-text line (never `- ` prefixed, never quoted); Layer emits `@@ <Name>` plus confirmed properties only, with `![...](...)` references resolved to `layer_asset_source` and levels in the 0-10 background / 20-40 primary / 50+ overlay bands. Never emit `layer_z_index`.

## NN Work: Verify Against Oracle
parent:: [[Generate VUS Document]]
step_type:: task
next:: -
condition:: VUS draft emitted
input:: [[VUS Document Draft]]
output:: [[Verified VUS Document]]
output_status:: verified
tool:: [[VidGeNN ScriptParser Oracle]]
scope:: internal
tags:: [procedure, videoscript, verify, oracle]
Feed the draft to the pinned oracle `ScriptParser.parse()` and require zero errors with all scenes and layers surviving the round trip. On any parse error or dropped element, return to Emit VUS Text; never widen the property set to fix a failure before the oracle is pinned for more.

# NN Artifact

## NN Artifact: VideoScript Model
Level 3 model authored against `videoscript_V_0-1-0` carrying VideoScript, Section, Scene, Layer, and ReleaseInfo elements.

## NN Artifact: Mapped Element Tree
Validated element tree with parent references resolved and Sections, Scenes, and Layers sorted by ascending `order`, containing confirmed properties only.

## NN Artifact: VUS Document Draft
Unverified VUS `.md` text emitted from the mapped tree, starting with `//ANYDEO_SPEC: V_0-3-3`.

## NN Artifact: Verified VUS Document
VUS `.md` document that the pinned oracle parses with zero errors and full scene and layer survival.

# NN Tools

## NN Tools: VidGeNN ScriptParser Oracle
Independent VidGeNN repository, commit `036f5667d99fa76c6d6ce8f2e016675b3c85266a`: `packages/core/src/parser/Parser.ts` (`ScriptParser.parse()`, peggy `vus_parser` grammar plus lowering), formal AST in `packages/core/src/parser/ast.ts`, secondary property reference `packages/core/specs/V_0-3-3.json`, usage examples under `public/demos/`. Read-only conformance reference; never written to.

## NN Tools: iNNfo Core Validator
Existing validator resolving the model against its `parent_spec` URL and checking concept, field, and reference integrity.

## NN Tools: VUS Serializer Checklist
Docs-only serialization checklist: `//ANYDEO_SPEC` first with LF endings, `# Video` / `# Templates` / `# Scenes` block order, narration as bare plain-text lines, `![...](...)` references resolved to `layer_asset_source`, level bands honored, `layer_z_index` absent, unconfirmed properties dropped.

# NN Roles

## NN Roles: VideoScript Export Operator
scope:: internal
Runs the map, emit, and verify steps and owns the verified VUS document handoff to VidGeNN.

# NN matrices: work-roles matrix
| Work \ Roles | VideoScript Export Operator |
| :--- | :---: |
| Map Elements | Responsible |
| Emit VUS Text | Responsible |
| Verify Against Oracle | Accountable |

# NN matrices: work-tools matrix
| Work \ Tools | VidGeNN ScriptParser Oracle | iNNfo Core Validator | VUS Serializer Checklist |
| :--- | :---: | :---: | :---: |
| Map Elements | - | Uses | - |
| Emit VUS Text | - | - | Uses |
| Verify Against Oracle | Uses | - | - |

# NN matrices: work-artifacts matrix
| Work \ Artifact | VideoScript Model | Mapped Element Tree | VUS Document Draft | Verified VUS Document |
| :--- | :---: | :---: | :---: | :---: |
| Map Elements | Reviews | Creates | - | - |
| Emit VUS Text | - | Reviews | Creates | - |
| Verify Against Oracle | - | - | Reviews | Creates |
