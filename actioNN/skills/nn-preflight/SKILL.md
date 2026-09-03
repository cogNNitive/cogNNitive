---
name: nn-preflight
description: Environment readiness gate for cogNNitive workflows. Runs Tier 1 checks (Node.js >= 18, innfo-mcp availability, workspace layout) and optional Tier 2 checks (iNNfo output workspace structure), then reports blockers/warnings/ok. Also provides the canonical skill-location reference used by nn-skills-lifecycle. Triggers: preflight, readiness, environment check, "run Tier 1".
version: "V_0-1-0"
last_updated: 2026-08-03
metadata:
  source_type: original
license: MIT
compatibility: opencode, claude-code, cursor, any agent supporting skills
bundled_templates: []
---

# nn-preflight

## Canonical Activation Gate Protocol (MANDATORY)

Every cogNNitive skill MUST execute this canonical activation gate before answering ANY user question or executing ANY task in the session.

### 1. Session Greeting Banner Protocol
When activated, the agent MUST print as its VERY FIRST output line:
```
🔧 You're using skill: <skill-name> (<emoji>)
```
*(Session-scoped: print once per conversation at the start of interaction).*

For `nn-preflight` itself, use:
```
🔧 You're using skill: nn-preflight (🛡️)
```

### 2. Deterministic Integrity Runner
Execute the deterministic preflight check:
```bash
node scripts/preflight-check.js
```
*(Fallback path: `node ~/.agents/skills/nn-preflight/scripts/preflight-check.js` or `node skills/nn-preflight/scripts/preflight-check.js`).*

### 3. Exit Code Handling & Consent Gate
Handle the runner process exit code deterministically:

- **Exit code `0` (Success)**: All ecosystem components are installed and up-to-date. Proceed immediately with the skill's intended workflow or menu without user interruption.
- **Exit code `1` (Warnings / Outdated Components)**: Updates or missing components were detected.
  **HALT immediately.** Display the report of outdated/missing components and prompt the user for confirmation:
  ```markdown
  ⚠️ Updates or missing components were detected in the cogNNitive ecosystem:
  [a] (Recommended) Update components now
  [b] Continue with current version
  ```
  **Consent is mandatory**: Do NOT mutate files or update without explicit user consent. If the user selects `[b]`, proceed with the current version.
- **Exit code `2` (Runtime Blocker)**: Halt and abort execution immediately. Inform the user that Node.js >= 18 is required.

---

## Consumer Skill Delegation

All consumer skills (`nn-router`, `nn-innfo`, `nn-trannsform`, `nn-site-generator`, `nn-skills-lifecycle`, `nn-design-presets`) MUST delegate their activation gate in §0 to this canonical protocol using exactly:

```markdown
## 0. Activation Gate
Execute the canonical activation gate defined in `nn-preflight` (session greeting + deterministic preflight integrity check).
```

Consumer skills MUST NOT duplicate script execution commands, file paths, or exit code conditional branching logic.

---

## Role

Environment readiness gate for cogNNitive workflows. Runs deterministic checks and reports blockers, warnings, and confirmations. Never fabricates a pass for a check that was not run.

---

## Tier 1 Checks (always run)

1. **Preflight & Integrity Runner**: run `node scripts/preflight-check.js` (or `node ~/.agents/skills/nn-preflight/scripts/preflight-check.js`). Verifies Node.js >= 18, manifest reachability, installed skills vs pinned commits, MCP bundle availability, and templates. If exit code is `1`, report outdated/missing components and prompt for confirmation per the Canonical Activation Gate protocol.
2. **Node.js**: require >= 18.
3. **innfo-mcp availability**: call `innfo-mcp_list_models`; if the MCP tool is unavailable, fall back to checking that the bundle exists at `~/.agents/mcp/innfo-mcp.bundle.js` or `.cogNNitive/mcp-bundle.js`.
4. **Workspace layout**: verify the expected directories exist — `sources/`, `models/`, `procedures/`, `artifacts/`, `index.md` (as appropriate for the workflow; `nn-trannsform` projects use `sources/original/` and `sources/nn/`).

## Tier 2 Checks (optional — only for iNNfo output workflows)

4. **iNNfo output workspace structure**: for Level 3 model workflows, verify `models/` holds `*_NN.md` files (note that `list_models` recursively scans both the workspace root and the `models/` subdirectory to find all models) and that `index.md` exists with `# NN index` as the entry point.
5. **Semantic link validation (sources)**: parse all Level 3 model files and verify that every file path listed in the `sources:: [...]` metadata array exists physically in the workspace. Report any missing or dangling sources as warnings.

---

## Report Format

Present exactly three sections, each a bullet list:

```markdown
## Blockers
- <blocker, if any>

## Warnings
- <warning, if any>

## OK
- <check that passed>
```

- A check that was not run MUST NOT be listed as OK.
- If a blocker exists, the invoking skill asks the user before continuing.

---

## Reference

`reference/skill-locations.md` — canonical locations of installed skills and MCP bundles, plus a manual-only PowerShell reference for Junction/Symlink detection and creation (not used by any automated flow). `nn-skills-lifecycle`'s automated install/update/sync comes from the bootstrap manifest instead — see its own SKILL.md. Consuming skills MUST NOT hardcode paths.

---

## Core Rules

1. **Never fabricate a pass**: a check that was not executed is reported as a warning, never as OK.
2. **Consent first**: never mutate the environment during a preflight; it only inspects and reports.
3. **Canonical reference**: path and link conventions live in `reference/skill-locations.md` — update them there, not in consuming skills.
4. **Windows Network Resilience**: Do NOT execute bare `curl` in PowerShell (which aliases to `Invoke-WebRequest` and fails SSL handshakes). Use `curl.exe` explicitly, Node.js native fetch (`node -e "fetch(...)"`), or git.
5. **Zero Workspace Pollution**: Temporary checkouts or network cache files MUST be written to system temp (`$env:TEMP` / `~/.agents/tmp/`) and deleted immediately after use. Never clone git repositories into the user's workspace root.

