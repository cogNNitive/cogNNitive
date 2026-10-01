# Tasks: Repair nn-* Skill Contract and Guard Drift

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250 lines |
| 400-line budget risk | Low |
| Delivery strategy | single-pr / direct batch |

---

## Phase 1: Contract Guard Test (RED)
- [x] 1.1 **Create `scripts/skill-mcp-contract.test.mjs`**: parse `server.ts`, scan `skills/**/*.md` for MCP tools and `node <script>` paths, and compare `nn-start` catalog with `manifest/source.yaml`. `[skill-contract-guard:Requirement:Skill MCP Contract Verification]`

## Phase 2: Skills & Documentation Alignment (GREEN)
- [x] 2.1 **Fix `skills/nn-innfo/SKILL.md`**: update §1 tool table (17 tools), renumber duplicate `## 15` and `## 0` sections, fix orphaned code block in §14, replace `list_template_*` with `list_blueprint_*`, align discard text to Zero Discard. `[template-dynamic-discovery:Requirement:Discovery Endpoint Tool Names]`
- [x] 2.2 **Fix `skills/nn-start/SKILL.md` & `nn-skills-lifecycle`**: remove phantom registry and `build-registry.js` references; align catalog to distributed skills. `[router-governance:Requirement:Catalog Source and Static Registry Deprecation]`
- [x] 2.3 **Fix `nn-trannsform/SKILL.md` & other docs**: align session discard references to Zero Discard; fix procedure discovery predicates. `[router-governance:Requirement:Zero Discard Session Alignment]`
- [x] 2.4 **Fix `manifest/body.md` & template-package-spec.md**: update tool citations.

## Phase 3: Verification & Integrity
- [x] 3.1 Run `node scripts/skill-mcp-contract.test.mjs` and ensure all assertions pass.
- [x] 3.2 Run `npm run check:integrity` and `node scripts/verify.js`.
