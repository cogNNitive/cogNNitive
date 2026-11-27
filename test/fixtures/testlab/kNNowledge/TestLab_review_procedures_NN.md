---
level: 3
parent_spec:
  name: "procedures_V_0-6-1"
  url: "iNNfo/specs/bluepriNNts/procedures/spec_NN.md"
knowledge_version: "V_0-2-0"
title: "TestLab Review Proposals"
---

# NN Procedure

## NN Procedure: Review Proposal Pipeline
slug:: review-proposal-pipeline
category:: transformation
summary:: Intake review comments, triage proposal scope, choose between minor field patch and major schema restructuring, validate and stage changeset.
inputs_required:: Domain console export and review feedback
outputs_expected:: Staged changeset ready for sealing
executed_by:: Domain Reviewer
procedure_model:: kNNowledge/TestLab_review_procedures_NN.md

# NN Work

## NN Work: Intake Change Request
slug:: intake-change-request
step_type:: task
executor:: human
next:: @triage-proposal-scope
scope:: internal
Review feedback submitted via console review mode or issue ticket.

## NN Work: Triage Proposal Scope
slug:: triage-proposal-scope
step_type:: decision
executor:: human
decision:: Is this change a minor field patch or a structural concept refactor?
next:: [@patch-field-value, @restructure-concept-schema]
scope:: internal
Evaluate whether the requested edit modifies existing field values or requires adding or modifying concepts.

## NN Work: Patch Field Value
slug:: patch-field-value
step_type:: task
executor:: human
condition:: outcome == minor
next:: @validate-inline-patch
scope:: internal
Update element field directly in the review modal.

## NN Work: Validate Inline Patch
slug:: validate-inline-patch
step_type:: task
executor:: agent
next:: @stage-changeset-proposal
scope:: internal
Run automated schema validators against the proposed field edit.

## NN Work: Restructure Concept Schema
slug:: restructure-concept-schema
step_type:: task
executor:: human
condition:: outcome == major
next:: @simulate-migration-impact
scope:: internal
Draft a new concept or modify relation targets in the blueprint schema.

## NN Work: Simulate Migration Impact
slug:: simulate-migration-impact
step_type:: task
executor:: agent
next:: @stage-changeset-proposal
scope:: internal
Run dry-run migration check across all existing elements.

## NN Work: Stage Changeset Proposal
slug:: stage-changeset-proposal
step_type:: task
executor:: human
next:: @sign-off-proposal
scope:: internal
Rejoin point: generate the changeset markdown document from pending drafts.

## NN Work: Sign Off Proposal
slug:: sign-off-proposal
step_type:: task
executor:: human
scope:: internal
Final approval of the proposal before passing to the engine for application.
