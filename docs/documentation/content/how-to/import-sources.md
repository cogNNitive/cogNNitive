# Import and cite sources

A **Source** is a file that lives inside a domaiNN and can be cited. Sources enter through one folder, get a co-located sidecar, and are then addressed by a kNNowledge element using a precise pointer grammar.

## The two source trees

`sources/` is the provenance root of a domaiNN. It holds the raw material:

| Path | Holds | Notes |
|---|---|---|
| `sources/import/` | Raw files you bring in — the only raw-import location. | Copied verbatim; never moved, renamed, or rewritten. |
| `sources/conversations/` | Promoted conversation transcripts. | Full verbatim transcripts, write-once. |

A co-located **sidecar** (`<file>.<ext>_sidecar_NN.md`) sits next to each raw file and records its hash and metadata. There is no mirror tree: the retired `sources/nn/` layout is never read or written, and the runtime derives everything from the raw file and its sidecar, not from folder names.

> [!NOTE]
> A citation path is domaiNN-relative and written in full. There is no implicit `sources/` prefix — `sources/import/notes.md@## Intro` is the whole address.

## 1. Drop a file into `sources/import/`

Copy the file into `sources/import/`. You may organize subfolders freely; the sidecar simply sits next to its raw file, so no structure is mirrored anywhere. Files placed by hand keep their names; files brought in by URL import or conversation promotion are written write-once with a UTC suffix (`<stem>_<YYYYMMDDTHHmmssZ>.<ext>`).

Formats the scanner converts directly include `txt`, `md`, `csv`, `json`, `html`, `docx`, `pdf`, and `xlsx`. Media such as `.png`, `.mp3`, and `.wav` is **not** converted: place a transcript or description as a text file and cognitivize that instead. Raw media is kept untouched.

## 2. Cognitivize it

Run the scan, or cognitivize one file:

```console
$ node skills/nn-sources/scripts/index.js --scan --src Aurora
$ node skills/nn-sources/scripts/index.js --cognitivize "sources/import/notes.md" --src Aurora
```

The MCP `cognitivize` tool does the same for `md`, `csv`, and `json`:

```text
cognitivize({ path: "sources/import/notes.md" })
```

Either way, the raw file is untouched and a sidecar appears beside it. See [Cognitivize documents with sidecars](cognitivize.md).

## 3. Cite a heading

A kNNowledge element points at the exact unit it came from with a `sources::` field. `sources::` is always a bracketed list, even for one entry:

```markdown
## NN Stakeholders: Customer

slug:: customer
sources:: [sources/import/client_interview.md@## Key Feedback]
The customer asked for a faster onboarding flow.
```

The unit grammar is chosen by the target file extension:

| Target | Grammar | Example |
|---|---|---|
| Markdown heading | `<path>@<level><Heading>` | `sources/import/notes.md@## Key Points` |
| CSV row / cell | `<path>@<row-id>` or `<path>@<row-id>&<column>` | `sources/import/metrics.csv@2026-09&churn_rate` |
| JSON value | `<path>@/<pointer>` (RFC 6901) | `sources/import/data.json@/items/0/name` |
| Whole file | bare `<path>` | `sources/import/notes.md` |

Markdown units keep their heading level (`@#`, `@##`, `@###`) and slugify GitHub-style; the `Concept: Element` boundary stays visible as `--`. A CSV row id is the **explicit first-column value**, never a positional row number. Binary files cannot be cited directly — cite the sidecar, whose body holds the normalized Markdown:

```markdown
sources:: [sources/import/report_20261001T101500Z.pdf_sidecar_NN.md@## Findings]
```

## Rules that keep citations honest

- **No line ranges.** `#L12-L45` is rejected as `KU_MALFORMED`.
- **No `src-NNN` ids.** The old wrapper is retired; cite the real path.
- **No queries.** A `path?filter=value` expression selects a set and is never a citation (`QU_NOT_PROVENANCE`).
- **No `staging/`.** A citation into scratch space reports `KU_EXCLUDED_PATH`.
- **No duplicates.** Do not repeat the same reference twice; if there is no real source, omit the field entirely.

## The co-located sidecar

For every cognitivized file, the sidecar carries origin metadata (`source_file`, `sha256`, `size_bytes`, `source_format`, `normalized_at`) and, for binaries, the normalized body. The `sha256` is the change-detection key: change the raw bytes and the sidecar is refreshed in place; the earlier bytes are never rewritten.

## See also

- [Cognitivize documents with sidecars](cognitivize.md) — the sidecar in detail.
- [Sources, citations and lineage](../concepts/sources-citations-lineage.md) — how the three provenance terms relate.
- [Model a domain from scratch](../tutorials/domain-from-scratch.md) — the full walkthrough.
