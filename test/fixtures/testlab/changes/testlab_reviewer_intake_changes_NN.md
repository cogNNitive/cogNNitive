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
applied_at: "2026-10-21T14:30:00.000Z"
models:
  TestLab_intake_TestLab:
    base_version: V_0-1-0
    result_version: V_0-1-1
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
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-02
op:: update_field
target:: TestLab_intake_TestLab@intake-element&long_description
from:: Baseline element of the intake model, created by the administrator from the CSV dataset.
to:: Reviewer description: the intake baseline was written up from the CSV dataset during the review pass.
evidence:: sources/import/dataset.csv@m-001
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-03
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&string_field
from:: Initial string value
to:: Reviewed string value
evidence:: sources/import/field-notes.md@## Findings
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-04
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&number_field
from:: 0
to:: 42
evidence:: sources/import/dataset.csv@m-001
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-05
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&boolean_field
from:: false
to:: true
evidence:: decision
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-06
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&select_field
from:: draft
to:: reviewed
evidence:: decision
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-07
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&reference_field
from:: [[Intake owner]]
to:: [[Intake backup owner]]
evidence:: sources/import/report.pdf_sidecar_NN.md@## Findings
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-08
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&image_field
to:: test/fixtures/testlab/sources/import/photo.png
evidence:: sources/import/photo.png_sidecar_NN.md@## Caption
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-09
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&file_field
from:: test/fixtures/testlab/sources/import/manual.txt
to:: test/fixtures/testlab/sources/import/report.pdf
evidence:: decision
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-10
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&video_field
to:: test/fixtures/testlab/sources/import/demo.mp4
evidence:: sources/import/demo.mp4_sidecar_NN.md@## Transcript
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-11
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&audio_field
to:: test/fixtures/testlab/sources/import/interview.mp3
evidence:: sources/import/interview.mp3_sidecar_NN.md@## Transcript
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-12
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&url_field
from:: https://example.com/initial
to:: https://example.com/reviewed
evidence:: decision
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-13
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&markdown_inline_field
from:: Initial **inline** markdown.
to:: Reviewed **inline** markdown.
evidence:: decision
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-14
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&markdown_file_field
from:: test/fixtures/testlab/sources/import/field-notes.md
to:: test/fixtures/testlab/sources/import/manual.txt
evidence:: decision
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-15
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&knowledge_field
to:: kNNowledge/TestLab_coverage_TestLab_NN.md
evidence:: decision
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-16
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&address_field
from:: TestLab_intake_TestLab@intake-element
to:: TestLab_intake_TestLab@intake-owner
evidence:: decision
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-17
op:: update_field
target:: TestLab_intake_TestLab@modification-cases&citation_field
to:: [test/fixtures/testlab/sources/import/report.pdf_sidecar_NN.md@## Findings]
evidence:: sources/import/report.pdf_sidecar_NN.md@## Findings
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully

## NN Change: r-18
op:: update_matrix_cell
target:: TestLab_intake_TestLab@Concept 1-Concept 2 Matrix&Intake element&Intake owner
from:: relevant
to:: archived
evidence:: sources/import/dataset.csv@m-001
author:: reviewer
status:: applied
applied_at:: 2026-10-21T14:30:00.000Z
batch:: testlab_reviewer_intake_changes_NN
resolution:: Applied successfully
