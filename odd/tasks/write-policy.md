# write-policy

Objective: a concept declares which kinds of write its instances accept, cascading bluepriNNt -> concept -> domaiNN, so operational data can skip changeset ceremony without losing traceability.
Branch: `session/write-policy` · Lane: heavy (contract) · Delivery: one change per slice, contract first · Runner: vitest (`npx vitest run <file>` in `iNNfo/packages/nn-core`).

## Specs

- **S1** - `write_policy` is declared on a Concept Definition (`write_policy::`) and as a bluepriNNt frontmatter default; values `mutable` | `append-only` | `read-only`; nothing declared = `mutable`. User: "que el write policy se pueda declarar por blueprint o por concepto, incluso por dominio. A lo mejor es algo que puede funcionar en cascada".
- **S2** - Cascade: concept overrides bluepriNNt; domaiNN root and `scope: true` folders may only tighten (existing `restrict` strategy); `isolate` never loosens; unknown values fail closed to `read-only`.
- **S3** - Not a boolean: the policy is an enum, extensible along the agreed axes (mutability, ceremony, lifecycle, retention, writer). User: "que no sea booleano, me parece bien. Incluso a lo mejor el write policy podría ser más amplio."
- **S4** - Changing a regime goes through a changeset. User: "tiene bastante lógica que el cambio de régimen de un blueprint tenga que pasar por un changeset".
- **S5** - Only closed models are citable as evidence. User: "la regla podría ser que solo se citan modelos cerrados". Confirmed (L6): "closed" = has a closing event after which nothing is appended; the changeset that cites it is the consequence, not the definition. Never-closing logs rotate into segments that close.
- **S6** - Migrating the video ledger onto this mechanism is a later, separate, high-risk change (spend guard). User agreed.
- **S7** - Order: write_policy first, then Procedure Execution, then the procedure runner.

## Tasks

| ID | Specs | What | Route | Status | Evidence |
|---|---|---|---|---|---|
| T1 | S1 S2 S3 | nn-core: read/validate/resolve `write_policy`, classify changeset ops (`schema/writePolicy.ts`), delta spec | inline | done | 14/14 `tests/schema/write-policy.test.ts`; nn-core suite 2591 pass (3 load-flaky files pass alone) |
| T2 | S2 | Enforce in `apply_change` (per change, before `coreApplyMutation`), load the domaiNN chain, export from the package root | inline | done (PR #727, merged `92e0b64b`) | 7/7 `nn-mcp/test/apply-change-write-policy.test.ts`; 170/172 apply-related nn-mcp tests single-worker (2 e2e subprocess crashes under memory pressure pass alone); Risk item 2 |
| T2b | S2 | Whole-model ops (`add_model` distributed, `remove_model`, `move_model`, `extract_instance`) | inline | done | `def9e76b`; 12/12 write-policy tests, RED 3 without the change |
| T2c | S3 | `append-only` is write-once: filling an empty value counts as an add | inline | done | `565c3c4c`; 20/20 write-policy tests |
| T3 | S1 S4 | iNNfo V_0-8-0 metaschema declares `write_policy`; vocabulary + docs | inline | done | `871ac5a3`; 29/29 canonical-registry, vocabulary 67/67 |
| T4 | S3 | Direct write channel for `append-only` concepts (no changeset), with per-element actor/time | inline | pending | loosens a guard - Risk item 2 |
| T5 | S5 | Closure event `close_model` + `MODEL_CLOSED`; changes bluepriNNt V_0-11-0 | inline | done (closure) / blocked (citation rule, L9) | `c949aefd`; 16/16 then 20/20 write-policy tests |
| T6 | S7 | `Procedure Execution` concept (distributed, events `append-only`) | inline | needs decision (L10) | draft patch + e2e test kept outside the repo |
| T7 | S6 | Video ledger migration | - | later | |

## Log

- **L1** (2026-11-18, user, verbatim): "A lo mejor nos daría más granularidad y es mejor idea que el write policy se pueda declarar por blueprint o por concepto, incluso por dominio. A lo mejor es algo que puede funcionar en cascada, como algunos otros mecanismos de la aplicación / respecto al punto 2 me parece bien el planteamiento para migrar el video ledger / el punto 3: no entiendo el funcionamiento que existe ni las consecuencias que tiene / respecto a la ampliar right policy, me parecen bien los ejes que planteas / sí vamos con right policy. Avanza como consideres en este aspecto. Creo que está bien definido y podrás implementarlo de la forma más lógica posible"
- **L2** (2026-11-18, analysis): every Level-3 write already goes through a changeset (`nn-mcp/src/tools/apply-change.ts`, Level-3 ops are synthesized into changesets; the console only writes `changes/*_changes_NN.md`). So `mutable` is today's behavior, `append-only`/`read-only` only tighten, and any direct channel is a new allowance (T4).
- **L3** (decision): one property, three values, tighten-only at Level 3 by reusing `scope/resolve.ts` `restrict` (allowlist intersection) with `isolate` disabled for this key. The existing `read_only` frontmatter of imported snapshots (`mutate.ts`) is the precedent; folding it into `write_policy: read-only` is a candidate follow-up.
- **L4** (limitation): a Level-3 declaration applies to every concept in its scope; per-concept entries at Level 3 are not supported yet.
- **L5** (progress): T1 done (`35ad6808`). Next: T2. Engram mirror: pending (not written this session).
- **L7** (T2 findings): Level-3 values do not come from `domaiNN_NN.md` (the entrypoint is excluded from the scope chain); they come from `scope: true` documents, the root one included. Behavior change, deliberate: an unreadable or malformed document in the model's folder chain now rejects instance writes with `WRITE_POLICY_UNRESOLVED` (fail closed). Enforced: element-level ops reaching the per-change mutation (`add_element`, `update_field`, `set_fields`, `rename_element`, `update_element_text`, `remove_element`). Not yet enforced: model-level ops handled before that point (`add_model`, `remove_model`, `move_model`, `extract_instance`) - follow-up.
- **L6** (2026-11-18, user, verbatim): "si" - answering: "¿Confirmás que "cerrado" significa "tiene un evento de cierre", y no "tiene un changeset"?"
- **L8** (2026-11-18, user, verbatim): "Mergea y continúa con lo que falte para completar todo el trabajo". #727 merged (`92e0b64b`) after removing 33 test scratch files committed by mistake in `f5c4e802` (they failed the NN Name Invariant Guard).
- **L9** (T5 finding): a Level-3 model cannot be cited as evidence by `apply_change` today: the id form (`ops@entry-one`) resolves as a file path (`DANGLING_FILE`) and the path form (`kNNowledge/ops_NN.md@...`) is a removed form (`MALFORMED`). "Only closed models are citable" has nothing to gate until model citations resolve; the check was not added (no dead code). Closure itself is `close_model` -> `closed: true` + `MODEL_CLOSED`.
- **L10** (T6 finding): every model of the `procedures` bluepriNNt has role `catalog` or `procedure` (`nn-core/src/naming/contract.ts` `roleOf`), never `knowledge`: an execution instance would be loaded as a procedure definition and is not discovered by the domain index (`remove_model`/`move_model` -> `MODEL_NOT_FOUND`). Options: a separate `executions` bluepriNNt, or change `roleOf` (shared naming contract). Asked the user.
- **L11** (T2c decision): the engine rejects a change targeting an element added in the same changeset (`PRECONDITION_FAILED`), so "create and fill atomically" is impossible; `append-only` is defined as write-once instead.
