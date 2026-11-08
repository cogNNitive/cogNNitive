# console-changes-direct-write Specification (new capability, Slice 4)

## Purpose

Defines how the owner's console writes changesets directly into the domaiNN `changes/` folder through the File System Access API with one directory grant per domaiNN, how it falls back to download, and what the written files must satisfy so that `produce` applies them on start (the apply behaviour itself is `conntent-produce-command`). It is a generic console capability; coNNtent is its first consumer.

Source: D15, C7.

## ADDED Requirements

### Requirement: Direct write is a declared console capability

Direct write MUST be a capability a console declares in `nn-config` `needs[]` under the id `changes-direct-write`, injected by the runtime like other capabilities (`innfo-console-runtime`, "Bundle-Injected Feedback UI"). A console that does not declare it MUST NOT request any directory grant and MUST NOT show any direct-write UI. The coNNtent domaiNN console MUST declare it; scoped consoles, standalone model consoles and the `conntent-delivery` console MUST NOT.

#### Scenario: Declared in the domaiNN console
- GIVEN a coNNtent domaiNN console
- WHEN `nn-config` is read
- THEN `needs[]` includes `changes-direct-write`

#### Scenario: Dormant when undeclared
- GIVEN a console whose `needs[]` omits it
- WHEN the runtime boots
- THEN no grant control is injected and no directory picker can be opened

#### Scenario: Delivery console never asks
- GIVEN the `conntent-delivery` console
- WHEN the runtime boots
- THEN no direct-write UI exists

### Requirement: Feature detection and visible mode

The runtime MUST detect `showDirectoryPicker` and secure-context permission at boot. The console MUST display its current write mode: `direct` (a grant is active), `needs grant` (API available, no active grant) or `download` (API unavailable or refused). The mode indicator MUST be text, not colour alone.

#### Scenario: Browser without the API
- GIVEN a browser that lacks `showDirectoryPicker`
- WHEN the console boots
- THEN the mode reads `download` and the changeset export works as download

#### Scenario: API available, no grant
- GIVEN a supporting browser and no stored grant
- WHEN the console boots
- THEN the mode reads `needs grant` and a Grant folder access control is shown

### Requirement: One grant per domaiNN

The console MUST ask the user to pick the domaiNN root directory once; the resulting directory handle MUST be persisted in the browser (IndexedDB) keyed by the domaiNN's `workspace_id` (every `file://` page shares one browser origin, so the key MUST be the domaiNN identity and not the page), so later sessions reuse it. On each submit, which is a user gesture, the console MUST query the permission and, if it is not granted, request it with that gesture; it MUST NOT ask the user to pick the directory again unless the handle is invalid or the browser did not persist it. When the browser does not persist handles for `file://` pages, the worst case MUST be one directory pick per session and the download path MUST remain available. The console MUST NOT ask for more than one directory per domaiNN at a time, and a grant for domaiNN A MUST NOT be offered or used by a console of domaiNN B.

#### Scenario: First grant
- GIVEN no stored handle
- WHEN the user chooses Grant folder access and picks the domaiNN root
- THEN the handle is stored for this `workspace_id` and the mode becomes `direct`

#### Scenario: Reuse across sessions
- GIVEN a stored handle whose permission the browser retained
- WHEN the console boots again
- THEN the mode is `direct` with no picker shown

#### Scenario: Permission lapsed
- GIVEN a stored handle whose permission the browser dropped
- WHEN the user submits a verdict
- THEN permission is requested within that gesture and the directory picker is not opened

#### Scenario: Handle not persisted
- GIVEN a browser that does not keep the handle for `file://` pages
- WHEN a new session starts
- THEN the mode is `needs grant`, one directory pick restores `direct`, and download remains available

#### Scenario: Other domaiNN
- GIVEN a handle stored for domaiNN A
- WHEN a console of domaiNN B boots
- THEN it does not use A's handle

### Requirement: The granted directory is verified

Before writing, the console MUST verify the picked directory is the domaiNN root of this console, by reading the `workspace_id` of the directory's `domaiNN_NN.md` and comparing it with the `workspace_id` the exporter embeds in `meta`. A different directory, or one without `domaiNN_NN.md`, MUST be refused with a message naming the expected root, the mode MUST stay `needs grant` and nothing MUST be written.

#### Scenario: Wrong folder
- GIVEN the user picks a folder whose `domaiNN_NN.md` has another `workspace_id`, or none
- WHEN the picker closes
- THEN a message names the expected root, no handle is stored and the mode stays `needs grant`

### Requirement: Writes are confined to changes and never overwrite

In direct mode the console MUST write only inside the `changes/` folder of the granted root, creating it when absent. It MUST write each changeset as a new file named `<workspace_id>_<reviewer-slug>_<stamp>_changes_NN.md`, created with exclusive-create semantics (an existing name fails and is retried with a new stamp). `<reviewer-slug>` MUST be the reviewer identifier reduced to `[a-z0-9-]`, at most 32 characters, with a fixed fallback when nothing remains; no other path segment MAY be derived from payload strings or user input, and the stamp MUST sort chronologically. It MUST NOT overwrite or delete an existing file and MUST NOT write outside `changes/`. A write MUST be committed by closing the writable stream, so a reader never sees a partial file. The bytes written to each file MUST be identical to the bytes the download path would produce for the same drafts of that file.

#### Scenario: New file per write
- GIVEN two verdicts written one after the other
- WHEN `changes/` is listed
- THEN it holds two distinct new files and no existing file was altered

#### Scenario: Hostile reviewer name
- GIVEN a reviewer name `..\\..\\evil`
- WHEN a verdict is written
- THEN the file name contains only `[a-z0-9-_.]` characters, no separator, and the file is inside `changes/`

#### Scenario: Exclusive create
- GIVEN a file with the generated name already exists
- WHEN the console writes
- THEN the existing file is untouched and the console retries with a new stamp

#### Scenario: Same bytes as download
- GIVEN a set of drafts that are all verdicts (or all edits)
- WHEN exported by download and by direct write
- THEN the two files have identical bytes (apart from the file name)

#### Scenario: No partial file
- GIVEN a write interrupted before the stream closes
- WHEN `changes/` is listed
- THEN no partially written changeset file is present

### Requirement: Console-origin changesets are sealed human changesets

A changeset the console writes MUST be a Level-3 changeset (`changeset-document-model`) with `status: proposed`, with the reviewer identifier as its `author`, and MUST be sealed: it MUST carry a `proposal_sha` that `verifyProposalSha` accepts, computed by the same algorithm as nn-core `computeProposalSha` (the runtime ships a drift-guarded copy, and a test MUST prove byte equality with nn-core on a fixture including a `review_gate` change). Its frontmatter MUST carry the human-origin markers `author_kind: human`, `origin: console` and `reviewer: <identifier>` as defined by `changeset-review-gate` (these markers apply to every change in the file, verdicts and edits alike). The reviewer identifier is the one the export modal already requires (`innfo-console-feedback`); direct write MUST use the same identifier, stored locally under the `nn-console:v4:` namespace, and MUST NOT introduce a second name. The default pseudonym `reviewer` MUST be refused for a verdict, because the engine ignores it (`conntent-review-gates`, "Only a named human on an applied console changeset approves"). Any person who enters another name is accepted; there is no roster in v1.

#### Scenario: Identifier shared with export
- GIVEN an identifier entered in the export modal
- WHEN a verdict is written directly
- THEN the same identifier is used and no second prompt appears

#### Scenario: Verdict without a name
- GIVEN no identifier or the default pseudonym `reviewer`
- WHEN the user approves a gate
- THEN nothing is written and the console asks for a name

#### Scenario: Produce accepts the file
- GIVEN a changeset written by the console
- WHEN `produce` starts and verifies the seal
- THEN it is not reported as `PROPOSAL_TAMPERED` and it is applied

#### Scenario: Seal equals nn-core
- GIVEN a fixture changeset with a human `review_gate` change
- WHEN the runtime computes `proposal_sha` and nn-core computes it
- THEN the two values are equal

#### Scenario: Frontmatter
- GIVEN a written changeset
- WHEN it is parsed with `parseChangeset`
- THEN `status` is `proposed` and the frontmatter has `author_kind: human`, `origin: console` and the reviewer

### Requirement: Stale approval is refused at write time

With an active grant and a verdict operation pending, the console MUST re-hash the live files of the models the gate depends on (the episode and its series and domaiNN documents) and compare them with the embedded per-model `sha256` values. On any difference it MUST refuse to write the verdict, show `content changed since you reviewed it; reopen the console`, write nothing, and disable verdict controls until the console is reopened. Without a grant the check MUST be skipped and the engine remains authoritative (`conntent-review-gates`, "The engine supplies the hash and a stale approval is refused").

#### Scenario: File changed after export
- GIVEN a granted console and an episode document edited after export
- WHEN the reviewer approves a scene
- THEN nothing is written and the message is shown

#### Scenario: Upstream change
- GIVEN a series document edited after export
- WHEN the reviewer approves a scene of one of its episodes
- THEN the approval is refused with the same message

#### Scenario: No grant
- GIVEN no active grant
- WHEN the reviewer approves a scene
- THEN the verdict is exported by download without the write-time check

### Requirement: Write feedback and queued state

After a successful direct write the console MUST confirm the written file name under `changes/` and MUST show the affected item as `written, applies on next produce or apply` without changing the displayed gate state (the console is static; the gate state changes only after apply and regeneration). A written file MUST NOT be offered for a second write of the same drafts.

#### Scenario: Confirmation
- GIVEN an approval written directly
- WHEN the write completes
- THEN the console names the file and marks the scenes as written, not approved

#### Scenario: No duplicate
- GIVEN drafts already written
- WHEN the user triggers the write again without new edits
- THEN no new file is written

### Requirement: Download is the fallback and never loses a change

When the API is unavailable, the user declines the grant, the permission is revoked, or a write fails, the console MUST fall back to the existing download export (same bytes per file), MUST keep the drafts in the draft store until the user confirms the export, and MUST tell the user which path was taken and why. A failed direct write MUST NOT be reported as a success.

#### Scenario: Write failure
- GIVEN a granted console and a write that throws
- WHEN the user confirms the verdict
- THEN a download is offered, the drafts are retained and an error naming the cause is shown

#### Scenario: Revoked permission
- GIVEN the permission was revoked during the session
- WHEN a write is attempted
- THEN the mode changes to `needs grant` and the download path is offered

### Requirement: Grant handle is never exported

The directory handle and the reviewer name MUST NOT be written into any exported file, changeset or payload. Re-exporting a console MUST NOT carry any grant.

#### Scenario: Handle absent from artifacts
- GIVEN a console with an active grant that exports a changeset
- WHEN the changeset is read
- THEN it contains no handle data and no local path

### Requirement: Directly written changesets are consumed by produce on start

<!-- shared with slice 3: the apply-on-start behaviour itself is specified by conntent-produce-command "Produce applies pending human changesets on start"; this requirement fixes what the console must write so that behaviour works. -->

A changeset written to `changes/` by the console MUST satisfy every precondition `produce` imposes before applying it on start: `status: proposed`, a valid seal, the frontmatter markers `author_kind: human`, `origin: console` and `reviewer`, and a `target` that names the episode, its series or its domaiNN. Because the human-origin markers sit in the changeset frontmatter, a single file MAY hold verdicts and field edits together, and `produce` applies both on start. The file-name pattern MUST sort chronologically, so that `produce` applying "in file order" applies them in the order they were written.

#### Scenario: Verdict applied on start
- GIVEN a console-written changeset approving the `script` gate of an episode
- WHEN `produce` starts for that episode
- THEN the changeset is applied before gate evaluation and the run proceeds past the `script` gate

#### Scenario: Edit and verdict applied on start
- GIVEN a console-written file holding a narration edit and an approval of another scene
- WHEN `produce` starts
- THEN both are applied before gate evaluation

#### Scenario: Chronological file names
- GIVEN three changesets written in sequence within the same minute
- WHEN `changes/` is listed in name order
- THEN the order equals the order they were written

#### Scenario: Targets are in scope
- GIVEN a verdict written from the episode Review section
- WHEN its `target` is read
- THEN it names that episode (and the scene element for a per-scene gate)
