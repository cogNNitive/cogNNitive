# Technical Design: Canonical Workspace Layout (kNNowledge/)

## 1. Architecture Decisions

| Decision | Chosen Approach | Rationale |
|---|---|---|
| **Directory Name** | `kNNowledge/` universally | Aligns with Ubiquitous Language Level 3 definition in `AGENTS.md`. |
| **Lineage Record L1 Spec** | `iNNfo_V_0-3-0` | Spec already exists in the repo and is the active canonical specification. |
| **Root Document** | Emit `domaiNN_NN.md` at bootstrap | Guarantees that newly created workspaces are fully canonical and recognized as current. |
| **MCP Fallbacks** | Delete unreachable `models` fallbacks | Eliminates dead code behind `checkDomainLegacy` and prevents hidden layout drift. |
| **Preflight Integration** | Incorporate `legacy-detect` into `preflight-check.js` | Emits structured layout verdicts programmatically. |

## 2. Implementation Flow
1. **Bootstrap (`bootstrap.js`, `provenance-knowledge.js`)**:
   - Create `kNNowledge/` instead of `models/`.
   - Scaffold `domaiNN_NN.md`.
   - Set lineage parent to `iNNfo_V_0-3-0_NN.md`.
2. **`nn-trannsform` Scripts**:
   - Change hardcoded `'models'` to `'kNNowledge'` in `impact-checker.js`, `lineage-check.js`, `provenance-knowledge.js`, `duplicate-guards.js`, and `index.js`.
3. **`innfo-mcp` Tools**:
   - Clean up fallback paths in `list-read.ts`, `spec.ts`, `validate.ts`, `init-knowledge.ts`, `apply-change.ts`.
4. **Preflight**:
   - Update `preflight-check.js` to run layout detection.
