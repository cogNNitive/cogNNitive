---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
blueprint_version: "V_0-5-5"
status: applied
title: "Reviewer: every modification case on the intake model"
author: reviewer
applied_at: 2026-10-21T14:30:00.000Z
models:
  TestLab_intake_TestLab:
    base_version: V_0-1-0
    result_version: V_0-1-1
proposal_sha: a0ec6c2c25d4fd857d46a3adc70cf175ee0e33ef47e794f5b740f6b7c75c8b01
batch: testlab_reviewer_intake_changes
---

# NN index

* [[Change]]

# NN Change

## NN Change: r-01
op:: rename_element
target:: TestLab_intake_TestLab@modification-cases
from:: Modification cases
name:: Modification cases (reviewed)
evidence:: decision
author:: reviewer

## NN Change: r-02
op:: update_field
target:: TestLab_intake_TestLab@intake-element&long_description
from:: Baseline element of the intake model, created by the administrator from the CSV dataset.
to:: Reviewer description: the intake baseline was written up from the CSV dataset during the review pass.
evidence:: sources/import/dataset.csv@m-001
author:: reviewer

## NN Change: r-03
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&string_field
from:: Initial string value
to:: Reviewed string value
evidence:: sources/import/field-notes.md@## Findings
author:: reviewer

## NN Change: r-04
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&number_field
from:: 0
to:: 42
evidence:: sources/import/dataset.csv@m-001
author:: reviewer

## NN Change: r-05
op:: set_fields
target:: TestLab_intake_TestLab@modification-cases
from:: {"boolean_field":"false","select_field":"draft"}
to:: {"boolean_field":"true","select_field":"reviewed"}
evidence:: decision
author:: reviewer

## NN Change: r-07
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&reference_field
from:: @intake-owner
to:: @intake-backup-owner
evidence:: sources/import/report.pdf_sidecar_NN.md@## Findings
author:: reviewer

## NN Change: r-08
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&image_field
to:: test/fixtures/testlab/sources/import/photo.png
evidence:: sources/import/photo.png_sidecar_NN.md@## Caption
author:: reviewer

## NN Change: r-09
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&file_field
from:: test/fixtures/testlab/sources/import/manual.txt
to:: test/fixtures/testlab/sources/import/report.pdf
evidence:: decision
author:: reviewer

## NN Change: r-10
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&video_field
to:: test/fixtures/testlab/sources/import/demo.mp4
evidence:: sources/import/demo.mp4_sidecar_NN.md@## Transcript
author:: reviewer

## NN Change: r-11
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&audio_field
to:: test/fixtures/testlab/sources/import/interview.mp3
evidence:: sources/import/interview.mp3_sidecar_NN.md@## Transcript
author:: reviewer

## NN Change: r-12
op:: set_fields
target:: TestLab_intake_TestLab@modification-cases
from:: {"url_field":"https://example.com/initial","markdown_inline_field":"Initial **inline** markdown.","markdown_file_field":"test/fixtures/testlab/sources/import/field-notes.md","address_field":"TestLab_intake_TestLab@intake-element"}
to:: {"url_field":"https://example.com/reviewed","markdown_inline_field":"Reviewed **inline** markdown.","markdown_file_field":"test/fixtures/testlab/sources/import/manual.txt","knowledge_field":"kNNowledge/TestLab_coverage_TestLab_NN.md","address_field":"TestLab_intake_TestLab@intake-owner"}
evidence:: decision
author:: reviewer

## NN Change: r-17
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&citation_field
to:: [test/fixtures/testlab/sources/import/report.pdf_sidecar_NN.md@## Findings]
evidence:: sources/import/report.pdf_sidecar_NN.md@## Findings
author:: reviewer

## NN Change: r-18
op:: update_matrix_cell
target:: TestLab_intake_TestLab@Concept 1-Concept 2 Matrix&Intake element&Intake owner
from:: relevant
to:: archived
evidence:: sources/import/dataset.csv@m-001
author:: reviewer
