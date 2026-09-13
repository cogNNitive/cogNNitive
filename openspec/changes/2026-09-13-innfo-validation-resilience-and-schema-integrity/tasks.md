# Tasks: iNNfo Validation Resilience and Schema Integrity

## Review Workload Forecast
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

---

## 1. Ingestion & UTF-8 BOM Sanitization (`innfo-core` & `innfo-mcp`)
- [ ] 1.1 Add unit tests for UTF-8 BOM (`\uFEFF` / `0xFEFF`) stripping in `packages/innfo-core` and `packages/innfo-mcp`.
- [ ] 1.2 Implement BOM auto-stripping in `iNNfo/packages/innfo-core/src/parser/markdown.ts` (`normalizeSource`, `stripFrontmatter`).
- [ ] 1.3 Implement BOM auto-stripping in `iNNfo/packages/innfo-core/src/parser/yaml.ts` (`parseYaml`, `parseFrontmatter`).
- [ ] 1.4 Ensure `innfo-mcp` tools (`loadModel`, `read_model`, `validate_model`) transparently handle `\uFEFF` and emit clean UTF-8.

## 2. Local Canonical Template Registry & Offline Fallback (`innfo-core` & `innfo-mcp`)
- [ ] 2.1 Create `iNNfo/packages/innfo-core/src/schema/canonical-registry.ts` defining standard bundled Level 2 templates and alias mapping table (`business`, `procedures`, `organization`, `metrics`, `workspace`, `cogNNitive`).
- [ ] 2.2 Add unit tests for canonical registry fallback, alias resolution, and offline schema lookups.
- [ ] 2.3 Integrate canonical registry as Tier 4 fallback in `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts` and `spec.ts` when local/remote lookups fail.
- [ ] 2.4 Verify offline validation resilience when network requests timeout or fail DNS resolution.

## 3. Parent Resolution Hard-Gate & Error Suppression (`innfo-mcp`)
- [ ] 3.1 Write tests verifying that an unresolvable `parent_spec` emits `PARENT_RESOLUTION_FAILED` and short-circuits validation without cascading child errors.
- [ ] 3.2 Restructure validation pipeline in `iNNfo/packages/innfo-mcp/src/tools/validate.ts` into explicit 4-phase execution lifecycle.
- [ ] 3.3 Implement Phase 2 hard-gate in `validate.ts`, emitting diagnostic with searched paths and candidate fixes, suppressing Phase 3 and Phase 4 checks on failure.

## 4. Concept Drift Detection & Semantic Diagnostic Heuristics (`innfo-mcp`)
- [ ] 4.1 Write unit tests for concept drift heuristics (Levenshtein typo detection, cross-template matching, specialization hints).
- [ ] 4.2 Implement Phase 3 concept drift analyzer in `iNNfo/packages/innfo-mcp/src/tools/validate.ts` emitting non-fatal `CONCEPT_DRIFT_WARNING` diagnostics.
- [ ] 4.3 Exempt reserved structural headings (`# NN index`, `# NN matrices:`, `## NN External Watch Roots:`, `## NN Agent Modification:`) from drift warnings.

## 5. Agent Step 0 Integrity Gate & Mechanical Upgrade Guidance (`actioNN/skills/nn-innfo`)
- [ ] 5.1 Update `actioNN/skills/nn-innfo/SKILL.md` to introduce the Step 0 Schema Integrity Gate (halting child remediation when parent schema is unresolvable).
- [ ] 5.2 Add mechanical linting and upgrade playbook to `SKILL.md` (BOM stripping, obsolete `# NN index` removal from Level 3 models, heading/slug collision detection, V_0-2-0 frontmatter standardization).

## 6. End-to-End Integration & Verification
- [ ] 6.1 Run full unit and integration test suites across `innfo-core` and `innfo-mcp`.
- [ ] 6.2 Validate test models and templates using `check:specs` and MCP validation tools.
