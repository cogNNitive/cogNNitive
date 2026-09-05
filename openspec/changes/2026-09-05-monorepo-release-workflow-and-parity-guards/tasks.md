# Tasks: Monorepo Release Workflow & Parity Guards

## 1. Local Parity & MCP Integrity Guard
- [x] 1.1 Implement `scripts/manifest/check-parity.js` to validate local skills, templates, and MCP bundle parity against `manifest/source.yaml`. <!-- id: 1.1 -->
- [x] 1.2 Add `scripts/manifest/check-parity.test.js` unit test suite to test success and failure paths. <!-- id: 1.2 -->
- [x] 1.3 Register `check-parity.js` into `scripts/verify.js` and add it to `ORCHESTRATORS` line count checks (< 200 lines). <!-- id: 1.3 -->

## 2. Remote Manifest Validation Hardening
- [x] 2.1 Enhance `validateMcp` in `scripts/manifest/lib/manifest-rules.js` to verify MCP bundle file existence at target commit. <!-- id: 2.1 -->
- [x] 2.2 Update `scripts/manifest/validate-manifest.test.js` to assert MCP path existence validation. <!-- id: 2.2 -->

## 3. Skill Modernization
- [x] 3.1 Rewrite `.agents/skills/nn-dev-release/SKILL.md` to target the unified `cogNNitive` monorepo. <!-- id: 3.1 -->

## 4. Verification, Testing & Monorepo Gate
- [x] 4.1 Run `npm test` across root and `scripts`. <!-- id: 4.1 -->
- [ ] 4.2 Run `node scripts/verify.js` to verify all guards pass. <!-- id: 4.2 -->
- [ ] 4.3 Verify `gentle-ai sdd-status` transitions to verify-ready. <!-- id: 4.3 -->