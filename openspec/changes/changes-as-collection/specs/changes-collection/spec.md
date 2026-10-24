# changes-collection Specification

## Purpose

`changes` is a declared console collection. The console materializes one unit per `Change` and renders it through the standard unit machinery, replacing the bespoke `Changes` tab.

## ADDED Requirements

### Requirement: Changes is a declared collection

The `changes` blueprint MUST declare `nature: { structure: members, ownership: derived }`. The console MUST materialize exactly one unit per `Change` across all batch documents, each carrying `op`, `target`, `from`, `to`, `author`, `status`, `evidence` and `applied_at`; the batch document MUST be the grouping, not a separate unit.

#### Scenario: One unit per change
- GIVEN a domain with two batch documents holding 3 changes total
- WHEN the console is exported
- THEN exactly 3 `Change` units exist
- AND each carries its `op`, `target`, `from`, `to`, `author`, `status` and `evidence`

#### Scenario: Stable unique ids
- GIVEN a change `c-01` in batch `testlab_lucas_20261012T173127Z`
- WHEN its unit id is built
- THEN it is `testlab_lucas_20261012T173127Z#c-01` and is unique site-wide

### Requirement: No builtin Changes tab

The console MUST NOT ship a builtin `review`/`Changes` tab. Change units MUST be reachable through the standard rail, search and facets, and MUST render in the standard element sheet with a `status` badge.

#### Scenario: Tab absent
- GIVEN a domain with changesets
- WHEN the console renders
- THEN no builtin tab titled `Changes` exists

#### Scenario: Unit opens in the standard sheet
- GIVEN a `Change` unit
- WHEN it is selected
- THEN the standard element sheet opens with its fields and a read-only affordance (no edit pencil)

### Requirement: Pending drafts are runtime units

A local (unsent) draft MUST render as a `pending` unit of the collection, injected by the runtime from the draft store, with a discard action; it MUST NOT expose an edit pencil. Applied units MUST be read-only.

#### Scenario: Draft is a pending unit
- GIVEN a reviewer draft on an element
- WHEN the console renders
- THEN a `pending` unit for that draft appears with a discard action and no edit pencil

### Requirement: Per-element history is preserved

The per-element change history (`el.history`) MUST remain available and unchanged by this change.

#### Scenario: History intact
- GIVEN an element with recorded changesets
- WHEN the console renders
- THEN its element history is present as before
