---
title: "nn-preflight — Environment Readiness Gate"
description: "Environment readiness gate for cogNNitive workflows. Runs Tier 1 checks and optional Tier 2 checks."
html_url: https://cognnitive.com/skills/documentation/#/skills/nn-preflight
generator: https://cognnitive.com/skills/nn-design-presets
---

# nn-preflight

**Skill**: `nn-preflight` · **Role**: Environment Readiness Gate

Environment readiness gate for cogNNitive workflows. Runs Tier 1 checks (Node.js >= 18, `nn-mcp` availability, domaiNN layout) and optional Tier 2 checks (iNNfo output domaiNN structure, semantic source validation), then reports blockers, warnings, and verified status.

---

## Canonical Activation Gate Protocol (MANDATORY)

Every cogNNitive skill delegates its activation gate to `nn-preflight`:

### 1. Session Greeting Banner Protocol
When activated, the agent MUST print as its very first output line:
```
🔧 You're using skill: <skill-name> (<emoji>)
```
*(Session-scoped: print once per conversation at the start of interaction).*

For `nn-preflight` itself:
```
🔧 You're using skill: nn-preflight (🛡️)
```

### 2. Deterministic Integrity Runner
Execute the deterministic preflight check:
```bash
node scripts/preflight-check.js
```

### 3. Exit Code Handling & Consent Gate
- **Exit code `0` (Success)**: All ecosystem components are installed and up-to-date. Proceed immediately with zero user interruption.
- **Exit code `1` (Warnings / Outdated Components)**: Updates or missing components were detected.
  **HALT immediately.** Display outdated components and prompt the user for confirmation:
  ```markdown
  ⚠️ Updates or missing components were detected in the cogNNitive ecosystem:
  [a] (Recommended) Update components now
  [b] Continue with current version
  ```
  **Consent is mandatory**: Do NOT mutate files or update without explicit user consent.
- **Exit code `2` (Runtime Blocker)**: Halt execution immediately. Inform the user that Node.js >= 18 is required.

---

## Tier Checks

### Tier 1 Checks (Always Run)
1. **Preflight & Integrity Runner**: Executes `node scripts/preflight-check.js`.
2. **Node.js**: Requires `>= 18`.
3. **`nn-mcp` Availability**: Calls `nn-mcp_list_knowledge` or verifies bundle at `~/.agents/mcp/nn-mcp.bundle.js`.
4. **DomaiNN Layout**: Verifies `sources/`, `kNNowledge/`, `procedures/`, `artifacts/`, and `domaiNN_NN.md`.

### Tier 2 Checks (iNNfo Output Workflows)
1. **kNNowledge Structure**: Verifies `kNNowledge/` holds valid `*_NN.md` kNNowledge documents and `domaiNN_NN.md` contains `# NN kNNowledge`.
2. **Semantic Link Validation**: Verifies that every source path cited in `sources:: [...]` physically resolves against the workspace-relative path, and that each raw file under `sources/import/` (and `sources/conversations/`) has a co-located, up-to-date sidecar.

### Tier 3 Checks (DomaiNN bluepriNNt Upgrades — Informational)
1. **bluepriNNt upgrade detection**: when `--workspace-dir` is provided and the domaiNN
   contains Level-3 kNNowledge documents, classifies each document's pinned bluepriNNt against the committed
   Level-2 bluepriNNt catalog (`iNNfo/specs/bluepriNNts/catalog.json`). Reports `current` /
   `upgrade-available` (with `major`/`minor`/`patch` gap) / `ahead` / `unlisted`. Available
   upgrades are informational and never flip the exit code. Offline catalog → non-blocking
   `offline` notice. Migration is handled by `nn-upgrade`.

---

## Core Rules
1. **Never fabricate a pass**: A check that was not executed is reported as a warning, never as OK.
2. **Consent first**: Never mutate the environment during a preflight check.
3. **Zero workspace pollution**: Temporary files or caches MUST be written to system temp and deleted immediately after use.
