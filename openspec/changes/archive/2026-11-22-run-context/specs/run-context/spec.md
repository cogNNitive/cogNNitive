# Delta for run-context

A procedure step's changes are indistinguishable from every other change once applied: nothing on the change or its changeset says which run, or which step of that run, wrote it. "What did this step produce" is answered by parsing the whole log and guessing, and a run's history has no address of its own.

This change gives a changeset a run context: a sealed `run:: <run-id>@<step-slug>` frontmatter, and a run-scoped read over the change log. It is the read the procedure runner builds on (B2) and the link from a produced element back to its run.

## ADDED Requirements

### Requirement: A changeset may carry a run context

A changeset frontmatter MAY declare `run` as a non-empty string of the form `<run-id>@<step-slug>`, and the `changes` bluepriNNt MUST declare `run` as a field of the `Change` concept.

An empty `run` value MUST be rejected at parse time.
The `run` context MUST be sealed into `proposal_sha`.
A changeset without `run` MUST keep applying exactly as before.

#### Scenario: A run context is sealed
- GIVEN two identical changes, one sealed with `run: run-1@draft` and one sealed without
- WHEN both seals are computed
- THEN they differ

#### Scenario: An empty run context is rejected
- GIVEN a changeset whose frontmatter declares `run: ""`
- WHEN the changeset is parsed
- THEN it is rejected as a malformed frontmatter

### Requirement: The change log can be read per run

The change log MUST expose the applied changes of one run, in canonical order, selected by the `run` context their changeset carried.

With a step slug, the read MUST narrow to that step.
A run id MUST NOT match a longer run id that merely starts with it.
A change whose changeset carried no `run` MUST NOT appear in any run-scoped read.

#### Scenario: A run's changes are read
- GIVEN three applied changesets naming `run-1@draft`, `run-1@seal` and `run-2@draft`
- WHEN the log is read for `run-1`
- THEN it returns the two `run-1` changes and nothing from `run-2`

#### Scenario: A prefix is not a run
- GIVEN an applied changeset naming `run-10@draft`
- WHEN the log is read for `run-1`
- THEN nothing is returned
