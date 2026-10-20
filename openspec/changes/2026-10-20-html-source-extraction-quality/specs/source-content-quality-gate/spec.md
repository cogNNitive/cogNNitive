# Spec: source-content-quality-gate

## Purpose

Guarantee that a cognitivized source presented as usable actually carries the document's
content. Today a conversion that returns an anti-bot interstitial, an empty body or a
trivial fragment is written as an ordinary sidecar and presented as `status:: ready`, so a
downstream model can cite a captcha page as evidence. This capability assesses the produced
body at the conversion seam and surfaces the outcome instead of discarding it.

## ADDED Requirements

### Requirement: A binary source's normalized body is assessed before it is presented as usable

Every binary source (`pdf`, `html`, `docx`, `xlsx`, …) MUST have its normalized body
assessed after conversion and before the source is presented as usable. The assessment MUST
distinguish at least: a healthy extraction, an anti-bot / JavaScript-wall interstitial, an
empty body, and a trivial body. The outcome MUST be recorded on the source and MUST be
visible to the catalog and the lineage record; it MUST NOT be silently treated as `ready`.

#### Scenario: An anti-bot interstitial is not presented as usable

- GIVEN a cognitivized HTML source whose body is the text of a reCAPTCHA / `Client Challenge`
  / "JavaScript is disabled" / "enable JS and disable any ad blocker" interstitial
- WHEN the source is registered
- THEN its status is not `ready`
- AND it carries a reason identifying the anti-bot wall
- AND a model addressed to it is warned that it is not usable evidence

#### Scenario: A healthy article is usable

- GIVEN a cognitivized HTML article with a substantial prose body
- WHEN the source is registered
- THEN its status is `ready`
- AND it carries no wall reason

#### Scenario: An empty or trivial body is not usable

- GIVEN a cognitivized source whose body has fewer than a minimal number of non-whitespace characters
- WHEN the source is registered
- THEN its status is not `ready`
- AND it carries a reason identifying the empty/trivial extraction

### Requirement: The source status distinguishes a content problem from an operational failure

The `Source.status` value set MUST gain a value that means "ingested, but the extracted
content is not trustworthy" — distinct from `error`, which means the operation itself failed.
A wall or empty extraction is a content outcome, not a transient failure, and the two MUST
NOT be conflated. The new value MUST be reflected in the `sources` bluepriNNt `status`
field definition and in the lineage record.

#### Scenario: A wall is `partial`, not `error`

- GIVEN a source whose body is an anti-bot wall
- WHEN its status is recorded
- THEN the status is the content-problem value (not `ready`, not `error`)

#### Scenario: A transient failure is still `error`

- GIVEN a conversion that threw or could not fetch its input
- WHEN the status is recorded
- THEN the status is `error`

### Requirement: A zero-byte subject is refused

A raw file whose byte length is zero MUST NOT be cognitivized into a usable source. The
conversion MUST refuse it (writing no sidecar content that presents it as usable) and MUST
report the refusal, rather than registering a source whose `sha256` is the hash of the empty
string.

#### Scenario: A zero-byte download is refused

- GIVEN `sources/import/<name>.html` with `size_bytes: 0`
- WHEN it is cognitivized
- THEN it is refused with an explicit reason
- AND it does not appear as a usable entry in the lineage `# NN Sources`

#### Scenario: Import warns early

- GIVEN a download that returned zero bytes
- WHEN the import completes
- THEN the import reports the zero-byte condition

### Requirement: A sidecar whose subject does not match its name is an integrity error

When a sidecar's declared `source_file` does not resolve to the sidecar's own subject (the
file its name derives from), the lineage check MUST report `SIDECAR_SUBJECT_MISMATCH` as an
**error** (not a warning or a silent diagnostic), because a citation to that sidecar cannot
be traced to hashed bytes.

#### Scenario: A mismatched sidecar fails the check

- GIVEN `X.docx_sidecar_NN.md` whose frontmatter declares `source_file: X_V_0-1-0.docx`,
  and no such file on disk
- WHEN `--lineage --check` runs
- THEN it reports `SIDECAR_SUBJECT_MISMATCH` for that sidecar
- AND it exits non-zero

#### Scenario: A matching sidecar passes

- GIVEN a sidecar whose `source_file` is exactly its own subject
- WHEN `--lineage --check` runs
- THEN no mismatch is reported for it