# Apply Progress: Template Pin ↔ Main Coherence Gate

**Mode**: Strict TDD (RED → GREEN → REFACTOR, per `openspec/config.yaml` `strict_tdd: true`).

## TDD Cycle Evidence

| Task | Test | RED | GREEN | REFACTOR |
|------|------|-----|-------|----------|
| 1.1 (case 16, identical) | `validate-manifest.test.js` | ✅ Written | ✅ Passed | ➖ None needed |
| 1.2 (case 17, main-ahead) | `validate-manifest.test.js` | ✅ Written | ✅ Passed | ➖ None needed |
| 1.3 (case 18, tag-ahead) | `validate-manifest.test.js` | ✅ Written | ✅ Passed | ➖ None needed |
| 1.4 (case 19, rate limit) | `validate-manifest.test.js` | ✅ Written | ✅ Passed | ➖ None needed |
| 1.5 (case 20, CRLF/BOM) | `validate-manifest.test.js` | ✅ Written | ✅ Passed | ➖ None needed |
| 1.6 (case 21, preview) | `validate-manifest.test.js` | ✅ Written | ✅ Passed | ➖ None needed |
| 1.7 (case 22, wiring) | `validate-manifest.test.js` | ✅ Written | ✅ Passed | ➖ None needed |
| 1.8 (RED run) | suite | ✅ Confirmed fail (rule missing) | — | — |
| 2.1–2.5 (rule + gate + export) | `validate-manifest.test.js` | ✅ (tests in place) | ✅ 25/25 | ✅ Clean (helper extracted) |
| 2.6 / 3.1–3.2 (re-export + verify) | both | ✅ (tests in place) | ✅ 25/25 + verify green | ➖ None needed |
| 4.1–4.4 (global verify) | both | — | ✅ All green | — |

**RED confirmation**: tests 16–22 failed before implementation with
`TypeError: mod.checkTemplateMainCoherence is not a function`.

## Summary

- 20/20 tasks complete; tests 25/25 (18 baseline + 7 new).
- Files changed: `scripts/manifest/lib/manifest-rules.js` (+67), `scripts/manifest/validate-manifest.js` (+2 re-export), `scripts/manifest/validate-manifest.test.js` (+213).
- Deviations from design: none — matches D1–D6.
- Issues: non-rate-limit fetch-failure branch (plain 404/500) not directly tested (SUGGESTION); the 403 branch is covered by case 19.
- Spec merge into `openspec/specs/monorepo-release-manifest/spec.md` deferred to sdd-archive.