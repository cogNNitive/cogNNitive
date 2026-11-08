# Delta for conntent-skill

## ADDED Requirements

### Requirement: SKILL.md routes to the state-aware entry point

SKILL.md MUST define the `nn-conntent` entry point as the first thing an agent does in a coNNtent context: it MUST instruct the agent to detect the state of the domaiNN from its files and to propose one of the six procedures of `conntent-procedures` ("State-aware entry point"), asking for confirmation before starting it. SKILL.md MUST NOT restate the detection rules or the procedure steps as prose; it MUST point to the procedures document. The skill description (frontmatter) MUST make the skill the one that triggers for coNNtent domaiNNs, so that the legacy `nn-video-script` skill is not selected for them.

#### Scenario: Entry point is documented
- GIVEN SKILL.md
- WHEN its first workflow section is read
- THEN it directs the agent to detect state and propose a procedure, and names the procedures document

#### Scenario: No restated rules
- GIVEN SKILL.md
- WHEN searched for the detection rule list of the entry point
- THEN the rules are referenced, not copied

#### Scenario: Skill description claims coNNtent
- GIVEN the frontmatter description
- WHEN read
- THEN it names coNNtent domaiNNs, episodes and series as its trigger

## MODIFIED Requirements

### Requirement: Draft Procedure Emits A Proposed Changeset

The skill MUST provide the Plan an Episode procedure (`conntent-procedures`) that an agent follows to produce, for one episode, a proposed changeset containing only creative work: narration, the scene kind of every scene, visual asset selection, image prompts, and the publication description prose. The agent MUST deliver it as a sealed proposed changeset (written with `writeProposedChangeset`), which MUST pass validation against the field registry, the Series kinds and the merged catalog by a dry apply before it is applied. `produce` applies it and sets the episode to `draft` (capability `conntent-produce-command` "Intake Applies The Proposed Changeset"); the agent MUST NOT apply it itself. The agent MUST NOT write `status`, `master`, `review::` or any gate verdict, select models outside the cascade, apply chrome, or sequence engine steps. The agent MUST NOT call or emulate a verdict operation: approval of a gate comes only from a human changeset applied by the engine.
(Previously: the procedure was called the draft procedure and did not forbid `review::` or gate verdicts, which were possible before gates were derived from human changesets.)

Source: D6, D13, D11.

#### Scenario: Procedure delivers a valid changeset
- GIVEN an `idea` episode with linked Sources in a Series with kinds
- WHEN the agent completes Plan an Episode
- THEN a sealed proposed changeset exists whose scenes each state a known `kind::`
- AND it passes the registry and catalog checks and is not yet applied

#### Scenario: Invalid proposal is not delivered
- GIVEN a proposal containing an unknown key or an unknown kind
- WHEN the procedure validates it
- THEN it fails with the named error and no changeset is delivered

#### Scenario: Agent does not touch engine-owned fields
- GIVEN a proposed changeset that sets `status:: produced` or `master`
- WHEN it is validated
- THEN it is rejected naming the engine-owned field

#### Scenario: Agent cannot approve
- GIVEN a proposed changeset that contains a `review_gate` operation or sets `review:: approved`
- WHEN it is validated
- THEN it is rejected naming the verdict operation (`GATE_VERDICT_REFUSED`) or the engine-owned field

#### Scenario: Regeneration touches one scene
- GIVEN a scene marked `needs-change` with a comment
- WHEN the agent runs the procedure for that scene
- THEN the new proposed changeset addresses only that scene (see video-script-review)

### Requirement: Produce Is The Single Entry Command

SKILL.md MUST document `produce <episode>` as the only command an agent runs after a script is proposed, and MUST document the stops with the exit codes defined by `conntent-produce-command` "Produce Stops At Gates And Spend Stops" (10 for a `script`, `preview` or inserted `budget` gate, 11 for a spend stop, 12 for `failed_qa`), and how to continue from each: for a gate, the human approves it in the console (or by the console's download fallback) and the agent runs `produce` again; for a spend stop, the human sets `budget` or waits for the daily cap; for `failed_qa`, the cause is fixed and `produce` re-run. SKILL.md MUST state that gate approval is never given by passing a flag or hash to `produce` and never by the agent, and that delivery is automatic after QA. It MUST NOT document a sequence of `compile`, `synthesize-avatar`, `render` or finalize steps for the agent to run.
(Previously: two stops, a review gate (exit 10) and a budget gate (exit 11) resumed with `--approve <plan_hash>`.)

Source: D6, D11, C3, C4.

#### Scenario: Workflow names one command
- GIVEN SKILL.md
- WHEN its workflow section is read
- THEN it names Plan an Episode, the console review, and `produce`, and no other engine step

#### Scenario: Stops are documented
- GIVEN SKILL.md
- WHEN the section on `produce` is read
- THEN it names the gate stops and states that the human approves in the console before the agent re-runs `produce`

#### Scenario: No approval flag
- GIVEN SKILL.md
- WHEN searched for `--approve`
- THEN no match is found

#### Scenario: No delivery step
- GIVEN SKILL.md
- WHEN searched for a deliver command or step
- THEN none exists and delivery is described as automatic
