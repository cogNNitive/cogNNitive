# Delta Spec: console-export-slots-and-standalone-pin

Scope: the exported console carries its model payload compressed, in one format, and keeps the drafts and the UI state in their own plain JSON slot. The slot ids and the standalone pin are unchanged.

## MODIFIED Requirements

### Requirement: Embedded slot ids carry the nn prefix with a legacy read

`scripts/export-console.mjs` MUST emit the embedded script slots as `nn-config`, `nn-schema`, `nn-model`, `nn-drafts` and `nn-view-data`, and MUST NOT emit an `innfo-*` slot.
A single artifact MUST carry exactly one spelling of each id: the rename MUST NOT alias or dual-emit them.
The exporter's own `extractModelMetaFromHtml` MUST accept `(?:innfo|nn)` for the model slot id and MUST decode the slot as described in "The model slot is compressed with deflate-raw and base64"; a slot that does not decode MUST read as absent, so the console is reported out of date and written again.

#### Scenario: Exported slots carry the prefix
- GIVEN a model exported after the rename
- WHEN its slots are listed
- THEN they are `nn-config`, `nn-schema`, `nn-model`, `nn-drafts` and `nn-view-data`, and no `innfo-config`, `innfo-schema` or `innfo-model` slot exists

#### Scenario: A console whose model slot holds plain JSON is not current
- GIVEN a domain console whose `nn-model` slot holds plain JSON
- WHEN `node scripts/export-console.mjs <root> --status` runs
- THEN the domain console is not reported `[fresh]`
- AND the next `--domain` export replaces it with a compressed slot

## ADDED Requirements

### Requirement: The model slot is compressed with deflate-raw and base64

The exporter MUST always write the `nn-model` slot as `<script type="application/x-nn-deflate-base64" id="nn-model">` holding the model JSON compressed with deflate-raw at level 9 and encoded as base64; there MUST be no flag, no size threshold and no plain JSON alternative.
The encoding MUST be byte-deterministic for the same model on every platform, so the gzip format, whose header carries an operating-system byte, MUST NOT be used.
The slot type MUST NOT be an executable script type, so the inline-script CSP hashing MUST NOT hash it.
The size gate MUST measure the `models` part of its breakdown as the bytes of the `nn-schema` slot plus the bytes of the compressed `nn-model` slot, and the degrade ladder MUST keep its order.

#### Scenario: The exported slot decodes to the model
- GIVEN a domain exported with `--domain`
- WHEN the `nn-model` slot text is base64-decoded and inflated with zlib `inflateRawSync`
- THEN the result is the model JSON the console boots from, and it carries no `drafts` and no `uiState`

#### Scenario: The same input gives the same bytes
- GIVEN a domain exported once
- WHEN it is exported again with no input change
- THEN the exporter reports the console `unchanged` and the file bytes are identical

#### Scenario: The size gate reports the compressed payload
- WHEN a console is exported
- THEN the `models` figure of `size: total … (bundle …, models …, views …)` equals the bytes of the `nn-schema` slot plus the bytes of the compressed `nn-model` slot

### Requirement: Drafts and UI state live in a plain JSON nn-drafts slot

Every exported console MUST carry `<script type="application/json" id="nn-drafts">` holding `{}`, and the runtime MUST read the reviewer's saved drafts from its `drafts` array and the saved UI state from its `uiState` object, never from `nn-model`.
The slot MUST stay plain JSON with every `<` written as `<`, so an agent that receives the HTML can read the drafts without decoding anything.

#### Scenario: A fresh export carries no drafts
- WHEN a console is exported
- THEN its `nn-drafts` slot parses to `{}`

#### Scenario: An agent reads the drafts from the HTML
- GIVEN a console saved with two drafts
- WHEN an agent parses the `nn-drafts` slot as JSON
- THEN it finds both drafts in `drafts` and the saved search, tab and reviewer in `uiState`

### Requirement: The runtime decodes the model slot before it boots

The page's self-boot MUST decode the `nn-model` slot with `DecompressionStream('deflate-raw')` before it runs the synchronous `boot(document, opts)`, which MUST take the decoded JSON text as `opts.modelText` and MUST keep its synchronous signature and return value.
The decoder MUST NOT call `fetch(`, and the runtime MUST NOT read a plain JSON `nn-model` slot.
When `DecompressionStream` is missing, or the slot does not decode, the page MUST show a visible error message instead of a blank page.

#### Scenario: The exported page boots from the compressed slot
- GIVEN an exported console opened in a browser with `DecompressionStream`
- WHEN the page loads
- THEN it decodes `nn-model` and renders every element of the model

#### Scenario: A browser without DecompressionStream
- GIVEN an exported console opened where `DecompressionStream` is undefined
- WHEN the page loads
- THEN it shows a visible alert that names `DecompressionStream` and the browsers that open the file, and boots nothing

### Requirement: Save Snapshot writes both slots from the decoded model

Save Snapshot MUST start from the decoded model the page booted with, never from the compressed slot text, so every model key, `files` included, MUST survive a save.
It MUST write `nn-drafts` as compact plain JSON holding the current drafts and UI state, and MUST write `nn-model` compressed again with `CompressionStream('deflate-raw')` and base64, without the drafts and the UI state and without indentation.
When the model was never decoded, the save MUST fail with an error instead of writing a model with dropped keys.

#### Scenario: Save, reopen and keep everything
- GIVEN a console with drafts and a model that carries `files`
- WHEN the reviewer saves a snapshot and the saved file is opened again
- THEN the drafts, the search query and the reviewer are restored, and the model still carries `files`

#### Scenario: A draft cannot close its script element
- GIVEN a draft whose comment holds `</script>`
- WHEN the snapshot is saved
- THEN the `nn-drafts` slot holds `</script>` and no raw `<`
