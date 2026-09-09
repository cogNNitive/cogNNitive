---
level: 3
parent_spec:
  name: "videoscript_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/videoscript/spec_NN.md"
model_version: "V_0-1-0"
title: "Rock Bands Fixture (NON-CANONICAL)"
---

> [!NOTE]
> QUARANTINED EXPLORATION FIXTURE — NOT a canonical sample. This file exists only as a
> throwaway grounding exercise and MUST NOT ship as the template's canonical sample
> (see `samples/Ghostbusters_V_0-1-0_videoscript_NN.md`). It lives outside `samples/`
> so catalog discovery and template audits never treat it as canonical.

# NN VideoScript

## NN VideoScript: Rock Bands Fixture
video_anydeo_specification:: V_0-3-3
video_title:: Rock Bands Fixture
Throwaway fixture covering three rock bands for serializer grounding only.

# NN Section

## NN Section: Bands Act
order:: 1
video:: [[Rock Bands Fixture]]
Grouping for the three band scenes below.

# NN Scene

## NN Scene: Queen Era
order:: 1
section:: [[Bands Act]]
scene_voice:: Friendly_Person
Queen commands the stadium with an emblematic anthem from their golden era.

## NN Scene: Led Zeppelin Era
order:: 2
section:: [[Bands Act]]
scene_voice:: Friendly_Person
Led Zeppelin channels hard rock thunder from their classic era.

## NN Scene: AC DC Era
order:: 3
section:: [[Bands Act]]
scene_voice:: Friendly_Person
AC DC delivers high-voltage riffs from their signature era.

# NN Layer

## NN Layer: Queen Backdrop
order:: 1
scene:: [[Queen Era]]
layer_type:: image
layer_level:: 5
layer_asset_source:: assets/queen-stage.png
layer_generation_subject:: Stadium stage bathed in golden light for an anthem chorus
layer_effects:: slow-zoom
layer_effect_speed:: 0.5
Stadium backdrop for the Queen scene.

## NN Layer: Queen Anthem Overlay
order:: 2
scene:: [[Queen Era]]
layer_type:: text
layer_level:: 60
layer_asset_source:: assets/queen-anthem.png
layer_generation_subject:: Glowing overlay naming the emblematic anthem theme
layer_effects:: pulse
layer_effect_speed:: 2.0
Overlay naming the emblematic theme of the Queen scene.

## NN Layer: Zeppelin Backdrop
order:: 1
scene:: [[Led Zeppelin Era]]
layer_type:: image
layer_level:: 5
layer_asset_source:: assets/zeppelin-stage.png
layer_generation_subject:: Storm-lit stage with thunder atmosphere for hard rock
layer_effects:: slow-zoom
layer_effect_speed:: 0.5
Storm backdrop for the Led Zeppelin scene.

## NN Layer: Zeppelin Riff Overlay
order:: 2
scene:: [[Led Zeppelin Era]]
layer_type:: text
layer_level:: 60
layer_asset_source:: assets/zeppelin-riff.png
layer_generation_subject:: Glowing overlay naming the emblematic riff theme
layer_effects:: pulse
layer_effect_speed:: 2.0
Overlay naming the emblematic theme of the Led Zeppelin scene.

## NN Layer: ACDC Backdrop
order:: 1
scene:: [[AC DC Era]]
layer_type:: image
layer_level:: 5
layer_asset_source:: assets/acdc-stage.png
layer_generation_subject:: High-voltage stage with lightning rigs for riff rock
layer_effects:: slow-zoom
layer_effect_speed:: 0.5
High-voltage backdrop for the AC DC scene.

## NN Layer: ACDC Riff Overlay
order:: 2
scene:: [[AC DC Era]]
layer_type:: text
layer_level:: 60
layer_asset_source:: assets/acdc-riff.png
layer_generation_subject:: Glowing overlay naming the emblematic riff theme
layer_effects:: pulse
layer_effect_speed:: 2.0
Overlay naming the emblematic theme of the AC DC scene.

# NN ReleaseInfo

## NN ReleaseInfo: Fixture Release Marker
release_version:: V_0-1-0
release_notes:: Quarantined fixture release marker; not a canonical release.
