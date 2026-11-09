# number-field-changeset

Issue: #558 · Lane: light · Pilot of the ODD flow

## Objective

A changeset can create and fill a `type:: number` field.

## Problem

`update_field` receives `to::` as a string (the changes blueprint declares `to` as type
string). `coerceFieldValue` inferred the value type from the field's **existing** value, so
a fresh field kept the string and `validateFieldValue` rejected a change that is valid by
contract: `Invalid numeric value "5" for "peso"`
(`iNNfo/packages/nn-core/src/schema/field-values.ts:80`).

## Scope

- In: `iNNfo/packages/nn-core/src/mutate.ts` (coercion + validation order) and its spec.
- Out: `add_element` inline fields (the contract rejects them), list/select coercion.

## Acceptance

- `update_field` on an unset `type:: number` field with value `"5"` succeeds and stores the
  number `5`.
- A non-numeric string still fails with `Invalid numeric value`.
- `mutate.spec.ts` passes.

## Progress

- [x] Explore: locate the defect and the validation order
- [x] Implement: coerce by the declared type before validating
- [x] Test: three cases in `mutate.spec.ts`

## Evidence

- `vitest src/mutate.spec.ts` → 21/21 pass
- `tsc --noEmit` → exit 0
- Full `nn-core` suite: 5 failures, all reproduced on the base checkout (pre-existing)
