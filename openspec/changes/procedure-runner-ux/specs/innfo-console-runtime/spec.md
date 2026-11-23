## ADDED Requirements

### Requirement: A run_start draft requests a new procedure run

The console draft store MUST accept a draft of kind `run_start` carrying `procedure` (a procedure id or a domain-relative procedure document path), an optional `params` object of slot values, an optional `run` slug and an optional `path` scope.
The store MUST refuse a `run_start` draft without `procedure`, with non-object `params` or with a `run` that is not a lowercase slug.
The changeset export MUST emit no change for a `run_start` draft.

#### Scenario: a run request survives a saved console

- **WHEN** a person adds a `run_start` draft and saves the console
- **THEN** the `nn-drafts` slot keeps its `procedure`, `params`, `run` and `path`, and the downloaded changeset holds no change for it

### Requirement: A saved console composes the same export as its download

The console runtime MUST expose `composeSavedExport`, which composes the changeset of a saved console from its payload meta, its drafts, a reviewer and the save time.
It SHALL derive the export state with the same function the console uses at boot, so its bytes equal a "Download changes" of the same drafts.

#### Scenario: an agent and the browser agree on the changeset

- **WHEN** `composeSavedExport` runs over the slots of a saved console
- **THEN** its changeset text equals the one `import_console` writes for that file
