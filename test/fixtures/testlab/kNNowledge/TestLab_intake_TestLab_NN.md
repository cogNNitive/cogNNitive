---
level: 3
parent_spec:
  name: "TestLab"
  url: "specs/TestLab_V_0-1-0_spec_NN.md"
knowledge_version: "V_0-1-1"
title: "TestLab Intake Model"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.

# NN Concept 1

## NN Concept 1: Intake element
slug:: intake-element
summary:: Intake baseline created from the CSV dataset.
long_description:: Baseline element of the intake model, created by the administrator from the CSV dataset. The reviewer rewrote this description during the review pass.
status:: reviewed
Intake element is the element the reviewer renamed nothing on; its description is one of the modification cases.

# NN Concept 2

## NN Concept 2: Intake owner
slug:: intake-owner
summary:: Owner derived from the JSON payload.
owner:: [[Intake element]]
Intake owner closes the intake matrix crossing with Intake element.

## NN Concept 2: Intake backup owner
slug:: intake-backup-owner
summary:: Secondary owner derived from the PDF report.
owner:: [[Intake element]]
Intake backup owner gives the reference field a second target so a reference edit is a real change.

# NN Modification Cases

## NN Modification Cases: Modification cases (reviewed)
slug:: modification-cases
string_field:: Reviewed string value
number_field:: 42
boolean_field:: true
select_field:: reviewed
reference_field:: [[Intake backup owner]]
image_field:: test/fixtures/testlab/sources/import/photo.png
file_field:: test/fixtures/testlab/sources/import/report.pdf
video_field:: test/fixtures/testlab/sources/import/demo.mp4
audio_field:: test/fixtures/testlab/sources/import/interview.mp3
url_field:: https://example.com/reviewed
markdown_inline_field:: Reviewed **inline** markdown.
markdown_file_field:: test/fixtures/testlab/sources/import/manual.txt
knowledge_field:: kNNowledge/TestLab_coverage_TestLab_NN.md
address_field:: TestLab_intake_TestLab@intake-owner
citation_field:: [sources/import/report.pdf_sidecar_NN.md@## Findings]
Modification cases carries one field of every Level-1 field type; the reviewer edited one field of each type on this element.

# NN matrices: Concept 1-Concept 2 Matrix
| Concept 1 \ Concept 2 | Intake owner | Intake backup owner |
| :--- | :---: | :---: |
| Intake element | archived | - |
