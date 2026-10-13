# Delta for changeset-document-model

## ADDED Requirements

### Requirement: Changesets are the only change record

Changeset documents under `changes/` MUST be the only record of a change to model or domain data. No tool MAY write or read a parallel change record: no verdict ledger, no `## NN Agent Modification` block, no `.cogNNitive/change-log.jsonl` or other JSON change log, and no reviewer JSON export. Who changed what, why and from which evidence MUST be read from changeset changes (`author`, `notes`, `sources`) and their execution annotations.

#### Scenario: No parallel record is written
- GIVEN a domain where a changeset was proposed and applied
- WHEN the domain is listed
- THEN the only new change record is the changeset under `changes/`
- AND no ledger, change-log or Agent Modification block was written

#### Scenario: No parallel record exists in the code
- GIVEN the repository after this change
- WHEN searched outside write-once files and archived changes
- THEN no writer or reader of a verdict ledger, change-log library or Agent Modification block exists
