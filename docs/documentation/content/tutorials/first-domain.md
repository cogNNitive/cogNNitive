# Create your first domaiNN

> [!NOTE]
> This tutorial takes about five minutes. It walks the happy path from installing the ecosystem to a validated domaiNN with one source and one kNNowledge document. No prior knowledge of cogNNitive is required.

A **domaiNN** is the container that holds your knowledge: kNNowledge documents, bluepriNNts, sources, procedures, and artifacts. In this tutorial you create one, feed it a single raw file, and turn that file into a cited kNNowledge document that passes validation.

## 1. Install the ecosystem

You do not install cogNNitive by hand. You install it **through your AI coding agent**. Open your agent (Claude Code, OpenCode, Antigravity, or Cursor) in the folder where you want to work and paste this single instruction:

```text
I want to use https://cognnitive.com/use
```

The agent fetches the bootstrap manifest, registers the `nn-mcp` server, and downloads the agent skills into your local agent environment. See [Install and connect an AI agent](../how-to/install-agent.md) for what happens behind the scenes.

**Verify it worked:** ask the agent to list its tools. You should see tools such as `init_domain`, `cognitivize`, and `validate_knowledge` available through `nn-mcp`.

## 2. Create the domaiNN

Ask the agent to initialize a new domain. The `init_domain` tool creates the canonical folder skeleton, the `domaiNN_NN.md` manifest, and a `.gitattributes` that pins raw-byte hashes:

```text
init_domain({ dir: "my-domain", name: "My Domain" })
```

This creates:

| Path | Role |
|---|---|
| `domaiNN_NN.md` | The domain manifest (itself a kNNowledge document). |
| `kNNowledge/` | Your Level-3 kNNowledge documents. |
| `sources/import/` | The drop box for raw files you bring in. |
| `sources/conversations/` | Promoted conversation transcripts. |
| `conversations/` | Raw session logs. |
| `artifacts/` | Every generated or curated output. |
| `procedures/` | Procedure definitions. |
| `staging/` | Scratch space (never citable). |
| `changes/` | Proposed and applied changesets. |
| `.gitattributes` | Contains `* -text` so source hashes stay byte-stable. |

`init_domain` refuses a directory that exists and is not empty.

## 3. Add a source

Knowledge starts outside the tool. Save any text file — meeting notes, a short brief, a spec — into `sources/import/`:

```text
my-domain/sources/import/meeting-notes.md
```

The file is stored **verbatim**. Nothing is moved, renamed, or rewritten. At this point it is bytes on disk, not yet a citable Source.

## 4. Cognitivize the source

Ask the agent to cognitivize the file, or call the tool directly:

```text
cognitivize({ path: "sources/import/meeting-notes.md" })
```

This writes a **sidecar** next to the file — `meeting-notes.md_sidecar_NN.md` — carrying its SHA-256, size, format, and a normalized body for binary formats. The raw file is never modified. The sidecar is what makes every heading in the file a citable unit. See [Cognitivize documents with sidecars](../how-to/cognitivize.md).

**Verify it worked:** the sidecar appears next to the raw file, and its frontmatter `sha256` matches the file's bytes.

## 5. Create your first kNNowledge document

Create a Level-3 document from a blueprint. The `init_knowledge` tool scaffolds the frontmatter and a starter body, records the creation as an `add_model` change, and returns the canonical document id:

```text
init_knowledge({
  id: "My-Domain",
  blueprint_name: "business",
  blueprint_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/business/spec_NN.md"
})
```

The id is canonicalized to `<name>_<blueprint>` (for example `My-Domain_business`) and carries no version in the filename — the version lives in the `knowledge_version` frontmatter key. `init_knowledge` is create-only: an existing id fails with `MODEL_EXISTS` and the file is left untouched.

## 6. Cite a heading and validate

Add a citation from an element to the exact heading it came from, using the `@` grammar:

```markdown
## NN Stakeholders: Customer

slug:: customer
sources:: [sources/import/meeting-notes.md@## Key Feedback]
The customer asked for a faster onboarding flow.
```

Then validate the document:

```text
validate_knowledge({ id: "My-Domain_business" })
```

A clean document reports no errors and resolves every citation. If a heading was mistyped, you get a `KU_UNKNOWN_SLUG` warning; if the file moved, a `KU_DANGLING_FILE` error. See [Validate a domaiNN](../how-to/validate-domain.md) for the full diagnostic list.

## What you built

You now have a domaiNN with a manifest, a cognitivized source, and a validated kNNowledge document that cites a heading of that source. That is the smallest complete cogNNitive unit: a claim, its evidence, and a container that tracks both.

## Next steps

- [Model a domain from scratch](domain-from-scratch.md) — a longer walkthrough that adds an artifact, a change, and the lineage record.
- [The four levels](../concepts/levels.md) — the concepts behind `defiNNition`, `iNNfo`, `bluepriNNt`, and `kNNowledge`.
- [Import and cite sources](../how-to/import-sources.md) — the full citation grammar.
