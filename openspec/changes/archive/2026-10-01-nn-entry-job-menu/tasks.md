# Tasks: Job-Based /nn Entry Menu & Wizard Consolidation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450 lines |
| 400-line budget risk | High |
| Delivery strategy | chained (D1 -> D2 -> D3) |

---

## Phase 1: D1 — Entry Job Menu & Front Controller
- [x] 1.1 **Create `skills/nn/SKILL.md`**: Canonical entry point implementing the job loop menu (`[s]`, `[m]`, `[r]`, `[p]`, `[h]`, `[x]`) and dynamic `(Recommended)`. `[nn-entry-job-menu:Requirement:Job-Based Navigation Menu]`
- [x] 1.2 **Update `skills/nn-start/SKILL.md`**: Turn into forwarder/alias to `nn`. `[nn-entry-job-menu:Requirement:Canonical Entry Distribution & Alias Preservation]`
- [x] 1.3 **Update `manifest/source.yaml`**: Register `nn` skill for distribution.

## Phase 2: D2 — Unified Procedures
- [x] 2.1 **Implement Multi-Scope Discovery**: Collect procedures across `model`, `blueprint`, and `domain` scopes with precedence `model > blueprint > domain`. `[unified-procedure-catalog:Requirement:Multi-Scope Procedure Discovery & Precedence]`
- [x] 2.2 **Update `nn-innfo` & `nn-trannsform`**: Wire unified procedure execution contract.

## Phase 3: D3 — Wizard Consolidation & Language
- [x] 3.1 **Consolidate Wizard in `nn-innfo`**: Infer bluepriNNt, merge plan gates A3 and B1, eliminate duplicate prompts. `[session-language-policy:Requirement:Session Language Coherence]`
- [x] 3.2 **Apply Canonical Vocabulary**: Replace "app", "Level 2/3", and "template" (schema sense) with `bluepriNNt`, `kNNowledge`, and `domaiNN`. `[session-language-policy:Requirement:Canonical Level 2/3 Terminology Enforcement]`

## Phase 4: Verification & Integrity
- [x] 4.1 Test full entry flow on sample workspace.
- [x] 4.2 Run `npm run check:integrity` and `node scripts/verify.js`.
