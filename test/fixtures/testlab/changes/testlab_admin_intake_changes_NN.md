---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
blueprint_version: "V_0-5-5"
status: applied
title: "Admin: create the TestLab intake model from the PDF, CSV and JSON sources"
author: admin
applied_at: "2026-10-20T09:00:00.000Z"
models:
  TestLab_intake_TestLab:
    result_version: V_0-1-0
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.

# NN index

* [[Change]]

# NN Change

## NN Change: a-01
op:: add_model
target:: TestLab_intake_TestLab
name:: TestLab Intake Model
blueprint_name:: TestLab
blueprint_url:: specs/TestLab_V_0-1-0_spec_NN.md
knowledge_version:: V_0-1-0
evidence:: sources/import/report.pdf_sidecar_NN.md@## Findings
author:: admin
status:: applied
applied_at:: 2026-10-20T09:00:00.000Z
batch:: testlab_admin_intake_changes_NN
resolution:: Created model "TestLab_intake_TestLab"

## NN Change: a-02
op:: add_element
target:: TestLab_intake_TestLab@Concept 1
concept:: Concept 1
name:: Intake element
slug:: intake-element
fields:: {"summary":"Intake baseline created from the CSV dataset.","long_description":"Baseline element of the intake model, created by the administrator from the CSV dataset.","status":"draft"}
evidence:: sources/import/dataset.csv@m-001
author:: admin
status:: applied
applied_at:: 2026-10-20T09:00:00.000Z
batch:: testlab_admin_intake_changes_NN
resolution:: Applied successfully
resolved_slug:: intake-element

## NN Change: a-03
op:: add_element
target:: TestLab_intake_TestLab@Concept 2
concept:: Concept 2
name:: Intake owner
slug:: intake-owner
fields:: {"summary":"Owner derived from the JSON payload.","owner":"[[Intake element]]"}
evidence:: sources/import/dataset.json@/items/0/name
author:: admin
status:: applied
applied_at:: 2026-10-20T09:00:00.000Z
batch:: testlab_admin_intake_changes_NN
resolution:: Applied successfully
resolved_slug:: intake-owner

## NN Change: a-04
op:: add_element
target:: TestLab_intake_TestLab@Concept 2
concept:: Concept 2
name:: Intake backup owner
slug:: intake-backup-owner
fields:: {"summary":"Secondary owner derived from the PDF report.","owner":"[[Intake element]]"}
evidence:: sources/import/report.pdf_sidecar_NN.md@## Findings
author:: admin
status:: applied
applied_at:: 2026-10-20T09:00:00.000Z
batch:: testlab_admin_intake_changes_NN
resolution:: Applied successfully
resolved_slug:: intake-backup-owner

## NN Change: a-05
op:: add_element
target:: TestLab_intake_TestLab@Modification Cases
concept:: Modification Cases
name:: Modification cases
slug:: modification-cases
fields:: {"string_field":"Initial string value","number_field":"0","boolean_field":"false","select_field":"draft","reference_field":"[[Intake owner]]","url_field":"https://example.com/initial","markdown_inline_field":"Initial **inline** markdown.","markdown_file_field":"test/fixtures/testlab/sources/import/field-notes.md","knowledge_field":"kNNowledge/TestLab_coverage_TestLab_NN.md","address_field":"TestLab_intake_TestLab@intake-element"}
evidence:: sources/import/report.pdf_sidecar_NN.md@## Findings
author:: admin
status:: applied
applied_at:: 2026-10-20T09:00:00.000Z
batch:: testlab_admin_intake_changes_NN
resolution:: Applied successfully
resolved_slug:: modification-cases

## NN Change: a-06
op:: add_matrix
target:: TestLab_intake_TestLab@matrix:Concept 1-Concept 2 Matrix
name:: Concept 1-Concept 2 Matrix
concept:: Concept 1
to:: Concept 2
evidence:: sources/import/dataset.csv@m-001
author:: admin
status:: applied
applied_at:: 2026-10-20T09:00:00.000Z
batch:: testlab_admin_intake_changes_NN
resolution:: Added matrix "Concept 1-Concept 2 Matrix"

## NN Change: a-07
op:: update_matrix_cell
target:: TestLab_intake_TestLab@Concept 1-Concept 2 Matrix&Intake element&Intake owner
to:: relevant
evidence:: sources/import/dataset.csv@m-001
author:: admin
status:: applied
applied_at:: 2026-10-20T09:00:00.000Z
batch:: testlab_admin_intake_changes_NN
resolution:: Applied successfully
