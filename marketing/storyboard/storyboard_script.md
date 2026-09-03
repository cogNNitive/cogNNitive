# Technical & Visual Storyboard: cogNNitive Semantic Architecture Lifecycle (7 Scenes)

This technical storyboard outlines the interactive 7-scene animation demonstrating the end-to-end architecture of the cogNNitive monorepo (`iNNfo`, `actioNN/nn-trannsform`, and `innfo-mcp`) with focused scene viewports, 100% English copy, and a deliberate, pedagogical presentation pace.

---

## Visual Identity & Design Principles
* **Canvas:** Clean white background (`#ffffff`), subtle technical grid lines, soft natural shadows (`box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.05)`).
* **Actors & Metaphor:**
  * **User Profile (Scene 1):** The human architect seeking to enrich the system (`👤 User: Domain Architect`).
  * **AI Agent Copilot:** Mediates all interactions and executes typed actions (`🤖 AI Agent`).
  * **Knowledge Base (Center):** Semantic core engine with living document orbit (`KNOWLEDGE BASE`).
  * **MCP Protocol Bridge (Internal):** Deterministic tool server (`innfo-mcp`).
* **Typography:** *Plus Jakarta Sans* for UI elements and *JetBrains Mono* for `# NN` code tokens and syntax.

---

## Scene 1: Add Information to Knowledge Base — User Ingestion Paths
* **Core Principle:** *AI-Assisted Dual Ingestion: Conversational stream vs. Local folder batch access.*
* **Objective:** Introduce the User profile and establish that in both options, ingestion occurs through an AI Agent copilot.
* **Composition:**
  1. **Left (User Profile Card):**
     * Avatar labeled `👤 User: Domain Architect`.
     * Card describes the user's objective: enriching the Knowledge Base.
  2. **Center (AI Agent Ingestion Gateway with 2 Options):**
     * Header badge: *Interaction Gateway: AI Agent mediates both ingestion options*.
     * **Option 1 (Direct Conversation):** The user chats directly with the AI Agent: *"Add this stakeholder update and roadmap notes to the KB..."* (conversational stream).
     * **Option 2 (Add Folder — Selected Path):** The user tells the AI Agent: *"Add this folder to the Knowledge Base"*.
     * An interactive cursor highlights and clicks on Option 2.
     * The card displays `sources/original/` and triggers `✓ Access granted → Connecting to folder`, establishing the direct bridge to Scene 2.

---

## Scene 2: Windows Folder, Document Zoom & Deliberate Semantic Scanning
* **Core Principle:** *Concepts > Code: Transforming unstructured prose into typed invariants.*
* **Composition (3 Synchronized Columns):**
  1. **Left (Windows Explorer Folder `sources/original/`):**
     * Shows source files unlocked in Scene 1: `project_brief.txt`, `kickoff_meeting.wav`, `whiteboard_schema.png`, and `raw_metrics.csv`.
     * `project_brief.txt` is highlighted in blue as the active focus.
  2. **Center (Magnified `project_brief.txt` View):**
     * **Initial State:** 100% monochrome black narrative prose (no boxes, no colors).
     * **Deliberate Laser Sweep:** A cyan laser beam descends slowly down the text lines.
     * As the scanner sweeps across target sections, they illuminate and convert into colorized pills in real time:
       * *"Stakeholders"* $\rightarrow$ Highlights blue (`# NN Stakeholders`).
       * *"Acme Corp"* $\rightarrow$ Highlights purple (`## NN Stakeholders: Acme Corp`).
       * *"deadline: 2026-Q3"* $\rightarrow$ Highlights amber (`deadline:: 2026-Q3`).
       * *"High Priority"* $\rightarrow$ Highlights emerald green (`evaluation:: High Priority`).
  3. **Right (Extracted iNNfo Primitives Shelf):**
     * The 4 primitives detach and land sequentially on the right shelf labeled **"EXTRACTED iNNfo PRIMITIVES"**.

---

## Scene 3: Level 2 Template Selection & Instantiation Click
* **Core Principle:** *Rich Specs, Lean Models: Level 3 models inherit from Level 2 specifications.*
* **Composition:**
  * Central carousel of canonical Level 2 templates: `Business_V_0-2-0_NN`, `Procedures_V_0-2-0_NN`, `Organization_V_0-2-0_NN`.
  * An interactive hand cursor clicks on `Business_V_0-2-0_NN`.
  * A purple energy pulse instantiates the concrete Level 3 model: `Acme_V_1-0-0_business_NN.md`.
  * The primitives extracted in Scene 2 snap magnetically into their designated schema slots (`parent: Business_V_0-2-0_NN`).

---

## Scene 4: Deterministic MCP Validation (`innfo-mcp`)
* **Core Principle:** *Fail-Fast: Strict invariant verification without silent fallbacks.*
* **Composition:**
  * Floating `innfo-mcp: validator & resolver` module connects directly to the instantiated model.
  * Deterministic check rules run:
    * Unified `# NN` syntax $\rightarrow$ **PASS**
    * Parent specification resolution $\rightarrow$ **PASS**
    * Typed fields (`types.ts`) $\rightarrow$ **PASS**
    * Metamodel invariants $\rightarrow$ **PASS**
  * Green confirmation badge displays: **MODEL VALIDATED (0 ERRORS)**.

---

## Scene 5: Human Intent Directed through AI Agent
* **Core Principle:** *AI Pair-Programming: Humans lead intent; AI executes via deterministic tools.*
* **Composition:**
  * Human on the left prompts in natural language: *"What are the critical deliverables for Acme Corp in Q3?"*.
  * The prompt streams to the AI Agent on the right.
  * The AI Agent translates the prompt into an exact typed MCP tool call:
    `innfo-mcp.query({ concept: "Stakeholders", element: "Acme Corp", field: "deadline" })`.

---

## Scene 6: Knowledge Base Query & Semantic Subgraph Filtering
* **Core Principle:** *Zero Hallucination: Responses grounded strictly on isolated evidence subgraphs.*
* **Composition:**
  * The query beam reaches the central Knowledge Base graph.
  * **Semantic Filtering:** Relevant nodes and edges (Acme Corp, Q3 Milestone, QA Audit Deliverables) glow vividly.
  * Unrelated nodes dim to translucent gray (`#cbd5e1`), visually demonstrating that answers are derived purely from grounded evidence.
  * Verified data stream flows back to the AI Agent with 100% provenance.

---

## Scene 7: Artifact Request, Synthesis & Living Orbit Integration
* **Core Principle:** *Living Document Orbit: Continuous closed-loop semantic feedback cycle.*
* **Composition:**
  * The AI Agent emits an action command: `generate_artifact(procedures)`.
  * The Knowledge Base synthesizes `Acme_Audit_V_1-0-0_procedures_NN.md` bearing the distinctive AI badge (`🤖`).
  * The newly synthesized artifact launches into the outer circular ring, rotating harmoniously alongside the original human files in the living workspace orbit.
