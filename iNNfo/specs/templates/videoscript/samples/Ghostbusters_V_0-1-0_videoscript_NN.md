---
level: 3
parent_spec:
  name: "videoscript_V_0-1-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/videoscript/spec_NN.md"
model_version: "V_0-1-0"
title: "Ghostbusters Inc. Recruitment Spot"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN VideoScript

## NN VideoScript: Ghostbusters Inc. Recruitment Spot
video_anydeo_specification:: V_0-3-3
video_title:: Ghostbusters Inc. Recruitment Spot
Thirty-second recruitment spot for Ghostbusters Inc.: headquarters exterior at dawn, Ecto-1 rolling out, and a closing call to join the containment crew.

# NN Section

## NN Section: Recruitment Cut
order:: 1
video:: [[Ghostbusters Inc. Recruitment Spot]]
Opening act of the spot, grouping the headquarters reveal and the crew rollout scenes.

# NN Scene

## NN Scene: Dawn Over Headquarters
order:: 1
section:: [[Recruitment Cut]]
scene_voice:: Friendly_Person
The sun rises over the Ghostbusters firehouse as the containment grid hums beneath the street.

## NN Scene: Ecto-1 Rollout
order:: 2
section:: [[Recruitment Cut]]
scene_voice:: Casual_Guy
Ecto-1 screams down Fifth Avenue while the crew calls on every New Yorker to join the containment team.

# NN Layer

## NN Layer: Firehouse Dawn
order:: 1
scene:: [[Dawn Over Headquarters]]
layer_type:: image
layer_level:: 5
layer_asset_source:: assets/firehouse-dawn.png
layer_generation_subject:: Brick firehouse at dawn with green containment glow in the basement windows
layer_effects:: slow-zoom
layer_effect_speed:: 0.5
Wide establishing shot of the Ghostbusters firehouse exterior at dawn.

## NN Layer: Headquarters Banner
order:: 2
scene:: [[Dawn Over Headquarters]]
layer_type:: text
layer_level:: 30
layer_asset_source:: assets/headquarters-banner.png
layer_generation_subject:: Bold red banner reading WHO YOU GONNA CALL over the firehouse doors
layer_effects:: fade-in
layer_effect_speed:: 1.0
Foreground banner over the firehouse doors carrying the recruitment slogan.

## NN Layer: Ecto-1 Street Chase
order:: 1
scene:: [[Ecto-1 Rollout]]
layer_type:: image
layer_level:: 8
layer_asset_source:: assets/ecto1-street.png
layer_generation_subject:: White vintage ambulance with roof sirens speeding through Manhattan traffic
layer_effects:: lateral-pan
layer_effect_speed:: 1.5
Background plate of Ecto-1 racing down Fifth Avenue with sirens blaring.

## NN Layer: Join The Crew Overlay
order:: 2
scene:: [[Ecto-1 Rollout]]
layer_type:: text
layer_level:: 60
layer_asset_source:: assets/join-the-crew.png
layer_generation_subject:: Glowing overlay text reading JOIN THE CREW with a ghost-trap icon
layer_effects:: pulse
layer_effect_speed:: 2.0
Overlay call-to-action inviting viewers to enlist in the containment crew.

# NN ReleaseInfo

## NN ReleaseInfo: Recruitment Spot First Cut
release_version:: V_0-1-0
release_notes:: First cut of the recruitment spot covering the headquarters reveal and the Ecto-1 rollout scenes.
