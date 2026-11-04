# Delete Impact and Lifecycle Specification

## Purpose

Specify pre-computed impact analysis for `remove_element`, matrix cell cascade, incoming reference conflict surfacing, slug reuse lifecycle, and staleness checks (Decision D12).

## Requirements

### Requirement: Pre-Computed Delete Impact and Matrix Cell Cascade

Before applying a `remove_element` operation, the engine MUST pre-compute its impact within the containing model:
- Any matrix cells whose row or column identifier matches the deleted element's slug or name MUST be automatically cascade-deleted within the model.
- Cascaded matrix cell deletions MUST NOT produce conflicts; they SHALL be executed in-batch as part of the element deletion.
- The `remove_element` change item MUST record the number of cascaded matrix cells in its `resolution::` annotation (e.g., `resolution:: Removed element and cascaded N matrix cell(s)`).

#### Scenario: Deleting an element cascades its matrix cells
- GIVEN a model containing element `auth` and a matrix with row `auth`
- WHEN `remove_element` for `auth` executes
- THEN element `auth` is removed from the model's elements
- AND all matrix cells having row or col matching `auth` are removed
- AND the change item records `resolution:: Removed element and cascaded 1 matrix cell(s)`

---

### Requirement: Reference Field and Cross-Model Conflict Surfacing

The engine MUST scan for active incoming references to the element targeted for deletion across all workspace models:
- Reference points checked MUST include:
  1. Fields declared as `reference` or `knowledge` type pointing to the target slug or name,
  2. Prose wikilinks (`[[slug]]`, `[[Name]]`, `[[slug|Alias]]`) referencing the target,
  3. Cross-model reference targets (`model@slug`).
- If one or more active incoming references exist in live models AND the changeset does NOT contain companion changes updating or removing those references, the `remove_element` operation MUST be marked as `status:: conflict`.
- The engine MUST NOT silently delete an element leaving dangling references.
- The conflict resolution MUST detail the referencing paths causing the conflict.

#### Scenario: Active reference blocks delete with conflict
- GIVEN element `core-service` referenced by field `target_service` in element `client-app`
- AND a changeset proposing `remove_element` for `core-service` without updating `client-app`
- WHEN `apply_change` computes delete impact
- THEN the `remove_element` change is marked `status:: conflict`
- AND `resolution::` specifies `REFERENCED_BY: client-app&target_service`
- AND `core-service` is not deleted

#### Scenario: In-batch companion update allows deletion
- GIVEN element `v1-api` referenced by `gateway@route&target`
- AND a changeset containing both `remove_element` for `v1-api` AND `update_field` repointing `gateway@route&target` to `v2-api`
- WHEN `apply_change` computes delete impact
- THEN the reference is satisfied by the in-batch update
- AND `remove_element` applies cleanly with `status:: applied`

---

### Requirement: Slug Reuse Lifecycle and Staleness History Guard

Element identity lifecycle MUST restart upon new creation:
- A deleted slug MAY be reused by a subsequent `add_element` operation. The element's lifecycle and history restart at the newly applied `add_element`.
- When evaluating any mutation targeting an element slug (`update_field`, `remove_element`, `rename_element`), the engine MUST check for staleness via a reverse scan of `changes/`:
  - The scan SHALL inspect applied changesets in reverse chronological order up to a maximum cap of 50 changesets.
  - The scan SHALL stop when reaching the most recent `add_element` for that slug.
  - If a `remove_element` for that target slug occurred after the pending changeset's `base_version` (or if the target was deleted concurrently), the operation MUST be marked `status:: conflict` with error `STALE_TARGET_DELETED: Target element was deleted after base_version`.

#### Scenario: Mutation against element deleted after base_version conflicts
- GIVEN a changeset authored when model `arch` was at `V_0-1-0`
- AND a subsequent changeset applied at `V_0-1-1` that removed element `proxy`
- WHEN the pending changeset attempts `update_field` targeting `arch@proxy&timeout`
- THEN the reverse changeset scan detects that `proxy` was deleted after `V_0-1-0`
- AND the change item is marked `status:: conflict` with `STALE_TARGET_DELETED`

#### Scenario: Re-added slug resets lifecycle history
- GIVEN element `worker` was deleted in changeset 10
- AND element `worker` was re-added in changeset 15
- WHEN a pending changeset targeting `worker` has `base_version` matching changeset 15
- THEN the reverse scan stops at changeset 15's `add_element`
- AND the mutation succeeds without staleness conflict

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
