# Delta for source-normalization-pipeline

## ADDED Requirements

### Requirement: HTML sources normalize to content, not page chrome

The `.html`/`.htm` conversion path MUST produce a body that represents the document's
content. It MUST remove navigation and furniture elements — at minimum `<nav>`, `<header>`,
`<footer>`, `<aside>`, `<form>`, `<noscript>`, `<svg>`, `<iframe>`, `<button>` — and MUST
prefer the `<main>` or `<article>` region when one is present. When no semantic content
region exists, it MUST fall back to removing the furniture elements rather than emitting the
whole page. Anchors that point outside the content region (site navigation links) MUST NOT
appear in the body as content.

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
documents (`&iacute;`, `&oacute;`, `&ntilde;`, `&eacute;`, `&aacute;`, `&iquest;`, `&nbsp;`,
`&mdash;`, `&rsquo;`, …). Decoding MUST NOT double-decode: a source that literally contains
`&amp;#243;` MUST yield `&#243;`, not `ó`.

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
whitespace, so the whitespace-collapse rules apply to Windows-authored and Latin-1 HTML.
A document's body MUST NOT be dominated by blank lines.

#### Scenario: A CRLF document does not explode into blank lines

- GIVEN `FT_55866_20261017T165551Z.html`, a CRLF document whose current body is 82.5% blank lines
- WHEN the file is cognitivized
- THEN fewer than 10% of the body's lines are blank
- AND no run of more than one consecutive blank line remains

### Requirement: HTML charset is honoured

Downloaded HTML MUST be decoded using the charset declared by the `Content-Type` response
header, falling back to a `<meta charset>` in the document, and finally to UTF-8. A document
declared as a legacy single-byte charset (e.g. `windows-1252`, `ISO-8859-1`) MUST NOT be
read as UTF-8.

#### Scenario: A windows-1252 page decodes its accents

- GIVEN an HTML download with `Content-Type: text/html; charset=windows-1252`
- WHEN the file is imported and cognitivized
- THEN accented characters in the body render correctly
- AND no replacement character (`U+FFFD`) or mojibake sequence appears in the body

#### Scenario: `<meta charset>` covers a hand-dropped file

- GIVEN an HTML file dropped into `sources/import/` by hand with a `<meta charset="iso-8859-1">` and no HTTP header
- WHEN the file is cognitivized
- THEN the body is decoded as ISO-8859-1