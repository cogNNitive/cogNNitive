# Source Normalization Pipeline

## Purpose

Normalization is cognitivization in place: every active source subtree gets co-located sidecars, with no mirror tree. Promoting deliverables into a sources folder disappears because any file can be cognitivized where it lives.
## Requirements
### Requirement: Multi-Subtree Normalization Scanning

The scanner (`nn-trannsform --scan` / `scanAndProcess`) MUST recursively scan `sources/import/` and `sources/conversations/` and MUST cognitivize every file in them that has no up-to-date sidecar, through the single `cognitivize` operation. Sidecars MUST be co-located with their raw file; no `sources/nn/` mirror and no `sources/export/` subtree exist. Sidecar files and `staging/` MUST be skipped.

#### Scenario: Normalization across subtrees
- GIVEN `sources/import/guide.pdf` and `sources/conversations/meeting_20261002T101500Z.md`
- WHEN `scanAndProcess` runs
- THEN `sources/import/guide.pdf_sidecar_NN.md` and `sources/conversations/meeting_20261002T101500Z.md_sidecar_NN.md` exist next to their raw files
- AND each sidecar `source_file` records the raw file's workspace-relative path

#### Scenario: No mirror tree
- GIVEN a completed scan
- WHEN the workspace is listed
- THEN no `sources/nn/` directory exists

#### Scenario: Sidecars are not rescanned
- GIVEN existing sidecars
- WHEN `--scan` runs again with unchanged raws
- THEN nothing is written

---

### Requirement: Conversation Transcript and Summary Normalization

Files promoted from `conversations/` into `sources/conversations/` by the standard promotion flow MUST be verbatim transcripts and MUST be cognitivized in place. The transcript is markdown, so its sidecar has no body and its turn structure (speaker labels, `## NN Turn NN: <author-id>` headings, timestamps) is preserved by the raw file, which is the citation target. The sidecar MUST record `source_type: conversation_transcript`. The pipeline MUST NOT require an executive-summary `_summary.md` path. The raw file's `origin_transcript:` frontmatter MUST be preserved.

#### Scenario: Transcript cognitivized in place
- GIVEN `sources/conversations/2026-09-06_auth_architecture_20260906T120000Z.md`
- WHEN normalization runs
- THEN a co-located sidecar exists with `source_type: conversation_transcript`
- AND the raw transcript's dialogue structure is byte-unchanged

#### Scenario: Summary files are not part of the standard flow
- GIVEN a conversation promoted only as a transcript
- WHEN normalization runs
- THEN no `_summary.md` counterpart is generated or required

### Requirement: Removal of Legacy Slack/Teams JSON Parser

The ad-hoc Slack and Microsoft Teams JSON conversion logic in `scanner-converters.js` (`convertChatJson`) MUST be removed.

Ingestion of `.json` files anywhere under `sources/import/` SHALL treat JSON as structured data schemas or raw key-value payloads rather than heuristic message threads, with no folder-specific exception. Ingestion of interactive discussion and meeting transcripts MUST be handled via the canonical conversation lifecycle (`conversations/` and `sources/conversations/`). (Previously: `sources/import/feedback/*.json` was routed to a feedback ingestion branch.)

#### Scenario: JSON file processed without Slack heuristic
- GIVEN a JSON configuration or data file `sources/import/config.json`
- WHEN `convertOkFormat` is invoked for `.json`
- THEN `convertChatJson` is not executed
- AND the content is parsed as structured data or formatted code block rather than extracting `thread_ts` or Slack-specific message arrays

#### Scenario: Chat transcripts ingested via conversations lifecycle
- GIVEN a team interaction transcript
- WHEN captured and imported into the workspace
- THEN it is routed through `conversations/` and cognitivized under `sources/conversations/` rather than relying on legacy Slack JSON parsers

#### Scenario: The retired drop zone gets no special routing
- GIVEN a JSON file in the retired `sources/import/feedback/` drop zone
- WHEN `convertOkFormat` is invoked for `.json`
- THEN the file takes the generic structured-data path

### Requirement: Scored Source-to-Element Matching

Normalized sources MUST be matched to model elements with a recorded score per
pair. Pairs at or above the match threshold link automatically; pairs below it
MUST NOT link silently. Scoring MUST run outside the hot reasoning loop, so
reviewer attention is spent on doubtful pairs only.

#### Scenario: Confident pairs link automatically
- GIVEN normalized sources and model elements
- WHEN scoring completes
- THEN each pair carries a recorded score
- AND pairs at or above threshold link automatically

#### Scenario: Unmatched source is queued, never dropped
- GIVEN a source scoring below threshold for every element
- WHEN matching completes
- THEN the source is queued for review
- AND it is NOT silently excluded

### Requirement: Doubtful-Pair Review Queue

Every doubtful or unmatched pair MUST enter a review queue. Reviewers confirm or reject each queued pair through the recorded confirm path, and no source SHALL be dropped without a recorded decision. Undecided pairs MUST remain queued across sessions; cross-session persistence stays caller-owned and no store is added by this change.

#### Scenario: Reviewer confirms a doubtful pair

- GIVEN doubtful pairs waiting in the queue
- WHEN a reviewer confirms one
- THEN the link is recorded together with the decision

#### Scenario: Reviewer rejects a doubtful pair

- GIVEN a doubtful pair waiting in the queue
- WHEN a reviewer rejects it
- THEN the rejection is recorded together with the decision
- AND the source is marked decided, never silently dropped

#### Scenario: Undecided pairs stay queued

- GIVEN a review session ending with pairs undecided
- WHEN the queue is inspected
- THEN undecided pairs remain queued
- AND none are treated as excluded

### Requirement: HTML sources normalize to content, not page chrome

The `.html`/`.htm` conversion path MUST produce a body that represents the document's
content. It MUST remove navigation and furniture elements — at minimum `<nav>`, `<header>`,
`<footer>`, `<aside>`, `<form>`, `<noscript>`, `<svg>`, `<iframe>`, `<button>` — and MUST
prefer the `<main>` or `<article>` region when one is present. When no semantic content
region exists, it MUST fall back to removing the furniture elements rather than emitting the
whole page.

#### Scenario: Navigation chrome is absent from the body

- GIVEN `PMC9547138_20261017T173000Z.html`, whose page opens with `Skip to main content`,
  `Log in`, `Dashboard`, `Account settings` and a primary-site navigation menu
- WHEN the file is cognitivized
- THEN the sidecar body does not contain `Skip to main content`, `Log in`, `Dashboard` or
  `Account settings`
- AND the article's own prose is present

#### Scenario: The content region is preferred when present

- GIVEN an HTML page with a `<main>` element and a surrounding header/footer menu
- WHEN the file is cognitivized
- THEN the body is derived from the `<main>` region
- AND the header/footer menu text is not in the body

#### Scenario: A page with no content region still drops furniture

- GIVEN an HTML page with no `<main>` or `<article>`
- WHEN the file is cognitivized
- THEN the body omits the furniture elements listed above
- AND it retains the remaining text

### Requirement: HTML entities are decoded

The HTML conversion MUST decode both numeric entities (`&#NNN;` and `&#xHH;`) and the
standard named entity set, including the Latin-1/typographic entities used by non-English
documents (`&iacute;`, `&oacute;`, `&ntilde;`, `&eacute;`, `&aacute;`, `&nbsp;`, `&mdash;`,
`&rsquo;`, …). Decoding MUST NOT double-decode: a source that literally contains `&amp;#243;`
MUST yield `&#243;`, not `ó`.

#### Scenario: Numeric accented entities decode

- GIVEN an HTML source containing `Fundaci&#243;n`, `&#237;ndice` and `a&#241;o`
- WHEN the file is cognitivized
- THEN the body contains `Fundación`, `índice` and `año`
- AND it contains no `&#` sequence

#### Scenario: Named entities decode

- GIVEN an HTML source containing `Pulse aqu&iacute;` and `d&eacute;ficit`
- WHEN the file is cognitivized
- THEN the body contains `Pulse aquí` and `déficit`

#### Scenario: A non-breaking space does not become a blank line

- GIVEN an HTML source whose markup uses `&nbsp;` / `&#160;` for spacing
- WHEN the file is cognitivized
- THEN the body does not gain a blank line per non-breaking space

#### Scenario: A literal entity reference is not double-decoded

- GIVEN an HTML source containing the escaped text `&amp;#243;`
- WHEN the file is cognitivized
- THEN the body contains the literal `&#243;`
- AND it does not contain `ó`

### Requirement: Line endings are normalized before whitespace collapse

The HTML conversion MUST normalize CRLF and lone-CR line endings to LF before collapsing
whitespace, so the whitespace-collapse rules apply to Windows-authored HTML. A document's
body MUST NOT be dominated by blank lines.

#### Scenario: A CRLF document does not explode into blank lines

- GIVEN `FT_55866_20261017T165551Z.html`, a CRLF document whose current body is 82.5% blank lines
- WHEN the file is cognitivized
- THEN fewer than 10% of the body's lines are blank
- AND no run of more than one consecutive blank line remains

### Requirement: An incomplete HTML extraction is reported, never presented as complete

The pipeline MUST report an incomplete HTML extraction together with a reason whenever a
binary conversion produces a body that is an anti-bot / JavaScript-wall interstitial, empty,
or too short to be the document's content. The report MUST use the existing per-file
partial-outcome channel, and the pipeline MUST NOT present such an extraction as an ordinary
complete one. The signal MUST be advisory: it MUST NOT prevent the source from being
cognitivized or its citations from resolving.

#### Scenario: An anti-bot interstitial is reported

- GIVEN a cognitivized HTML source whose body is the text of a reCAPTCHA / `Client Challenge`
  / "JavaScript is disabled" / "enable JS and disable any ad blocker" interstitial
- WHEN it is cognitivized
- THEN the extraction is reported as incomplete with an anti-bot reason
- AND a caller that cites the source still resolves

#### Scenario: A healthy article is not reported

- GIVEN a cognitivized HTML article with a substantial prose body
- WHEN it is cognitivized
- THEN no incomplete-extraction reason is reported

#### Scenario: An empty or trivial body is reported

- GIVEN a cognitivized source whose body has fewer than a minimal number of non-whitespace
  characters
- WHEN it is cognitivized
- THEN the extraction is reported as incomplete with an empty/trivial reason

### Requirement: A zero-byte subject is refused

A raw file whose byte length is zero MUST NOT be cognitivized into a usable source. The
pipeline MUST refuse it with an explicit reason, using the existing rejected/skipped outcome,
rather than registering a source whose `sha256` is the hash of the empty string.

#### Scenario: A zero-byte download is refused

- GIVEN `sources/import/<name>.html` with `size_bytes: 0`
- WHEN the scan processes it
- THEN it is refused with a reason identifying the zero-byte subject
- AND no sidecar body presents it as a usable extraction

#### Scenario: A non-empty subject is unaffected

- GIVEN a subject with one or more bytes
- WHEN the scan processes it
- THEN it is cognitivized normally

