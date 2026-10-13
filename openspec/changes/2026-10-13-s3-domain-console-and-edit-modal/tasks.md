# Tasks: S3 — domain console and edit modal

`strict_tdd: true`: each group leads with its test.

## 1. Parity audit (explore)

- [ ] 1.1 Enumerate every `innfo-editor` route/component and classify it
      (in-console / port / unused) with the evidence of a real usage.
- [ ] 1.2 Produce the audit table as the slice's gate artifact.

## 2. Port the used widgets

- [ ] 2.1 TEST: each ported widget renders offline and edits through the shared modal.
- [ ] 2.2 For each "port" row, add an `InnfoUI` component + wire it in the runtime.
- [ ] 2.3 Ensure no speculative ports: only rows with a real usage.

## 3. D14 remainder

- [ ] 3.1 TEST: the domain console embeds every model + history + source index.
- [ ] 3.2 Fix any missing embed; confirm heavy sources are linked, not embedded.
- [ ] 3.3 Confirm the size budget gate (`evaluateSizeBudget`).

## 4. D17 vocabulary

- [ ] 4.1 Record "console" in `vocabulary.json` + `docs/.../vocabulary.md`.

## 5. Verification

- [ ] 5.1 `npm run typecheck` + `node scripts/verify.js` + regenerate the bundle.
- [ ] 5.2 Re-export the TestLab domain console; eyeball the ported widgets.
