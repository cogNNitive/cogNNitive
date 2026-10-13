# Delta for console-review-mode

## MODIFIED Requirements

### Requirement: Multi-tab-safe, durable draft store

The draft store MUST be keyed by the console's stable store key only (the domain id for a domain console, `::view:<id>` for a standalone view export) and MUST NOT record a model or domain version. The store MUST re-read persisted state before every write (or reconcile on the `storage` event) so two tabs never overwrite each other's drafts. A failed write MUST be surfaced to the user, not swallowed. After a successful export the user MUST be offered to clear the exported drafts. Staleness MUST be per draft (`base_hash` against the current element hash); there is no store-level staleness, rebase or refresh. A store persisted with an earlier `STORE_VERSION` MUST read as empty; it is neither migrated nor partially read. (Previously: the store recorded a sticky model version while drafts existed.)

#### Scenario: Two tabs add drafts
- GIVEN tab A and tab B open on the same domain
- WHEN A adds draft d1 and then B adds draft d2
- THEN the persisted store contains both d1 and d2

#### Scenario: Storage write fails
- GIVEN `localStorage.setItem` throws (quota or disabled)
- WHEN a draft is saved
- THEN the UI shows a visible save-failure notice

#### Scenario: Drafts cleared after export
- GIVEN three drafts are exported to a changeset
- WHEN the user confirms clearing
- THEN the store holds no exported drafts

#### Scenario: Old store discarded
- GIVEN a store persisted with the previous `STORE_VERSION` and drafts keyed by old ids
- WHEN the console loads
- THEN the store reads as empty and no draft is migrated
