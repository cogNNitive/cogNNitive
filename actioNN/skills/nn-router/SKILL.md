---
name: nn-router
description: Primary Front Controller, ecosystem entry point, system governance, setup, environment readiness gate (Preflight), and skill router for cogNNitive. Triggers: NN, nn, /nn, /nn-router, router, bootstrap, setup, preflight.
disable-model-invocation: true
version: "V_3-2-0"
last_updated: 2026-09-03
license: MIT
compatibility: opencode, claude-code, cursor, any agent supporting skills
metadata:
  source_type: original
bundled_templates: []
---

# nn System & Router

Primary Front Controller and single entry point for system governance, setup, readiness checks, and routing in the cogNNitive ecosystem.

---

## 0. Activation Gate
Execute the canonical activation gate defined in `nn-preflight` (session greeting + deterministic preflight integrity check).

---

## 1. Environment Readiness (Preflight Gate)

Before launching any specialized workflow, `nn-router` verifies the environment:
1. **Preflight Runner**: Ensures the Integrity & Preflight Check passed via `nn-preflight`.
2. **Node.js**: Checks `node --version` (>= 18 required).
3. **MCP Server**: Verifies `innfo-mcp` responsiveness via `innfo-mcp_list_models` (or resolves bundle at `~/.agents/mcp/innfo-mcp.bundle.js` or `.cogNNitive/mcp-bundle.js`).
4. **Workspace Layout**: Ensures workspace contains standard folders (`sources/`, `models/`, `procedures/`, `artifacts/`, `index.md`). There is no `sources/raw/` — see `nn-preflight` and `nn-trannsform`.

---

## 2. System Governance & UX Protocol (MANDATORY)

Every agent interaction across the cogNNitive ecosystem MUST follow these strict UX and governance rules:

1. **Zero Unilateral Mutation (Consent First)**:
   - Prohibit moving, renaming, or deleting user files (e.g. moving raw PDFs to `sources/original/` or restructuring user directories) without prior explicit confirmation from the user.
   - Always ask for confirmation before executing file movements or workspace restructures.

2. **Recommended Option First**:
   - In all decision menus or option lists presented to the user, option `[1]` or `[a]` MUST be labeled with the `(Recommended)` prefix.

3. **Multi-Selection Clarification**:
   - Whenever options are not mutually exclusive, the agent MUST add the explicit notice:
     `"You can select one option or a combination (e.g. A and B)"`.

4. **Visual Component & Artifact Style Selection (`nn-design-presets` Activation)**:
   - Whenever generating any visual component, web interface, HTML dashboard companion, site page, or styled deliverable artifact, the agent MUST ask the user which visual design style / preset to apply before generation.
   - This prompt MUST load and activate the **`nn-design-presets`** skill to retrieve branding tokens (e.g. `morado-nazareno`).

5. **Conversation Logging Protocol (MANDATORY)**:
   - Every conversation using NN skills MUST save a transcript or markdown summary to `<workspace_root>/conversations/YYYY-MM-DD_<model_name>_<title_3_to_6_words>.md` (or `conversations/YYYY-MM-DD_<title_3_to_6_words>.md` if no model is active).

---

## 3. Canonical Skill Catalog (7 Core Skills)

The cogNNitive ecosystem is streamlined into 7 specialized skills:

| Skill | Role & Scope | Invocation |
|:---|:---|:---|
| **`nn-router`** | System governance, setup, preflight readiness gate & routing | User / `/nn-router` |
| **`nn-preflight`** | Environment readiness gate (Tier 1/2 checks) — loaded by `nn-router` and `nn-trannsform` before they proceed | Model (Auto) |
| **`nn-trannsform`** | Document ingestion (PDF/DOCX/XLSX), template transformation & procedures orchestration (`procedures_V_0-2-0_NN.md`) | User / Model |
| **`nn-innfo`** | iNNfo model authoring, editing, schema validation & step-by-step Model Creation Wizard (Meta-template V_0-2-0) | User / Model |
| **`nn-site-generator`** | Website generation & hydration | User / Model |
| **`nn-design-presets`** | Visual design system tokens (Morado Nazareno, 8px grid) — activated for visual artifacts | Model (Auto/User) |
| **`nn-skills-lifecycle`** | Install/update/audit skills from the remote manifest (Steward branch) | User / Model |

---

## 4. How to Route

1. Read the generated registry: [`.cogNNitive/skill-registry.md`](../../.cogNNitive/skill-registry.md).
2. Match the user's request against the 5 core skills above.
3. For model authoring/wizard → Load **`nn-innfo`**.
4. For documents, transformations or multi-step procedures → Load **`nn-trannsform`**.
5. For web design or site generation → Load **`nn-site-generator`** / **`nn-design-presets`**.

---

## If the user doesn't know where to start

Ask them to describe their current situation in one sentence, then recommend the
single best-fit skill from the registry — do not dump the whole list. Always format the recommendation with `(Recommended)` as option `[a]`.
