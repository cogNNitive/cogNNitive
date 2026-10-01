# Delta for dev-skills

## MODIFIED Requirements

### Requirement: Session-attributed in-flight work

The repository MUST isolate every write-intended session in its own checkout — a `git worktree` of `dev` — so no two sessions ever share a directory, and in-flight work is attributable by construction. A session SHALL commit early and often; work that must survive a crash without merging SHALL be committed as `wip:<session-id>: <reason>` on `dev`. (Previously: the shared tree made work attributable only via a `wip:` commit or maintainer confirmation, and an anonymous dirty tree blocked the first write.)

#### Scenario: A session works in its own worktree

- GIVEN a write-intended session with id `<session-id>` on `dev`
- WHEN the session starts
- THEN the session-start helper SHALL create, or reuse, a `git worktree` of `dev` for that session
- AND the session SHALL perform its writes inside that worktree, never the primary checkout.

#### Scenario: WIP commit carries session identity

- GIVEN a session with id `<session-id>` whose work must survive a crash without merging
- WHEN the work is committed
- THEN it SHALL commit as `wip:<session-id>: <reason>` on `dev`.

#### Scenario: Commit early, not freeze

- GIVEN uncommitted paths in a session's worktree
- WHEN the session continues to write
- THEN it SHALL prefer committing, or stashing with a session note, over leaving the tree dirty across tool-call boundaries.

## REMOVED Requirements

### Requirement: Dirty-tree age rule

(Reason: superseded by session isolation — a dirty tree is always the current session's own work, never anonymous, so there is nothing to expire.)
(Migration: the `wip:<session-id>` checkpoint convention remains as the durability mechanism.)

### Requirement: Session claim on the shared tree

(Reason: superseded by session isolation — the claim is the session's own worktree branch + id, not a path-level claim on a shared tree.)
(Migration: the concurrency scan remains, but only as an informational block.)

## ADDED Requirements

### Requirement: Gates run against committed HEAD

The deterministic gate MUST evaluate its checks against committed `HEAD` (or a detached clean worktree), never a shared dirty tree, so one session's uncommitted WIP SHALL NOT redden another session's gate.

#### Scenario: Dirty session tree does not redden the gate

- GIVEN a session worktree with uncommitted files
- WHEN another session runs the deterministic gate against `HEAD`
- THEN the gate SHALL NOT read the dirty worktree for its verdicts.
