# conntent-animation-unify — one animation model: templates + beats owned by the engine

Objective: make `template::` and `beats::` real, validated Layer fields of the coNNtent blueprint; have `produce` invoke the template builder and track freshness; move template code out of every episode into the domain library.
Branch: session/conntent-animation-unify (tracker). Delivery: chained slices, PR to main per slice. Test runner: `node --test`.
Status: closed 2026-11-22 into issue #612; S2/S3 delivered by package A of `odd/tasks/conntent-packages.md` (branch `session/conntent-layer-contract`), S4/S5 deferred to the backlog Idea.

## Specs

- S1 — Reconcile production with the repo: the QA overlay-presence fix (`overlayControlCropRegion`) existed only in the installed skill copy `~/.agents/skills/nn-conntent`; it must live in the repo with its test.
- S2 — The engine knows `template::` and `beats::` on an `animation` Layer: validated, not free-form JSON the engine ignores. A layer without `template::` keeps today's behavior (project is the source of truth).
- S3 — `produce` invokes the template builder declared by the template and records an input hash, so a changed beat or template makes the animation stale and it is rebuilt (never silently reused).
- S4 — The blueprint does not contain template code (PLAN D2 of animation_NN: "el blueprint no aprende a construir; solo transporta"). The engine defines the builder contract; templates live in the domain `library/`, promotable to the blueprint later by an explicit act.
- S5 — Episodes hold data only: `template::` + `beats::`. No `kit.js`, `harness.js`, `gsap.min.js` or `score.wav` copied per episode.
- S6 — The mounted composition id is derived by the engine per mount, never read from the authored project (closes the id-collision defect of issue #608).

Assumptions: A1 the domain `D:\Users\lucas\Documents\_NN\coNNtent_NN` is not a git repo, so the hash recorded in the model is its only history. A2 existing e01–e03 animations are not migrated by script (no backwards-compat premise); e03 is re-expressed by hand once the engine path works.

## Tasks

| ID | Specs | Route | Status | Evidence |
|---|---|---|---|---|
| T0 | S1 | inline | complete | 8035be81; `node --test test/qa.test.mjs test/qa-overlay-presence.test.mjs` 31/31 |
| T1 | S2 | delegated (package A) | closed | delivered as `inputs::` + `asset:: component:<name>` by `conntent-packages` T1 (the `template` name stays retired) |
| T2 | S3, S6 | delegated (package A) | closed | S3: inputs feed the per-scene review hash (`conntent-packages` T1); S6: handled by #618 |
| T3 | S4, S5 | — | deferred | backlog Idea "coNNtent animation unification" in `openspec/backlog_NN.md`, waits for a real episode |

Risk: T1 item 3 (changes the published coNNtent spec: Layer fields), so the slice is heavy lane with a delta spec.

## Log

- L1 (2026-11-13, user, verbatim): "Utiliza el agente orchestrator e implementemos este cambio. Haz un análisis y una revisión de tus conclusiones primero para asegurarnos de que vamos en la buena dirección, e implementalo luego." Then: "Quiero decir que utilices Gentle AI, Gentle Orquestrator."
- L2 (2026-11-13, user, verbatim): "Supongo que la mejor decisión es que esté en la biblioteca del dominio de momento y luego, ya si funciona y una vez esté probado, lo podríamos promover al blueprint. ¿Es correcto?" Confirmed.
- L3: earlier claim "~14 files differ between installed engine and repo" was wrong: it compared against a stale local `dev`. Against origin/main only `qa.mjs` (and the generated nn-core mirror) differ.
- L4: T0 done in 8035be81.
- L5 (2026-11-22): tracker closed into #612. S1 done in 8035be81. S6 handled by #618. S2 and S3 delivered by package A of `odd/tasks/conntent-packages.md`: an `animation` Layer takes validated `inputs::` (and `asset:: component:<name>` mounts a library component), and the inputs feed the per-scene review hash, so a changed input reopens only its scene; no separate builder hash. S4 and S5 are deferred as the backlog Idea "coNNtent animation unification" until a real episode justifies moving template code into the domain library.
