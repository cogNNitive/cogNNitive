---
level: 3
parent_spec:
  name: "procedures_V_0-4-0"
  url: "iNNfo/specs/bluepriNNts/procedures/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "TestLab Verification Procedures"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.

# NN Procedure

## NN Procedure: Verify Changeset Lineage
slug:: verify-changeset-lineage
category:: audit
summary:: Walk through the generated domain console and confirm that Element 1B of the coverage model shows its changeset lineage.
inputs_required:: The TestLab Coverage Model and its generated domain console
outputs_expected:: A verified changeset lineage entry for Element 1B
executed_by:: Domain Reviewer
procedure_model:: kNNowledge/TestLab_procedures_TestLab_procedures_NN.md

## NN Procedure: Propose a Review Change
slug:: propose-a-review-change
category:: transformation
summary:: Make a change from the console review modal and hand the generated changeset to the agent so it seals and applies it.
inputs_required:: The generated domain console
outputs_expected:: An applied changeset in changes/
executed_by:: Domain Reviewer
procedure_model:: kNNowledge/TestLab_procedures_TestLab_procedures_NN.md

# NN Work

## NN Work: TestLab Guided Verification
slug:: testlab-guided-verification
step_type:: task
scope:: internal
End-to-end walkthrough that proves the changeset lineage pipeline: open the generated domain console, enable Review mode, open Element 1B of the TestLab Coverage Model, and confirm that it shows the applied review change fb-001. It then shows how a reviewer proposes a new change.

## NN Work: Open the Domain Console
slug:: open-the-domain-console
parent:: [[TestLab Guided Verification]]
step_type:: task
next:: [[Enable Review Mode]]
condition:: A generated console exists at the domain root
scope:: internal
Open domaiNN_console.html at the domain root. It is a single self-contained file: double-click it and it runs offline in any browser.

## NN Work: Enable Review Mode
slug:: enable-review-mode
parent:: [[TestLab Guided Verification]]
step_type:: task
next:: [[Open Element 1B]]
condition:: The domain console is open
scope:: internal
Click "Review mode" in the top banner. Until this is on, element field anchors are not clickable and the review modal cannot be opened.

## NN Work: Open Element 1B
slug:: open-element-1b
parent:: [[TestLab Guided Verification]]
step_type:: task
next:: [[Read the Changeset Lineage]]
condition:: Review mode is enabled
scope:: internal
Open the TestLab Coverage Model and click a field row of Element 1B (for example the "photo" row). The element modal opens with two tabs: Edit and History & Provenance.

## NN Work: Read the Changeset Lineage
slug:: read-the-changeset-lineage
parent:: [[TestLab Guided Verification]]
step_type:: decision
next:: [[Propose a Change in the Console]]
condition:: The element modal is open on Element 1B
scope:: internal
Switch to the "History & Provenance" tab. Under "Changeset Lineage & Revision History" you must see the applied review change fb-001: author "reviewer", the UTC timestamp 2026-10-10T12:00:00.000Z, and its note. If the section reads "No recorded prior changesets", the change did not reach the console and the lineage pipeline is broken.

## NN Work: Propose a Change in the Console
slug:: propose-a-change-in-the-console
parent:: [[TestLab Guided Verification]]
step_type:: task
next:: [[Copy the Changeset Prompt]]
condition:: Review mode is enabled
scope:: internal
Change a field value or leave a comment in the element modal to record a draft. This is how a reviewer proposes a change without editing the model by hand.

## NN Work: Copy the Changeset Prompt
slug:: copy-the-changeset-prompt
parent:: [[TestLab Guided Verification]]
step_type:: task
condition:: At least one draft is pending
scope:: internal
Click "Export changes", then "Copy Changeset Prompt", and paste the result to the agent. The agent writes the changeset into changes/ and applies it; the engine seals the proposal and rewrites the touched field's citation, so the lineage grows with the next regeneration.
