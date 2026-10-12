# Delta for console-review-mode

## ADDED Requirements

### Requirement: Multi-tab-safe, durable draft store

The draft store MUST re-read persisted state before every write (or reconcile on the
`storage` event) so two tabs never overwrite each other's drafts. A failed write MUST be
surfaced to the user, not swallowed. After a successful export the user MUST be offered
to clear the exported drafts.

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
