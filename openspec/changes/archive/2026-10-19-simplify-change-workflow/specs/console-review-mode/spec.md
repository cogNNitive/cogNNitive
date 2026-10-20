# Delta for console-review-mode

## MODIFIED Requirements

### Requirement: One Change-State Signal Per Row

Model views (element cards, tables, the concept rail and unit pips) MUST show only one
change signal: the Unsent marker, a single kit `StatusBadge` with status `local` and label
`Unsent` [P] on each row whose element has unsent changes, with the count in its `title`.
The marker MUST derive from the browser draft store only, never from the console payload,
so a reader with no drafts sees no change signal in model views. Applied, proposed,
conflict and not-applied changes MUST NOT produce any badge, pill or count in model views;
they exist only inside the cards of the Changes tab. The modal Lineage tab (element
history and citations) is unchanged. Statuses MUST NOT be settable from the console.
(Previously: one badge per row among `Unsent`, `Proposed`, `Applied`, `Conflict`, derived
from drafts, payload changesets and `element.history`.)

#### Scenario: Unsent marker
- GIVEN an element with two unsent changes and one applied change in its history
- WHEN the row renders
- THEN it shows one badge, status `local`, text `Unsent`, title naming 2 unsent changes

#### Scenario: Reader without drafts
- GIVEN a console whose payload has applied, conflict and proposed changes, and an empty draft store
- WHEN any model view renders
- THEN no element shows a change badge, pill or count

#### Scenario: Lineage tab kept
- GIVEN an element with applied history
- WHEN its modal Lineage tab opens
- THEN the history entries are listed as before

### Requirement: Multi-tab-safe, durable draft store

The draft store MUST be keyed by the console's stable store key only (the domain id for a
domain console, `::view:<id>` for a standalone view export) and MUST NOT record a model or
domain version. The store MUST re-read persisted state before every write (or reconcile on
the `storage` event) so two tabs never overwrite each other's drafts. A failed write MUST be
surfaced to the user, not swallowed. When the console loads, every field-value draft that is
already applied (its element changed since the draft AND the current value equals the
proposed value, or the proposed value is empty and the field is absent) MUST be removed
from the store. Every other draft stays until the reviewer discards it; export does not
remove drafts and no "clear exported" control exists. Staleness MUST be per draft
(`base_hash` against the current element hash); there is no store-level staleness, rebase
or refresh. A store persisted with an earlier `STORE_VERSION` MUST read as empty; it is
neither migrated nor partially read.
(Previously: after an export the user was offered to clear the exported drafts.)

#### Scenario: Two tabs add drafts
- GIVEN tab A and tab B open on the same domain
- WHEN A adds draft d1 and then B adds draft d2
- THEN the persisted store contains both d1 and d2

#### Scenario: Storage write fails
- GIVEN `localStorage.setItem` throws (quota or disabled)
- WHEN a draft is saved
- THEN the UI shows a visible save-failure notice

#### Scenario: Applied draft leaves on load
- GIVEN a draft `owner: Ana -> Bea` and a regenerated console where the element's hash changed and `owner` is `Bea`
- WHEN the console loads
- THEN the draft is no longer in the store

#### Scenario: Other drafts stay
- GIVEN a stale draft whose value differs from the current one, and a comment draft
- WHEN the console loads
- THEN both drafts remain Unsent

#### Scenario: No clear-exported control
- GIVEN drafts that were just exported
- WHEN the Changes tab renders
- THEN no "clear exported" control exists and the drafts are still listed

#### Scenario: Old store discarded
- GIVEN a store persisted with the previous `STORE_VERSION` and drafts keyed by old ids
- WHEN the console loads
- THEN the store reads as empty and no draft is migrated

### Requirement: Change Recorded Toast

Every action that creates or modifies a change MUST show a transient, dismissable toast
(bottom-right) with the title `Change recorded` [P] and a [P] body that says the change
lives only in this console until it is exported and given to the agent to apply. It MUST
appear on saving an edit and on adding or removing a tag or relation, MUST NOT mention
"draft", and MUST be dismissable and self-expiring. At most one toast is shown at a time.
(Previously: the body said to "apply it from cogNNitive".)

#### Scenario: Saving an edit shows the toast
- GIVEN a proposable domain
- WHEN the reviewer saves an edit
- THEN a toast appears with the title `Change recorded` and the [P] body, which does not contain `from cogNNitive`
