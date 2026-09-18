# Multi-Agent Guidance

## Purpose
Standardize the embedded procedure model to canonical `procedures` V_0-2-1 template specification and provide universal, agent-agnostic guidance across the editor UI, parser, and project documentation while highlighting OpenCode Desktop as the reference desktop client.

## Requirements

### Requirement: Canonical Procedure Spec Compliance for procedure_NN.md
The embedded procedure document `iNNfo/apps/innfo-editor/src/ai-guide/procedure_NN.md` MUST strictly conform to the canonical `procedures` template specification (`template_version: "V_0-2-1"`).

- The document frontmatter MUST declare `template_version: "V_0-2-1"` and parent spec `name: "procedures"`.
- The index section MUST use canonical `# NN index` with wikilink references (`* [[Work]]`, `* [[Roles]]`, `* [[Artifact]]`, `* [[Tools]]`, and optionally `* [[Procedure]]`).
- Section headers and element definitions MUST follow canonical heading conventions (`# NN <Concept>`, `## NN <Concept>: <Name>` or element lists).
- Matrices MUST use standard `# NN matrices: work-roles matrix` (or markdown table) formatting consistent with the template.

#### Scenario: Validating frontmatter and metadata of procedure_NN.md
- GIVEN the embedded file `procedure_NN.md`
- WHEN parsed or validated against the `procedures` template `V_0-2-1`
- THEN the frontmatter contains `parent_spec.name: "procedures"` and `template_version: "V_0-2-1"`
- AND the index section matches `# NN index` with canonical `[[Concept]]` wikilinks

#### Scenario: Validating concept and work element structures
- GIVEN the `procedure_NN.md` content
- WHEN inspecting concept sections
- THEN work steps declare step types, tool references, and valid I/O relationships
- AND roles define internal/external scope definitions

---

### Requirement: Multi-Agent Guidance Representation in Procedure Model & UI Parser
The AI guide parser `guide.ts` and procedure model MUST support and present multi-agent workflows across modern AI coding agents (such as Antigravity, Claude Code, Codex, OpenCode Desktop, Cursor) with OpenCode Desktop featured as the recommended reference client.

- `guide.ts` MUST parse modern `# NN` headings, element declarations, tool blocks, work steps, and matrices without brittle single-format dependencies.
- The procedure model MUST describe compatibility with any modern AI agent supporting skills and MCP tools.
- Step prompts MUST reliably extract actionable `innfo:` activation commands (e.g. `innfo: Load the nn-innfo skill — ...`).
- Dynamic UI subtitle and tool entries MUST reflect open multi-agent capabilities rather than exclusive single-agent support.

#### Scenario: Parsing modern canonical procedure document in guide.ts
- GIVEN canonical `procedure_NN.md` content with modern `# NN` headers and tool definitions
- WHEN `parseGuide(content)` is executed
- THEN it parses all defined work steps, tool entries, and RACI matrices without errors
- AND the extracted steps retain descriptive HTML and associated `innfo:` prompt snippets

#### Scenario: Multi-agent tool representation in guide output
- GIVEN `procedure_NN.md` listing OpenCode Desktop alongside universal agent compatibility
- WHEN `parseGuide` produces `GuideData`
- THEN `tools` contains the reference desktop client entry with valid URL and initials
- AND the procedure instructions guide users on running skills with their agent of choice

---

### Requirement: Consistent Agent-Agnostic Framing Across Documentation
Public documentation and guides (`docs/innfo/index.md`, `docs/use/index.html`, and related assets) MUST present cogNNitive and iNNfo as universally compatible with any AI coding agent while recommending OpenCode Desktop as the reference desktop client.

- Documentation MUST NOT use exclusivity phrasing such as "the supported AI agent" for a single tool.
- Documentation MUST explain that any AI agent with MCP or skill support (Antigravity, Claude Code, Codex, OpenCode, Cursor) can interact with iNNfo models.
- Documentation MUST provide clear pointers to OpenCode Desktop as the recommended desktop client application.

#### Scenario: Agent compatibility section in documentation
- GIVEN a user reading `docs/innfo/index.md` or `docs/use/index.html`
- WHEN reviewing the AI tooling and agent interaction section
- THEN the text describes broad compatibility with modern AI agents (Antigravity, Claude Code, Codex, OpenCode, Cursor)
- AND OpenCode Desktop is identified as the reference desktop client without implying exclusive support

#### Scenario: Skill and MCP setup instructions in documentation
- GIVEN instructions for configuring AI workflows
- WHEN the user follows the setup guide
- THEN instructions specify how to invoke the `nn-innfo` skill and `innfo-mcp` across supported agents
- AND agent-agnostic prompt formats (`innfo: ...`) are demonstrated
