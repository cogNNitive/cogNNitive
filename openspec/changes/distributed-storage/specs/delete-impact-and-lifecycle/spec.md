# Delta for delete-impact-and-lifecycle

Living spec read: `openspec/specs/delete-impact-and-lifecycle/spec.md`. The three existing requirements keep their behaviour. The requirements below make two of their implicit assumptions explicit and testable under hierarchical identity: impact is keyed by hierarchical id (the audited code keys workspace models by `displayStem`, so models with the same stem collapse), and the staleness scan is keyed by model id plus slug (element slugs such as `00-gancho` repeat across instance models).

## ADDED Requirements

### Requirement: Delete impact is keyed by hierarchical id

When computing the incoming references to an element, the engine MUST identify each workspace model by its hierarchical id, never by filename stem or `displayStem`. Two models whose stems are equal MUST be two distinct models in the impact analysis. Reference points MUST be matched on the full address `<model_id>@<slug>`.

#### Scenario: Equal stems do not collapse
- GIVEN `villabotijos-today/intro` and `innteresante/intro` whose files have equal stems, and a reference to `innteresante/intro@00-gancho` from `innteresante/pitch`
- WHEN `remove_element` targets `villabotijos-today/intro@00-gancho`
- THEN the reference from `innteresante/pitch` does not block the removal
- AND the removal applies cleanly

#### Scenario: Reference to the right instance blocks
- GIVEN the same layout
- WHEN `remove_element` targets `innteresante/intro@00-gancho`
- THEN the change is `status:: conflict` with `resolution:: REFERENCED_BY: innteresante/pitch&<field>`
- AND the Scene is not removed

#### Scenario: Cascaded cells stay within the model
- GIVEN a matrix in `villabotijos-today/intro` with a row `00-gancho` and the same slug in another instance model
- WHEN `remove_element` removes `00-gancho` from `villabotijos-today/intro`
- THEN only cells of `villabotijos-today/intro` are cascaded

### Requirement: The staleness scan is keyed by model id and slug

The reverse scan of `changes/` that detects deletion after `base_version` MUST match a prior `remove_element` or `add_element` on the full address (model id plus slug). A removal of slug `00-gancho` in one instance model MUST NOT mark a pending change on slug `00-gancho` of another instance model as stale. The 50-changeset cap and the stop at the most recent `add_element` for that address are unchanged.

#### Scenario: Same slug, other instance
- GIVEN a changeset that removed `00-gancho` from `villabotijos-today/intro` after a pending changeset's `base_version`
- WHEN the pending changeset targets `innteresante/intro@00-gancho&voice`
- THEN no `STALE_TARGET_DELETED` conflict is raised

#### Scenario: Same instance
- GIVEN the same removal and a pending change targeting `villabotijos-today/intro@00-gancho&voice`
- WHEN the pending changeset is evaluated
- THEN the change is marked `status:: conflict` with `STALE_TARGET_DELETED`

#### Scenario: Instance renamed after base_version
- GIVEN a pending change authored against `innteresante/intro` and a recorded rename of that instance to `innteresante/welcome`
- WHEN the pending change is evaluated
- THEN it is resolved through the recorded rename or reported as a conflict naming the new id
- AND it is never applied to a different instance silently
