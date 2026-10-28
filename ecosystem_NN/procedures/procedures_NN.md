---
level: 3
parent_spec:
  name: "procedures"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/procedures/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "cogNNitive Monorepo Procedures Catalog"
---

# NN Procedure

## NN Procedure: Verify Monorepo Integrity
category:: audit
summary:: Deterministic multi-group gate validating working tree hygiene, version squares, manifest parity, orchestrator lines, and test suites.
inputs_required:: Workspace Metamodel Specification
outputs_expected:: Integrity Verification Gate Report
executed_by:: Lead Maintainer
procedure_model:: .agents/skills/nn-dev-check-integrity/SKILL.md

## NN Procedure: Release and Tag Subsystems
category:: transformation
summary:: Orchestration procedure for bumper management, stable manifest generation, immutable git tagging, and GitHub Release publication.
inputs_required:: cogNNitive Repository Model
outputs_expected:: Published Subsystem Bundles and Tags
executed_by:: Release Manager
procedure_model:: .agents/skills/nn-dev-release/SKILL.md

## NN Procedure: Track and Import Issues
category:: audit
summary:: Two-repo issue governance — sweeps the public intake (cogNNitive-web), triages each open issue (fixes-here / web-only / already-fixed), and imports engineering issues into the source-of-truth tracker (cogNNitive) with traceability.
inputs_required:: cogNNitive-web Open Issues, cogNNitive Issue Tracker
outputs_expected:: Triaged Intake Sweep Report and Traceability Ledger
executed_by:: Lead Maintainer
procedure_model:: .agents/skills/nn-dev-issue-tracking/SKILL.md

## NN Procedure: Reconcile Artifact Feedback
category:: transformation
summary:: Dual-emission deliverable compiler, forensic Word/Markdown annotation extractor, 4-layer discrepancy triage engine, and upstream iNNfo domain model reconciler.
inputs_required:: Reviewed Deliverable Document
outputs_expected:: Published Final Deliverable
executed_by:: Senior AI Architect
procedure_model:: procedures/reconcile_artifact_feedback_NN.md
