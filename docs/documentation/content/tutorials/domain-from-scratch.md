# Model a domain from scratch

This tutorial is the full hands-on walkthrough: scaffold a domaiNN, ingest a source, cognitivize it, model an element that cites a heading of that source, export an artifact, apply a change, and read the lineage record that ties it all together.

The example is a small coffee-subscription business, **Aurora Roasters**, so every file fits on screen and every step stays checkable.

## What you will build

```text
Aurora/
├── domaiNN_NN.md                                  # the manifest (Level-3 container)
├── .gitattributes                                 # * -text  → byte-stable source hashes
├── kNNowledge/
│   └── Aurora_business_NN.md                      # a kNNowledge document
├── sources/
│   └── import/
│       ├── discovery-call.md                      # raw source
│       └── discovery-call.md_sidecar_NN.md        # its co-located sidecar
├── artifacts/
│   └── Aurora_Monthly_Review_20261014T093000Z.md  # a write-once deliverable
├── changes/
│   └── Aurora_reviewer_20261015T101500Z_changes_NN.md
└── Aurora_cogNNitive_NN.md                        # the lineage record
```

## Step 1 — Scaffold the domaiNN

An empty domain is scaffolded, not hand-built. The `init_domain` tool creates the manifest, the folder skeleton, and the `.gitattributes` that pins source hashes:

```text
init_domain({ dir: "Aurora", name: "Aurora" })
```

`domaiNN_NN.md` is generated with the canonical frontmatter (`level: 3`, a `parent_spec` pointing at the `domaiNN` bluepriNNt, `knowledge_version`) and a single `## NN domaiNN: Aurora` element whose `knowledge_dir` and `blueprints_dir` fields define the layout.

> [!NOTE]
> `.gitattributes` ships `* -text` because a source's SHA-256 is its change-detection key. If Git rewrote line endings on checkout, the hash would move even though the content did not. Pinning the bytes keeps the fingerprint stable across machines.

## Step 2 — Drop in a raw source

Knowledge starts outside the tool. Save an ordinary file into `sources/import/` — untouched, exactly as the team produced it:

`sources/import/discovery-call.md`

```markdown
# Discovery call — Aurora Roasters

## Founding team
Maya Ortiz (head roaster) and Tomás Reyes (operations) are equal co-founders.

## The offer
Two 250 g bags a month, roaster's choice, 32 USD per month, shipping included.
```

Nothing has touched this file: it has no sidecar yet. It is bytes on disk, not yet a Source.

## Step 3 — Cognitivize it

Ingestion turns a raw file into a citable Source by writing a sidecar **next to it**, in place. Run the scan through the agent, or run the `nn-sources` CLI:

```console
$ node skills/nn-sources/scripts/index.js --scan --src Aurora
✔ cognitivize  sources/import/discovery-call.md → sources/import/discovery-call.md_sidecar_NN.md
Lineage: Aurora_cogNNitive_NN.md refreshed (1 source)
```

The raw file is untouched. The sidecar carries only origin metadata for text formats (the raw file is the citation target):

`sources/import/discovery-call.md_sidecar_NN.md`

```markdown
---
source_file: "discovery-call.md"
sha256: "3f9c1d0b7a42e5c8d6f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7"
size_bytes: 214
source_format: "md"
normalized_at: "2026-10-14T09:12:00Z"
normalized_by: "nn-sources"
---
```

A binary (PDF, DOCX, XLSX, image) would instead carry the normalized Markdown **body** in its sidecar, and only that body is citable (`report.pdf_sidecar_NN.md@## Findings`).

## Step 4 — Model an element that cites a heading

Create a kNNowledge document from the `business` bluepriNNt:

```text
init_knowledge({
  id: "Aurora",
  blueprint_name: "business",
  blueprint_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/business/spec_NN.md"
})
```

The server returns the canonical id `Aurora_business`. Now add an element whose `sources::` points at the exact heading the claim came from, using the `@## <Heading>` grammar:

`kNNowledge/Aurora_business_NN.md`

```markdown
---
level: 3
parent_spec:
  name: "business"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/business/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Aurora Roasters Business Model"
---

# NN Stakeholders

## NN Stakeholders: Founding Team

slug:: founding-team
relationship_model:: Co-founders & Equity Partners
sources:: [sources/import/discovery-call.md@## Founding team]
Maya Ortiz (head roaster) and Tomás Reyes (operations) are equal co-founders.
```

The heading text after `@##` is slugified on read, so `@## Founding team` resolves to the `## Founding team` heading in the source. Every citation path is domaiNN-relative and written in full — there is no implicit `sources/` prefix.

Prefer the changeset path (Step 6) over direct file writes; it is shown inline here only to make the grammar concrete.

## Step 5 — Export an artifact

A producer writes a **write-once** artifact under `artifacts/`: the name carries a UTC suffix `_YYYYMMDDTHHmmssZ` placed before the extension, and existing bytes are never overwritten.

`artifacts/Aurora_Monthly_Review_20261014T093000Z.md`

```markdown
---
title: "Aurora — Monthly Review"
sources: ["kNNowledge/Aurora_business_NN.md"]
generated_at: "2026-10-14T09:30:00Z"
---

# Aurora — Monthly Review

The two-person team is confirmed and the offer is stable.[^1]

[^1]: kNNowledge/Aurora_business_NN.md@## NN Stakeholders: Founding Team
```

Run the producer twice on unchanged input and it writes nothing; change the input and it writes a new family member beside the old one, so earlier citations still resolve.

## Step 6 — Apply a change

The supported way to mutate a kNNowledge document is a **changeset**, never a direct edit. Propose one with `propose_changeset`:

```text
propose_changeset({
  operations: [
    {
      op: "update_field",
      target: "Aurora_business@founding-team&relationship_model",
      to: "Equal Co-founders (50/50)",
      sources: "sources/import/discovery-call.md@## Founding team"
    }
  ],
  title: "Confirm equity split"
})
```

The tool writes a sealed changeset with `status: proposed` under `changes/`, regenerates the domain console, and opens it so you can review the diff. It **never applies**. When you are satisfied, apply it:

```text
apply_change({ changeset: "changes/Aurora_agent_<stamp>_changes_NN.md" })
```

The apply is atomic and re-validates; the document's `knowledge_version` bumps once, and the mutated element's `sources::` is re-pointed at the change (`changes/<file>.md@## NN Change: <id>`), which in turn carries the evidence. See [Review changesets](../how-to/review-changesets.md).

## Step 7 — Read the lineage record

Every scan, cognitivize, and apply keeps `<Project>_cogNNitive_NN.md` in sync. It has three **projected** sections and an **append-only** journal:

```markdown
# NN Sources

## NN Sources: discovery-call.md
raw_filename:: sources/import/discovery-call.md
raw_hash:: 3f9c1d0b7a42e5c8d6f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7
normalized_content:: sources/import/discovery-call.md_sidecar_NN.md
version:: V1

# NN ModelRecords

## NN ModelRecords: Aurora business
model_ref:: kNNowledge/Aurora_business_NN.md

# NN Artifacts

## NN Artifacts: Aurora_Monthly_Review_20261014T093000Z
artifact_ref:: artifacts/Aurora_Monthly_Review_20261014T093000Z.md

# NN Procedures

<!-- Append-only. One entry per pipeline run. -->
```

The three view sections are a pure function of the files on disk. If someone edits one by hand, the drift gate reports `LINEAGE_DRIFT`:

```console
$ node skills/nn-sources/scripts/index.js --lineage --check --src Aurora
✖ LINEAGE_DRIFT  # NN Sources differs from a fresh projection
```

The fix is always regeneration, never a hand edit:

```text
sync_lineage({ domain: "Aurora" })
```

See [Sync lineage and back up a domaiNN](../how-to/sync-and-backup.md).

## Where everything lives

| Path | Role | Mutability |
|---|---|---|
| `domaiNN_NN.md` | Domain manifest (Level-3 container). | Changes via a changeset. |
| `sources/import/` | Raw, immutable sources and their co-located sidecars. | Write-once; new members, never edits. |
| `kNNowledge/*_NN.md` | Level-3 kNNowledge documents with `sources::` citations. | Changes via a changeset. |
| `artifacts/` | Generated and curated outputs. | Write-once (UTC-suffixed). |
| `changes/` | The record of every proposed and applied change. | Append-only. |
| `<Project>_cogNNitive_NN.md` | The lineage record: projected views plus a run journal. | Derived; never hand-edited. |
| `staging/` | Ephemeral extraction buffer. | Never citable, never projected. |

## See also

- [Create your first domaiNN](first-domain.md) — the five-minute version.
- [Import and cite sources](../how-to/import-sources.md) — the exact citation grammar.
- [Sources, citations and lineage](../concepts/sources-citations-lineage.md) — the provenance chain.
