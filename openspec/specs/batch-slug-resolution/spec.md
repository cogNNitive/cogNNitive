# Batch Slug Resolution Specification

## Purpose

Specify intra-batch slug conflict detection, document-order priority, deterministic auto-suffixing, in-batch reference rewriting, and empty-slug diagnostics for `add_element` operations (Decision D11).

## Requirements

### Requirement: Intra-Batch Slug Collision Detection and Document-Order Priority

The engine MUST resolve element slugs for `add_element` operations in strict changeset document order:
- The proposed candidate slug SHALL be the explicit `slug::` argument, or derived via `slugifyHeading(name)` if `slug::` is omitted.
- The engine MUST evaluate candidate slugs against:
  1. Live element slugs currently present in the target model, AND
  2. Slugs assigned to earlier `add_element` operations within the same changeset batch.
- The first `add_element` in document order proposing a given slug SHALL claim that base slug if not already claimed in the live model.
- Subsequent `add_element` operations proposing the same slug SHALL be detected as slug collisions.

#### Scenario: Document order determines base slug assignment
- GIVEN a changeset with two `add_element` operations for concept `Goal`, both named `Growth`
- AND no existing element with slug `growth` exists in the model
- WHEN the changeset is processed
- THEN the first operation claims slug `growth`
- AND the second operation collides and triggers auto-suffixing

---

### Requirement: Deterministic Auto-Suffixing and Annotation (`resolved_slug::`)

On detecting a slug collision against live model elements or earlier in-batch additions, the engine MUST apply the following:
- The engine MUST automatically suffix the base slug with `-1`, `-2`, ..., `-N` using an incrementing counter until an unused slug is found.
- Suffixing MUST be automatic during apply and MUST NOT abort or reject the change item.
- The engine MUST record the final assigned slug in the change item's `resolved_slug::` annotation.
- Non-colliding `add_element` operations MUST also record their assigned slug in `resolved_slug::`.

#### Scenario: Suffix assigned and recorded on collision
- GIVEN a model containing element `feature`
- AND a changeset proposing `add_element` with name `Feature`
- WHEN `apply_change` executes
- THEN the new element is created with slug `feature-1`
- AND the change item is annotated with `resolved_slug:: feature-1`

---

### Requirement: Intra-Batch Reference Rewriting

When an `add_element` operation receives an auto-suffixed slug, the engine MUST rewrite the references below:
- The engine MUST rewrite all subsequent change items in the same changeset batch that target or reference the original proposed slug.
- Rewritten targets MUST include canonical `target::` addresses (e.g., `model@proposed_slug&field` becomes `model@resolved_slug&field`).
- Rewritten values MUST include intra-batch field references and prose wikilinks (`[[proposed_slug]]` becomes `[[resolved_slug]]`).
- Earlier change items preceding the `add_element` in document order MUST NOT be rewritten.

#### Scenario: Subsequent update_field target rewritten after slug suffixing
- GIVEN Change 1 adds element named `Metrics` colliding to slug `metrics-1`
- AND Change 2 targets `target:: strategy@metrics&kpi`
- WHEN batch slug resolution executes
- THEN Change 2's target is rewritten in-memory to `strategy@metrics-1&kpi`
- AND Change 2 applies cleanly to the newly created element

---

### Requirement: Empty-Slug Handling for Non-Latin Names

When an `add_element` operation specifies a name whose characters produce an empty slug under `slugifyHeading(name)` (e.g., non-Latin script names), the engine MUST apply the following:
- If the change item provides an explicit non-empty `slug::`, the engine MUST accept the explicit slug (applying auto-suffixing if collision occurs).
- If NO explicit `slug::` is provided (or if `slug::` is empty or whitespace), the engine MUST NOT assign a blank or fallback slug.
- The engine MUST mark the change item with `status:: conflict` and diagnostic resolution: `EMPTY_SLUG: Element name produces an empty slug; explicit slug:: required`.
- The conflicted change MUST NOT abort other clean changes in the changeset batch (per `changeset-conflicts`).

#### Scenario: Non-Latin element without explicit slug conflicts cleanly
- GIVEN an `add_element` operation with name `日本語` and no `slug::` specified
- WHEN `apply_change` processes the batch
- THEN the change item is marked `status:: conflict`
- AND `resolution::` is set to `EMPTY_SLUG: Element name produces an empty slug; explicit slug:: required`
- AND remaining clean changes in the changeset proceed to apply

#### Scenario: Non-Latin element with explicit slug succeeds
- GIVEN an `add_element` operation with name `日本語` and explicit `slug:: japanese-lang`
- WHEN `apply_change` processes the batch
- THEN the element is created with slug `japanese-lang`
- AND the change item is marked `status:: applied` with `resolved_slug:: japanese-lang`
