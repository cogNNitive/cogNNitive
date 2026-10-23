# Cognitivize documents with sidecars

**Cognitivize** is the operation that makes a raw file citable without touching it. It reads the file's bytes and writes a **sidecar** next to it. The raw file keeps its name, its path, and its bytes.

## What a sidecar is

A sidecar is a co-located kNNowledge-level document named after its subject:

```text
<file>.<ext>_sidecar_NN.md
```

Examples:

```text
sources/import/discovery-call.md_sidecar_NN.md
sources/import/report_20261001T101500Z.pdf_sidecar_NN.md
sources/import/trial-metrics.csv_sidecar_NN.md
```

The `_sidecar_NN.md` suffix marks it as a kNNowledge document, but a sidecar is a concept, not a new level. It lives next to its subject, and the subject — not the sidecar — is the citation target for text formats.

## What a sidecar stores

The sidecar frontmatter is written by `cognitivize` alone:

| Field | Meaning |
|---|---|
| `source_file` | The subject file's name. |
| `sha256` | SHA-256 of the subject's raw bytes — the change-detection key. |
| `size_bytes` | Size of the subject in bytes. |
| `source_format` | The detected format (`md`, `csv`, `json`, `pdf`, …). |
| `normalized_at` | When the sidecar was written. |
| `normalized_by` | The converter that ran, when one did. |

For text-like formats (Markdown, CSV, JSON) the sidecar is **bodyless** — the raw file is the citation target. For binary formats (PDF, DOCX, XLSX) the sidecar carries the **normalized Markdown body**, and only that body is citable:

```markdown
---
source_file: "report_20261001T101500Z.pdf"
sha256: "9b1e4f2a3c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7"
size_bytes: 48211
source_format: "pdf"
normalized_at: "2026-10-14T09:12:00Z"
normalized_by: "nn-sources"
---

# Findings

Subscribers self-select a roast profile at signup, which is the retention hook.
```

## Why the original is never modified

The raw file is the evidence. If the tool rewrote it, the SHA-256 would no longer describe the bytes the author produced, and the audit chain would break. So `cognitivize`:

- **reads** the raw bytes and writes only the sidecar;
- **never** moves, renames, or deletes the subject;
- refreshes the sidecar **in place** when the bytes change.

A changed file is not archived and not snapshotted: the sidecar is rewritten beside it, and the new `sha256` marks the new state. A file brought in by URL import or conversation promotion is instead written write-once with a UTC suffix, so a changed external file lands as a new family member and earlier citations stay valid.

## How to invoke it

**MCP tool** — for `md`, `csv`, and `json` files:

```text
cognitivize({ path: "sources/import/notes.md" })
```

The tool rejects paths outside the domaiNN, sidecars, and `_NN.md` documents. For a binary it returns the non-throwing status `requires-cli` and writes nothing.

**nn-sources CLI** — for any file or folder, including binaries:

```console
$ node skills/nn-sources/scripts/index.js --cognitivize "sources/import/report.pdf" --src Aurora
$ node skills/nn-sources/scripts/index.js --scan --src Aurora
```

`--scan` walks `sources/import/` and `sources/conversations/` recursively and runs the same per-file operation, so the two paths always produce the same sidecar. `--cognitivize` on a directory is recursive and skips sidecars and `staging/`.

## Staleness

A sidecar is **stale** when its `sha256` no longer matches the subject's raw bytes. `--scan` detects this, refreshes the sidecar in place, and audits downstream citations, printing an `[IMPACT WARNING]` when a document cited a section that changed or disappeared. `nn-preflight` reports a stale file as an actionable warning; a sidecar whose raw file is gone is reported as dangling and preserved — nothing is deleted without explicit consent.

> [!NOTE]
> Re-running `cognitivize` on unchanged bytes writes nothing. Only changed bytes produce a refresh.

## See also

- [Import and cite sources](import-sources.md) — how to cite the sidecar and the raw file.
- [Sync lineage and back up a domaiNN](sync-and-backup.md) — the sidecar feeds the lineage record.
