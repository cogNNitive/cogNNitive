# cogNNitive Documentation

**cogNNitive** turns unstructured input — meeting notes, PDFs, spreadsheets, ideas — into *validated, cited, versioned knowledge* that both humans and AI agents can query. Instead of chatting straight to a model and losing the reasoning, you model it: a document declares what it conforms to, where each claim comes from, and how it evolved.

This site is the canonical documentation for the whole ecosystem. It is written in standard Markdown and rendered by [Docsify](https://docsify.js.org) with **zero build step**: the navigation and catalog are modelled as an iNNfo document, then generated.

## How this documentation is organized

The pages follow the [Diátaxis](https://diataxis.fr) framework, so you always know which kind of answer you are reading:

| Section | Purpose |
|---|---|
| 🚀 **Tutorials** | Learning-oriented. Follow along from zero to a working result. |
| 📖 **How-To Guides** | Task-oriented. Recipes for a specific job. |
| 💡 **Architecture & Concepts** | Understanding-oriented. How the system is designed and why. |
| 🛠 **Reference** | Information-oriented. Tools, catalogues, and the glossary. |
| ⚡ **Agent Skills** | The skills that extend your AI coding agent. |

## Where to start

- **New to cogNNitive?** Begin with [Create your first domaiNN](content/tutorials/first-domain.md).
- **Need to get something done?** Jump to the [How-To Guides](content/how-to/install-agent.md).
- **Want the mental model?** Read [The four levels](content/concepts/levels.md).
- **Looking up a term or a tool?** See the [Glossary](content/reference/glossary.md) and the [MCP tools](content/reference/mcp-tools.md).

## How this site is built

- The page catalog, sections, and ordering live in the domain model [`documentation_NN.md`](documentation_NN.md).
- The prose lives in `content/` as plain Markdown.
- The navigation (`_sidebar.md`, `_navbar.md`), the AI index (`llms.txt`, `ai-index.yaml`), and the tool inventory are **generated** from the model and the code — never hand-edited.

> [!NOTE]
> This documentation lives inside a cogNNitive **domaiNN**, so the model that governs it is itself a validated iNNfo document. See [The four levels](content/concepts/levels.md) for what that means.
