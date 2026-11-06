---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
blueprint_version: "V_0-5-5"
status: applied
title: "Admin: initialize the TestLab coverage model from field notes and datasets"
author: admin
applied_at: "2026-10-01T09:00:00.000Z"
models:
  kNNowledge/TestLab_coverage_TestLab:
    result_version: V_0-1-0
---

# NN index

* [[Change]]

# NN Change

## NN Change: cov-01
op:: add_model
target:: TestLab_coverage_TestLab
name:: TestLab Coverage Model
blueprint_name:: TestLab
blueprint_url:: specs/TestLab_V_0-1-0_spec_NN.md
knowledge_version:: V_0-1-0
evidence:: sources/import/field-notes.md@## Findings
author:: admin
status:: applied
applied_at:: 2026-10-01T09:00:00.000Z
batch:: testlab_admin_coverage_changes_NN
resolution:: Created model "TestLab_coverage_TestLab"

## NN Change: cov-02
op:: add_element
target:: kNNowledge/TestLab_coverage_TestLab@element-1a
concept:: Concept 1
name:: Element 1A
slug:: element-1a
fields:: {"summary":"Intake tray baseline element.","long_description":"Baseline element with a short description. It cites the field notes findings section.","manual":"test/fixtures/testlab/sources/import/manual.txt","sibling":"@element-2a","status":"draft"}
evidence:: sources/import/field-notes.md@## Findings
author:: admin
status:: applied
applied_at:: 2026-10-01T09:00:00.000Z
batch:: testlab_admin_coverage_changes_NN
resolution:: Applied successfully
resolved_slug:: element-1a

## NN Change: cov-03
op:: add_element
target:: kNNowledge/TestLab_coverage_TestLab@element-1b
concept:: Concept 1
name:: Element 1B
slug:: element-1b
fields:: {"summary":"Photo log element with image and file fields.","long_description":"Element 1B carries the image and file stress fields. The photo is the most trusted record on the bench and the handover note decides the next shift, so this element is the one the review pass targets first.","photo":"test/fixtures/testlab/sources/import/photo.png","photo_metadata":"{\"title\": \"Three-tray workbench\", \"author\": \"TestLab crew\", \"source\": \"field photo 2026-10-07\"}","attachment":"test/fixtures/testlab/sources/import/manual.txt","sibling":"@element-2a","status":"reviewed"}
evidence:: sources/import/dataset.csv@m-001
author:: admin
status:: applied
applied_at:: 2026-10-01T09:00:00.000Z
batch:: testlab_admin_coverage_changes_NN
resolution:: Applied successfully
resolved_slug:: element-1b

## NN Change: cov-04
op:: add_element
target:: kNNowledge/TestLab_coverage_TestLab@element-1c
concept:: Concept 1
name:: Element 1C
slug:: element-1c
fields:: {"summary":"Multi-node traceability source element.","long_description":"Element 1C exists so multi-node traceability has three legs: 1A cites markdown, 1B cites CSV plus image, 1C cites a JSON pointer. A traversal from any Concept 2 owner back through siblings must touch all three.","sibling":"@element-2b","status":"published"}
evidence:: sources/import/dataset.json@/items/0/name
author:: admin
status:: applied
applied_at:: 2026-10-01T09:00:00.000Z
batch:: testlab_admin_coverage_changes_NN
resolution:: Applied successfully
resolved_slug:: element-1c

## NN Change: cov-05
op:: add_element
target:: kNNowledge/TestLab_coverage_TestLab@element-2a
concept:: Concept 2
name:: Element 2A
slug:: element-2a
fields:: {"summary":"Shift owner element.","attachment":"test/fixtures/testlab/sources/import/manual.txt","owner":"@element-1a"}
evidence:: sources/import/field-notes.md@## Findings
author:: admin
status:: applied
applied_at:: 2026-10-01T09:00:00.000Z
batch:: testlab_admin_coverage_changes_NN
resolution:: Applied successfully
resolved_slug:: element-2a

## NN Change: cov-06
op:: add_element
target:: kNNowledge/TestLab_coverage_TestLab@element-2b
concept:: Concept 2
name:: Element 2B
slug:: element-2b
fields:: {"summary":"Handover owner element.","attachment":"test/fixtures/testlab/sources/import/manual.txt","owner":"@element-1c"}
evidence:: sources/import/dataset.csv@m-002
author:: admin
status:: applied
applied_at:: 2026-10-01T09:00:00.000Z
batch:: testlab_admin_coverage_changes_NN
resolution:: Applied successfully
resolved_slug:: element-2b
