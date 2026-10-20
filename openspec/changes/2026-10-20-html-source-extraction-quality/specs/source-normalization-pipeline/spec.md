# Delta for source-normalization-pipeline

## ADDED Requirements

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

When a binary conversion produces a body that is an anti-bot / JavaScript-wall interstitial,
empty, or too short to be the document's content, the pipeline MUST report the extraction as
incomplete together with a reason, through the existing per-file partial-outcome channel. It
MUST NOT be presented as an ordinary complete extraction. The signal MUST be advisory: it
MUST NOT prevent the source from being cognitivized or its citations from resolving.

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