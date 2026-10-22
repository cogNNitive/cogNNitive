---
spec_version: "V_0-5-0"
level: 2
parent_spec:
  name: "iNNfo_V_0-5-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-5-0_NN.md"
blueprint_name: "site"
blueprint_version: "V_0-1-0"
title: "Site Blueprint"
relationship_types:
  hierarchy:
    enabled: true
    via: index block
  evaluable_matrix:
    enabled: false
  graph_edge:
    enabled: false
  sequence:
    enabled: false
---

# NN index

* [[Site]]
* [[Page]]

# NN Concept Definition

## NN Concept Definition: Site
icon:: globe
type:: category
color:: blue
weight:: 100

## NN Concept Definition: Page
icon:: file-text
type:: list
color:: green
weight:: 80

# NN Field Definition

## NN Field Definition: tagline
concept:: Site
type:: string
description:: One-line description of the site. Required.

## NN Field Definition: base_url
concept:: Site
type:: string
description:: Absolute URL of the published site, ending in a slash. Required.

## NN Field Definition: repository_url
concept:: Site
type:: string
description:: Optional URL of the source repository.

## NN Field Definition: kind
concept:: Page
type:: select
options:: [tutorial, guide, concept, reference, pitch, legal]
description:: Page category. Legal, privacy and contact content uses legal. Required.

## NN Field Definition: order
concept:: Page
type:: number
description:: Integer sort key within a kind. Required.

## NN Field Definition: summary
concept:: Page
type:: string
description:: Short description used in navigation, meta description and llms.txt. Required.

# Site Blueprint

## A domaiNN-local blueprint for a static documentation site

A Site is a singleton that names the site. Each Page is an element whose name is its title and whose reserved `slug::` property is its URL slug. Page citations use the reserved `sources::` property.
