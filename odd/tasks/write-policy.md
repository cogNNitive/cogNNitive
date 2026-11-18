# write-policy

Objective: a concept declares which kinds of write its instances accept, cascading bluepriNNt -> concept -> domaiNN, so operational data can skip changeset ceremony without losing traceability.
Branch: `session/write-policy` · Lane: heavy (contract) · Delivery: one change per slice, contract first · Runner: vitest (`npx vitest run <file>` in `iNNfo/packages/nn-core`).

## Specs

- **S1** - `write_policy` is declared on a Concept Definition (`write_policy::`) and as a bluepriNNt frontmatter default; values `mutable` | `append-only` | `read-only`; nothing declared = `mutable`. User: "que el write policy se pueda declarar por blueprint o por concepto, incluso por dominio. A lo mejor es algo que puede funcionar en cascada".
- **S2** - Cascade: concept overrides bluepriNNt; domaiNN root and `scope: true` folders may only tighten (existing `restrict` strategy); `isolate` never loosens; unknown values fail closed to `read-only`.
- **S3** - Not a boolean: the policy is an enum, extensible along the agreed axes (mutability, ceremony, lifecycle, retention, writer). User: "que no sea booleano, me parece bien. Incluso a lo mejor el write policy podría ser más amplio."
- **S4** - Changing a regime goes through a changeset. User: "tiene bastante lógica que el cambio de régimen de un blueprint tenga que pasar por un changeset".
- **S5** - Only closed models are citable as evidence. User: "la regla podría ser que solo se citan modelos cerrados". Assumption (to confirm with the user): "closed" = has a closing event after which nothing is appended; the changeset that cites it is the consequence, not the definition.
- **S6** - Migrating the video ledger onto this mechanism is a later, separate, high-risk change (spend guard). User agreed.
- **S7** - Order: write_policy first, then Procedure Execution, then the procedure runner.

## Tasks

| ID | Specs | What | Route | Status | Evidence |
|---|---|---|---|---|---|
| T1 | S1 S2 S3 | nn-core: read/validate/resolve `write_policy`, classify changeset ops (`schema/writePolicy.ts`), delta spec | inline | done | 14/14 `tests/schema/write-policy.test.ts`; nn-core suite 2591 pass (3 load-flaky files pass alone) |
| T2 | S2 | Enforce in `apply_change` (per change, before `coreApplyMutation`), load the domaiNN chain, export from the package root | inline | pending | Risk item 2 (guard) |
| T3 | S1 S4 | iNNfo V_0-8-0 metaschema declares `write_policy`; domaiNN spec field; vocabulary + docs | inline | pending | published spec |
| T4 | S3 | Direct write channel for `append-only` concepts (no changeset), with per-element actor/time | inline | pending | loosens a guard - Risk item 2 |
| T5 | S5 | Closure event + "only closed models are citable" in evidence validation | inline | pending | |
| T6 | S7 | `Procedure Execution` concept in `procedures` (distributed, `append-only`) | inline | pending | |
| T7 | S6 | Video ledger migration | - | later | |

## Log

- **L1** (2026-11-18, user, verbatim): "A lo mejor nos daría más granularidad y es mejor idea que el write policy se pueda declarar por blueprint o por concepto, incluso por dominio. A lo mejor es algo que puede funcionar en cascada, como algunos otros mecanismos de la aplicación / respecto al punto 2 me parece bien el planteamiento para migrar el video ledger / el punto 3: no entiendo el funcionamiento que existe ni las consecuencias que tiene / respecto a la ampliar right policy, me parecen bien los ejes que planteas / sí vamos con right policy. Avanza como consideres en este aspecto. Creo que está bien definido y podrás implementarlo de la forma más lógica posible"
- **L2** (2026-11-18, analysis): every Level-3 write already goes through a changeset (`nn-mcp/src/tools/apply-change.ts`, Level-3 ops are synthesized into changesets; the console only writes `changes/*_changes_NN.md`). So `mutable` is today's behavior, `append-only`/`read-only` only tighten, and any direct channel is a new allowance (T4).
- **L3** (decision): one property, three values, tighten-only at Level 3 by reusing `scope/resolve.ts` `restrict` (allowlist intersection) with `isolate` disabled for this key. The existing `read_only` frontmatter of imported snapshots (`mutate.ts`) is the precedent; folding it into `write_policy: read-only` is a candidate follow-up.
- **L4** (limitation): a Level-3 declaration applies to every concept in its scope; per-concept entries at Level 3 are not supported yet.
- **L5** (progress): T1 done. Next: T2. Engram mirror: pending (not written this session).
