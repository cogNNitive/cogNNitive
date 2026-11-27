# Delta for archive-lifecycle

Procedure runs grow without bound and, once closed, bury the active runs in the domain console. This change only changes how closed runs are shown: the console's run view splits into Active and History (N), keyed on the `closed: true` frontmatter that `close_model` already writes. It changes no stored byte.

The first draft of this change (archived run state, cold placement, changeset relocation with a change-log seal, compact segment rotation, a universal archive op and an automatic `archive_policy`) was rejected by a multi-model review. Its reasoning, decisions D1-D11 and the reviewers' reports are preserved in `openspec/analysis/2026-11-27-archive-lifecycle/`, starting with `consolidated-plan-and-verdict.md`. Read them before proposing any storage-level archival: each rejected mechanism breaks an existing contract (placement-derived identity, `close_model` immutability, `evidence_sha256`, the single `changes/` log, `write_policy`, the private run output paths).

Non-goals, each with the decision that rejected or deferred it: no `archived` value in a run's `state` and no write to a closed run (D1); no relocation of an instance to a cold placement (D2); no moving or sealing of changesets (D3); no compact segment rotation (D4); no universal archive or unarchive op (D6); no `archive_policy` and no automatic archival pass (D7); no change to any MCP tool output, discovery, validation or lineage. Reopen any of them only when a real use case breaks with this view, and decide then whether that case is out of scope.

## ADDED Requirements

### Requirement: The console splits procedure runs into Active and History

The domain console MUST show, by default, only the runs of a procedure whose model is not closed (`closed: true` absent from its frontmatter), and MUST collapse the closed runs into a History section that shows their count and can be expanded.
A run that reached a terminal `state` but whose `close_model` was not applied MUST stay in the Active section.
Expanding History MUST list every closed run with its terminal `state`, and opening one MUST show the same run detail as an active run, read-only.

#### Scenario: Closed runs leave the default view
- GIVEN a procedure with three open runs and forty runs closed with `close_model`
- WHEN the console opens the procedure
- THEN it lists the three open runs
- AND it shows a History section with the count 40, collapsed

#### Scenario: A terminal run that was not closed stays active
- GIVEN a run in state `completed` whose model does not carry `closed: true`
- WHEN the console opens its procedure
- THEN the run is listed in the Active section

#### Scenario: A closed run is reachable from History
- GIVEN a procedure with a closed run `r-7` in state `completed`
- WHEN History is expanded and `r-7` is opened
- THEN the console shows the run's steps and artifacts as recorded, with no action available

### Requirement: The split changes no stored data

Splitting runs into Active and History MUST be computed when the console is built and MUST NOT write, move, rename or remove any file of the domaiNN.
Every closed run MUST keep resolving exactly as before: by its hierarchical id through `read_knowledge` and `procedure_state`, and as a cited source with its unchanged `evidence_sha256`.

#### Scenario: Building the console leaves the domaiNN untouched
- GIVEN a domaiNN with open and closed runs
- WHEN the console is exported
- THEN no file under the domaiNN root changes, except the console output itself

#### Scenario: A citation of a closed run still verifies
- GIVEN a changeset that cites the closed run `r-7` as evidence with its `evidence_sha256`
- WHEN the domaiNN is validated after the split ships
- THEN the citation resolves and its hash matches
