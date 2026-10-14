# Delta for console-ui-kit

## MODIFIED Requirements

### Requirement: Type-Aware Field Value Rendering

`FieldRow` MUST render a field's read value through `FieldValue`, a type-aware
renderer that dispatches on the field's declared type, as resolved by the caller
from the pair (concept, field) (`innfo-console-runtime` "Declared Field Lookup by
Concept and Field"): `boolean` as Yes/No (`data-value="true|false"`), `http(s)` urls
as links with `rel="noopener noreferrer"`, `select` as a pill (see "Select Field View
and Edit"), `markdown`/`markdown_inline` through the safe markdown subset renderer
(see "Markdown Inline View and Edit"), `image`/`video`/`audio` through the media
renderers (see "Declared Media Rendering"), `knowledge` as a pill whose action is
supplied by the caller (`opts.onKnowledge`), `code` as a `<code>`, and array values
joined by `, `. `FieldValue` MUST return `null` for plain types (string, number, an
undeclared type, and `reference` without `ref`) so the plain `KuBadge` text output is
preserved unchanged. `KuBadge` (kind `field`) MUST accept a `valueNode` and append it
in place of the text value span. (Previously: `markdown`/`markdown_inline` rendered as
preformatted text and `select` returned `null`; in exported consoles no declared-type
branch fired because declared types never reached the console.)

#### Scenario: Boolean rendered as Yes/No
- GIVEN `FieldValue({ value: true, type: 'boolean' })`
- THEN the node text is `Yes` with `data-value="true"`

#### Scenario: Plain string unchanged
- GIVEN `FieldRow({ name: 'f', value: 'v' })`
- THEN the badge text is `f:v` and no typed value node exists

#### Scenario: Declared select renders a pill
- GIVEN `FieldValue({ name: 'stage', value: 'build', type: 'select' })`
- THEN an `.innfo-field-select` node with `data-value="build"` is returned

#### Scenario: Undeclared type stays plain
- GIVEN `FieldValue({ name: 'note', value: 'hello', type: '' })`
- THEN it returns `null`

## ADDED Requirements

### Requirement: Edit Modal Value Type Safety

The `EditModal` MUST NOT change the type of the value it edits. A `number` value MUST be edited in an `input type=number` and proposed as a JavaScript number (`Number(input)`); an empty or non-finite number input MUST show an inline error and MUST NOT call `onSave`. A `select` widget MUST contain a blank option (value `""`) and, when the current value is not among the declared options, one extra option carrying that value (marked as not in the options) that is selected; saving without a change MUST propose the original value. An array or object value MUST NOT be passed to `String()` or to a text input: the modal MUST open in comment mode with the Propose control disabled and a note saying list and object values are proposed as a comment. A string containing a newline or longer than 70 characters MUST be edited in a `textarea` and proposed verbatim; other strings keep the single-line input. (S3b P0-2.)

#### Scenario: A number stays a number
- GIVEN `EditModal({ type: 'number', value: 5 })`
- WHEN the value is changed to `7` and saved
- THEN `onSave` receives `proposed === 7` (a number, not `"7"`)

#### Scenario: Empty number is refused
- GIVEN `EditModal({ type: 'number', value: 5 })`
- WHEN the input is cleared and Save is pressed
- THEN an inline error is shown and `onSave` is not called

#### Scenario: Unknown select value is preserved
- GIVEN `EditModal({ type: 'select', value: 'legacy', options: ['a', 'b'] })`
- WHEN Save is pressed without a change
- THEN `onSave` receives `proposed === 'legacy'` (today it silently becomes `'a'`)

#### Scenario: Blank select value is preserved
- GIVEN `EditModal({ type: 'select', value: '', options: ['a', 'b'] })`
- WHEN Save is pressed without a change
- THEN `onSave` receives `proposed === ''`

#### Scenario: Arrays are comment-only
- GIVEN `EditModal({ type: 'string', value: ['a', 'b'] })`
- WHEN the modal opens
- THEN it is in comment mode, the Propose control is disabled, and no input holds `a,b`

#### Scenario: Objects never become "[object Object]"
- GIVEN `EditModal({ type: 'string', value: { w: 1 } })`
- WHEN the modal opens and is saved
- THEN no proposed value equals `[object Object]` and only a comment can be saved

#### Scenario: Multi-line string uses a textarea
- GIVEN `EditModal({ type: 'string', value: 'line one\nline two' })`
- WHEN Save is pressed without a change
- THEN the widget is a `textarea` and `proposed` contains the newline unchanged

### Requirement: Select Field View and Edit

A field declared `select` MUST render its non-empty value as a pill (`.innfo-field-select`, `data-value`) and an empty value as nothing (no pill, no `null` text). The edit modal for a declared `select` field MUST offer exactly the declared `options` plus the blank option and the preserved current value of "Edit Modal Value Type Safety", so a value outside the options can only be proposed when it was already the current value. (S3b P1-5.)

#### Scenario: Declared select edits through a select
- GIVEN an element of concept `Initiative` with `stage: build` and `stage` declared `select` with options `[idea, build, run]`
- WHEN the reviewer opens the edit modal on `stage`
- THEN the widget is `select[data-innfo-widget=select]` with options `""`, `idea`, `build`, `run` and `build` selected

#### Scenario: Free text cannot be proposed for a select (regression)
- GIVEN the same field
- WHEN the modal opens
- THEN no `input[type=text]` is offered for the value (today the declared type never arrives and a free-text input is shown)

#### Scenario: Empty select renders nothing
- GIVEN `FieldValue({ value: '', type: 'select' })`
- THEN no `.innfo-field-select` node is produced

### Requirement: Markdown Inline View and Edit

The kit MUST provide `InnfoUI.Markdown(text, opts)`, a renderer for a safe markdown subset that builds DOM nodes only (`createElement`, `textContent`, `setAttribute`): paragraphs and line breaks, headings, `-`/`*`/`1.` lists, `**strong**`, `*em*`/`_em_`, inline code, block quotes (including `> [!NOTE]`-style callouts) and links. A link MUST render as an `a` only when its target is an `http:`/`https:` URL or a relative path (the scheme allowlist of `innfo-console-runtime` "Source URL link with a safe-scheme allowlist"), with `target="_blank"` and `rel="noopener noreferrer"`; any other target MUST render as plain text. Any other syntax, including raw HTML, MUST render as literal text. The renderer MUST NOT assign any part of its input through `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`. `FieldValue` MUST use it for `markdown` and `markdown_inline`; `markdown_file` stays a path pill. The edit modal for a declared `markdown`/`markdown_inline` field MUST use a `textarea` and propose its text verbatim. The XSS scenarios MUST run under jsdom (not happy-dom). (S3b P1-6.)

#### Scenario: Subset renders as structure
- GIVEN `Markdown('## Goal\n\n- **fast**\n- *cheap*')`
- THEN the result contains a heading with text `Goal`, a list of two items, a `strong` with `fast` and an `em` with `cheap`

#### Scenario: Raw HTML is inert
- GIVEN the input `<img src=x onerror=alert(1)><script>x()</script><b>bold</b>`
- WHEN it is rendered
- THEN no `img`, `script` or `b` element exists and the text appears literally

#### Scenario: Unsafe link schemes are text
- GIVEN the links `[a](javascript:alert(1))`, `[b](JaVaScRiPt:alert(1))`, `[c](data:text/html,<b>x</b>)` and `[d](vbscript:x)`
- WHEN they are rendered
- THEN no `a` element exists and no element is parsed from the targets

#### Scenario: Safe link is a link
- GIVEN `[docs](https://example.com/x)`
- THEN an `a` with `href="https://example.com/x"`, `target="_blank"` and `rel="noopener noreferrer"` exists

#### Scenario: No HTML sink in the renderer
- GIVEN the source of the markdown renderer in `ui-kit.js`
- WHEN it is scanned
- THEN it contains no `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`

#### Scenario: Markdown field edits in a textarea
- GIVEN a field declared `markdown_inline` with a value containing a newline
- WHEN the edit modal opens and is saved unchanged
- THEN the widget is a `textarea` and `proposed` equals the original text

### Requirement: Element Card Tag Row

`ElementCard` MUST render `TagRow` from `element.tags` when the array is non-empty, one chip (`[data-tag]`) per tag, and MUST render no tag row when it is empty or absent (today an empty array still yields an empty row). The runtime MUST pass the payload's `element.tags` to the card. Tag text MUST be inert text. Clicking a chip MUST call `opts.onTag(tag)`; the runtime wires it to add `tag:<tag>` to the active filter. The existing tag-proposal decoration (`review.js`, a comment draft) is unchanged. (S3b P1-7.)

#### Scenario: Tags show on the card
- GIVEN an element with `tags: ["pricing", "ai"]`
- WHEN its card renders
- THEN a `[data-innfo-component=tag-row]` holds chips with `data-tag="pricing"` and `data-tag="ai"`

#### Scenario: No tags, no row
- GIVEN an element with `tags: []`
- THEN no tag row exists

#### Scenario: Chip click filters
- GIVEN a rendered `pricing` chip in a booted console
- WHEN it is clicked
- THEN the active filter contains `tag:pricing` and only elements tagged `pricing` are listed

#### Scenario: Hostile tag is inert
- GIVEN a tag `<img src=x onerror=alert(1)>`
- THEN it renders as text and no `img` element exists

### Requirement: Declared Media Rendering

A field declared `image`, `video` or `audio` MUST render through the media renderers by its declared type, not only by value shape: `image` as an `img` with its path, `video` as `<video controls preload="metadata">`, `audio` as `<audio controls preload="metadata">`, each followed by the path. A media `src` MUST be set only when the value is a relative path or an `http:`/`https:` URL; any other value MUST render as plain text. (S3b P1-10.)

#### Scenario: Declared video renders a player
- GIVEN a field declared `video` with value `sources/demo.mp4`
- WHEN `FieldValue` renders it
- THEN a `video[controls]` with `src` ending in `sources/demo.mp4` exists (today it falls back to a file pill)

#### Scenario: Declared audio renders a player
- GIVEN a field declared `audio` with value `sources/note.m4a`
- THEN an `audio[controls]` exists

#### Scenario: Unsafe media source is text
- GIVEN a field declared `video` with value `javascript:alert(1)`
- THEN no `video` element exists and the value is shown as text
