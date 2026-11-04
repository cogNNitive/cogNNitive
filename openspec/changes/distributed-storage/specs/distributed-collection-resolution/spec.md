# distributed-collection-resolution Specification

## Purpose

The domaiNN exposes one collection per concept (all Series, all Videos, all Scenes) independent of how the concept is stored. Reads (`list_knowledge`, `query_units`, the console collections) see the same logical collection whether the instances are instance models or elements of a compact model. How the collection is found (a scan of declared placements or an anchor document) is a design decision; the requirements hold for either.

Verified against code: `resolve_effective` and `explain` take a single document path and fold its scope chain (`findScopeChain`); they never read sibling files, so they need no collection logic. `query_units` is single-file today (audit of `query-units.ts`).

## Requirements

### Requirement: One collection per concept regardless of layout

For every concept, a collection read MUST return every instance of it in the domaiNN: instances stored as instance models and instances stored as elements of compact models. The set of logical instances and their field values MUST NOT depend on the storage form. Each item MUST carry its address and its storage form; addresses differ by form (the instance model id for an instance model, the model id plus `@<slug>` for a compact element).

#### Scenario: Same collection in both layouts
- GIVEN three Videos stored as three instance models in one domaiNN, and the same three Videos stored as elements of one compact model in a copy of it
- WHEN the Video collection is read in each
- THEN both reads return three items with equal slugs, titles and field values
- AND the items report storage `distributed` in the first and `compact` in the second

#### Scenario: Mixed storage across concepts
- GIVEN `Series` and `Video` distributed and `Preset` compact in one domaiNN
- WHEN the three collections are read
- THEN each returns all its instances

### Requirement: Instances are found wherever discovery finds models

Collection resolution MUST include every discoverable instance model of the concept, including instance models that violate placement. A violating model MUST NOT make the collection silently incomplete: it is either included and flagged, or the read result carries a diagnostic naming it.

#### Scenario: Misplaced instance is not silently dropped
- GIVEN a Video instance model outside its placement path
- WHEN the Video collection is read
- THEN the instance is present and flagged, or a diagnostic names its path

#### Scenario: Double-stored instance is not merged
- GIVEN a Video stored both as an instance model and as a registry element
- WHEN the collection is read
- THEN each stored copy appears once with its own location
- AND no copy is dropped in favour of the other

### Requirement: `list_knowledge` exposes collections

`list_knowledge` MUST be able to return the collection of a concept as defined above, in addition to listing models. Listing models MUST continue to return only discoverable models (`model-discovery-predicate`).

#### Scenario: List the Video collection
- GIVEN series `villabotijos-today` and `innteresante` with Videos including `intro` in both
- WHEN `list_knowledge` is asked for the `Video` collection
- THEN `villabotijos-today/intro` and `innteresante/intro` are both returned with distinct addresses

### Requirement: `query_units` filters across a concept's instances

`query_units` MUST accept a query scoped to a concept across the domaiNN and evaluate its filters against every instance of the concept, whatever the storage form. The query syntax is a design decision; it MUST keep the existing rule that a bare element target combined with `?` is rejected.

#### Scenario: Filter across instance models
- GIVEN Videos `villabotijos-today/pepper-mapache` (status `published`), `villabotijos-today/intro` (status `draft`) and `innteresante/intro` (status `published`)
- WHEN `query_units` runs the Video collection with filter `status=published`
- THEN it returns `villabotijos-today/pepper-mapache` and `innteresante/intro`
- AND it does not return `villabotijos-today/intro`

#### Scenario: Element collection across instances
- GIVEN Scenes in several Video instance models
- WHEN the Scene collection is queried
- THEN items are addressed as `villabotijos-today/pepper-mapache@00-gancho` and so on, each with its owning instance

### Requirement: Value resolution is unchanged by collection membership

`resolve_effective` and `explain` MUST resolve an instance model through the scope chain of its own path, exactly as for any model. Being a member of a collection MUST NOT add, remove or reorder suppliers.

#### Scenario: Same value as before
- GIVEN Video `villabotijos-today/pepper-mapache` and a series scope supplying `fps`
- WHEN `resolve_effective` resolves `fps` at the instance model
- THEN the winner is the series scope document, as before this change

### Requirement: The console builds collections from declarations

The console payload builder and runtime MUST build one collection per concept from the bluepriNNt declarations, and MUST show references by the target's title while the model stores the address. A concept stored compact and the same concept stored distributed MUST render the same collection view.

#### Scenario: Console collection is layout-independent
- GIVEN two copies of a domaiNN, one with Videos compact and one with Videos distributed
- WHEN each console is exported
- THEN the Video collection lists the same titles and field values in both

#### Scenario: Reference shown by title
- GIVEN a field storing `villabotijos-today/pepper-mapache`
- WHEN the console renders the field
- THEN it displays `El mapache fuera de la ley` and links to the instance
