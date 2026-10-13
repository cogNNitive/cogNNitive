# Delta for console-export-cli

## MODIFIED Requirements

### Requirement: Real domain identity and model-qualified element ids

`export-console` MUST NOT invent a domain version: the domain payload meta MUST carry `generated` (the build stamp) and `models`, one entry per embedded model with its `id`, `title`, real `knowledge_version` and content `sha256`. The draft store key MUST be the stable, path-scoped domain id (`<folder>-<hash of the resolved root path>`), never `basename(root)` alone and never content-derived, so drafts survive regeneration. Staleness MUST be tracked per draft (`base_hash`), not per store. Element ids in the domain console MUST be the D5 element address `<model>@<element_slug>`, where `<model>` is the model id used as the model part of changeset targets (the file stem), so two models with the same element name never collide in `elementsById` and every console key equals its lineage address. (Previously: the domain version was `V_1-0-<int>` derived from a content hash, drove a store-level stale banner, and ids were qualified as `<modelId>/<id>` with a path stem.)

#### Scenario: Real versions in the meta
- GIVEN a domain whose model `strategy` is at `V_0-1-3`
- WHEN the domain console is exported
- THEN `meta.models` lists `strategy` with `knowledge_version: "V_0-1-3"` and its `sha256`
- AND the meta has no hash-derived version

#### Scenario: Same element name in two models
- GIVEN models `org` and `crm` both define an element `Customer` with slug `customer`
- WHEN the console payload is built
- THEN their ids are `org@customer` and `crm@customer`
- AND a draft on `org@customer` never targets `crm@customer`

#### Scenario: Drafts survive a content change
- GIVEN a draft saved in a domain console
- WHEN a model changes and the console is exported again
- THEN the draft is still in the store under the same key
- AND it is flagged only if its own target element hash moved

## ADDED Requirements

### Requirement: Changes collection in the domain payload

The domain payload MUST carry a `changes` collection built at export time from every `changes/*_changes_NN.md` of the domain, whatever its status: one entry per changeset with `{ path, title, author, status, appliedAt, changes: [{ id, op, target, author, notes, status, sources, replaced_sources }] }`, newest first by file stamp. The collection MUST be an empty array (not absent) when the domain has no changeset, and MUST NOT be written into any model. Per-element `history` MUST be derived from the same loaded changesets.

#### Scenario: Changes carried into the domain console
- GIVEN a domain with one proposed and one applied changeset
- WHEN the domain console is exported
- THEN the payload `changes` carries both with their changes
- AND no model file contains the collection

#### Scenario: Empty is present, not missing
- GIVEN a domain with no `changes/` directory
- WHEN the domain console is exported
- THEN `changes` is `[]` and nothing throws
