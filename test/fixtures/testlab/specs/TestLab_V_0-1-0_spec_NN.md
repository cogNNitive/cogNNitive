---
spec_version: "V_0-5-0"
spec_url: "test/fixtures/testlab/specs/TestLab_V_0-1-0_spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-5-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-5-0_NN.md"
blueprint_version: "V_0-1-1"
title: "TestLab Coverage App"
relationship_types:
  hierarchy:
    enabled: true
    via: "index block"
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: false
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Synthetic test blueprint. It exists only to exercise every field type, matrix, marker, and traceability path in automated tests and documentation examples. All content is in English.

# NN index

* [[Concept 1]]
* [[Concept 2]]
* [[Edge Cases]]
* [[Modification Cases]]

# NN Concept Definition

## NN Concept Definition: Concept 1
icon:: box
type:: list
color:: blue
weight:: 100
description:: Baseline domain concept holding the 1A/1B/1C element triangle. Concept 1 carries every field type and anchors the Concept 1-Concept 2 matrix.

## NN Concept Definition: Concept 2
icon:: boxes
type:: list
color:: green
weight:: 90
description:: Owner concept holding the 2A/2B elements that reference Concept 1. Concept 2 closes the matrix crossings and proves bidirectional reference resolution.

## NN Concept Definition: Edge Cases
icon:: flask-conical
type:: list
color:: amber
weight:: 80
description:: Quarantined stress probes with literal names describing the case under test: traceability probes, the very-long-description probe, the file probe, the artifact-as-source probe, the broken reference probe, and the sourceless probe.

## NN Concept Definition: Modification Cases
icon:: git-pull-request
type:: list
color:: violet
weight:: 70
description:: One field per Level-1 field type, so the review pass can exercise every kind of modification (a field of each type) with a self-describing name.

# NN Field Definition

## NN Field Definition: summary
concept:: Concept 1
type:: string
description:: One-line summary of the element.

## NN Field Definition: long_description
concept:: Concept 1
type:: markdown_inline
description:: Very long inline description used to stress-test rendering of large text fields.

## NN Field Definition: manual
concept:: Concept 1
type:: markdown_file
description:: External markdown file attached to the element.

## NN Field Definition: photo
concept:: Concept 1
type:: image
description:: Image attached to the element.

## NN Field Definition: attachment
concept:: Concept 1
type:: file
description:: Generic file attached to the element.

## NN Field Definition: demo_video
concept:: Concept 1
type:: video
description:: Downloaded video asset attached to the element.

## NN Field Definition: voice_note
concept:: Concept 1
type:: audio
description:: Downloaded and transcribed audio asset attached to the element.

## NN Field Definition: sibling
concept:: Concept 1
type:: reference
target_concepts:: [Concept 2]
description:: Reference to an element of Concept 2.

## NN Field Definition: status
concept:: Concept 1
type:: select
options:: [draft, reviewed, published]
description:: Lifecycle status of the element.

## NN Field Definition: summary
concept:: Concept 2
type:: string
description:: One-line summary of the element.

## NN Field Definition: attachment
concept:: Concept 2
type:: file
description:: Generic file attached to the element.

## NN Field Definition: owner
concept:: Concept 2
type:: reference
target_concepts:: [Concept 1]
description:: Reference back to an element of Concept 1.

## NN Field Definition: summary
concept:: Edge Cases
type:: string
description:: One-line summary of the edge-case element.

## NN Field Definition: long_description
concept:: Edge Cases
type:: markdown_inline
description:: Very long inline description used to stress-test rendering of large text fields.

## NN Field Definition: photo
concept:: Edge Cases
type:: image
description:: Image attached to the edge-case element.

## NN Field Definition: attachment
concept:: Edge Cases
type:: file
description:: Generic file attached to the edge-case element.

## NN Field Definition: string_field
concept:: Modification Cases
type:: string
description:: A string field, one of the modification cases.

## NN Field Definition: number_field
concept:: Modification Cases
type:: number
description:: A number field, one of the modification cases.

## NN Field Definition: boolean_field
concept:: Modification Cases
type:: boolean
description:: A boolean field, one of the modification cases.

## NN Field Definition: select_field
concept:: Modification Cases
type:: select
options:: [draft, reviewed, published]
description:: A select field, one of the modification cases.

## NN Field Definition: reference_field
concept:: Modification Cases
type:: reference
target_concepts:: [Concept 2]
description:: A reference field, one of the modification cases.

## NN Field Definition: image_field
concept:: Modification Cases
type:: image
description:: An image field, one of the modification cases.

## NN Field Definition: file_field
concept:: Modification Cases
type:: file
description:: A file field, one of the modification cases.

## NN Field Definition: video_field
concept:: Modification Cases
type:: video
description:: A video field, one of the modification cases.

## NN Field Definition: audio_field
concept:: Modification Cases
type:: audio
description:: An audio field, one of the modification cases.

## NN Field Definition: url_field
concept:: Modification Cases
type:: url
description:: A URL field, one of the modification cases.

## NN Field Definition: markdown_inline_field
concept:: Modification Cases
type:: markdown_inline
description:: A markdown_inline field, one of the modification cases.

## NN Field Definition: markdown_file_field
concept:: Modification Cases
type:: markdown_file
description:: A markdown_file field, one of the modification cases.

## NN Field Definition: knowledge_field
concept:: Modification Cases
type:: knowledge
target_blueprint:: TestLab
description:: A knowledge field, one of the modification cases.

## NN Field Definition: address_field
concept:: Modification Cases
type:: address
description:: An address field, one of the modification cases.

## NN Field Definition: citation_field
concept:: Modification Cases
type:: citation
description:: A citation field, one of the modification cases.

## NN Field Definition: tags
concept:: *
type:: select
multiple:: true
description:: Open vocabulary ad-hoc tags and classification labels.

# NN Matrix Definition

## NN Matrix Definition: Concept 1-Concept 2 Matrix
source:: Concept 1
target:: Concept 2
values:: [relevant, archived]
widget:: set
description:: Scores how relevant each Concept 1 element is to each Concept 2 element.

# Concept Guidance Documentation

## Concept 1

### Summary

Baseline domain concept holding the 1A/1B/1C element triangle.

### Description

Concept 1 carries every field type and anchors the Concept 1-Concept 2 matrix.

### Methodologies

Populate 1A first, then 1B with image and file fields, then 1C with the JSON pointer citation.

### Prompts

What does the intake baseline need before the review pass starts?

## Concept 2

### Summary

Owner concept holding the 2A/2B elements that reference Concept 1.

### Description

Concept 2 closes the matrix crossings and proves bidirectional reference resolution.

### Methodologies

Point each owner back at its Concept 1 sibling with a WikiLink reference.

### Prompts

Which Concept 1 element does this owner take responsibility for?

## Edge Cases

### Summary

Quarantined stress probes with literal names describing the case under test.

### Description

Edge Cases holds the traceability probes, the very-long-description probe, the file probe, the artifact-as-source probe, the broken reference probe, and the sourceless probe.

### Methodologies

Name every probe after the behavior it proves so readers and tests need zero domain context.

### Prompts

Which behavior does this probe pin down, and what must break if the fixture drifts?
