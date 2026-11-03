---
level: 2
title: "Video Like"
blueprint_name: "video-like"
blueprint_version: "V_0-1-0"
parent_spec:
  name: "iNNfo_V_0-7-0"
  url: "https://example.test/iNNfo_V_0-7-0_NN.md"
---

# NN Concept Definition

## NN Concept Definition: Series
slug:: series
type:: list
storage:: distributed
placement:: "series/{slug}/"

## NN Concept Definition: Video
slug:: video
type:: list
storage:: distributed
container:: Series
placement:: "{container}/assets/{slug}/"

## NN Concept Definition: Scene
slug:: scene
type:: list

## NN Concept Definition: Preset
slug:: preset
type:: list
storage:: compact
