# Workspace Git Collaboration Specification

## Purpose

Safe, explicitly-invoked workflow that mirrors a workspace to Git for review. iNNfo remains the system of record; Git is a review-only layer with an anti-accident gate, private defaults, and offline backup.

## Requirements

### Requirement: Explicit Invocation Gate

The skill MUST activate only via explicit user invocation of `/nn-workspace-git`. Its frontmatter MUST declare `disable-model-invocation: true`. It MUST show an alpha warning restricting use to technicians with prior Git experience. It MUST verify git and authentication as prerequisites and MUST abort with no side effects when either is missing. Remote or destructive operations MUST require double confirmation.

#### Scenario: Explicit invocation runs the gate

- GIVEN a technician types `/nn-workspace-git`
- WHEN the skill starts
- THEN the alpha warning is shown before any Git operation

#### Scenario: Missing prerequisite aborts cleanly

- GIVEN git or authentication is unavailable
- WHEN the skill runs its prerequisite check
- THEN it aborts with no repo, branch, or remote changes

#### Scenario: Single confirmation is insufficient

- GIVEN a remote or destructive operation is requested
- WHEN only one confirmation is given
- THEN the operation MUST NOT execute

### Requirement: Private Repository Default with Opinionated Ignore Rules

New repositories MUST default to private. The generated `.gitignore` MUST exclude `staging/`, heavy `original/` inputs, generated `specs/` cache output, and secrets (tokens, `*.env` files).

#### Scenario: Fresh repo is private and guarded

- GIVEN initialization of a workspace repo
- WHEN defaults are applied
- THEN visibility is private AND `staging/`, heavy `original/` files, `specs/` cache, and `*.env`/tokens are ignored

#### Scenario: Secret file stays untracked

- GIVEN a token file is added to the workspace
- WHEN `git status` is inspected
- THEN the file is ignored and never staged

### Requirement: Branch-per-Change with Gated Review

Each change MUST use its own branch and a pull request. The PR MUST pass the `validate` and `check_workspace` gates before merge. The `main` branch MUST be protected and MUST require at least 1 approval.

#### Scenario: Gated PR merges

- GIVEN a change branch with passing `validate` and `check_workspace` plus 1 approval
- WHEN merge to `main` is requested
- THEN the merge is permitted

#### Scenario: Ungated merge is blocked

- GIVEN a PR missing a gate result or approval
- WHEN merge to `main` is requested
- THEN the merge is blocked

### Requirement: Two-Layer Version Map

`V_x-y-z` model versions MUST remain the system of record; Git commits MUST be tracked as a separate review layer. The skill MUST maintain an explicit map of each model version to its corresponding commit.

#### Scenario: Version resolves to commit without conflation

- GIVEN a released model version `V_x-y-z`
- WHEN the map is consulted
- THEN it returns the corresponding commit AND the version is never treated as equal to the commit

### Requirement: Timestamped Offline Backup

Before deep changes the skill MUST write a timestamped filesystem copy outside the workspace directory.

#### Scenario: Backup precedes deep change

- GIVEN a pending deep change
- WHEN execution begins
- THEN a timestamped copy exists outside the workspace with an earlier timestamp than the change

### Requirement: iNNfo Boundary

The skill MUST NOT modify `nn-innfo`, any template, or any spec canonical URL. Git remains review-only.

#### Scenario: Boundary holds after a run

- GIVEN a completed `/nn-workspace-git` run
- WHEN `nn-innfo` files and template URLs are diffed
- THEN zero modifications are reported
