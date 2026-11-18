# merge-ui-skills — D5b: fold `nn-design-presets` into `nn-site-generator`

Branch: `session/merge-ui-skills` (create it from `origin/main`). Delivery: one PR.
Lane: **heavy** — the change alters skill frontmatter and triggers, so it needs a claim
and one delta spec, and merging it releases the `skills` key.

This is item **8** of the review's execution order
(`openspec/analysis/2026-11-17-arch-opinion-review/consolidated-plan-and-verdict.md`,
decision D5b). Items 6 (D3b `remove_model`) and 7 (D7 doc fixes) already landed in PR
#724; 9 (D4b) and 10 (D8) are still open.

## Why

The review adopted, narrowly: "merge `nn-site-generator` and `nn-design-presets` into
one UI skill — site generation already hands off to presets for tokens". Both skills
answer the same request ("build/edit a site" + "which palette"), and `nn-site-generator`
today only links out to the other skill for tokens.

## Facts already verified — do not re-derive

- **The distribution repo is not a second PR.** `scripts/release/run-release.js` publishes
  this repo's tree into `cogNNitive/cogNNitive-web` (`targetRepo`, copy + commit + push).
  Merging here is enough; the web repo follows the release.
- **`manifest/source.yaml` declares both skills**, each with `repo:
  cogNNitive/cogNNitive-web`, `path: skills/<name>`, `ref_key: skills`. Remove the
  `nn-design-presets` entry, keep `nn-site-generator`.
- **A guard forces the doc set to move together**: `checkSkillPageSet` in
  `scripts/lib/docs-facts.mjs` requires the canonical-skill Page ids in the iNNfo model
  to equal the skill names in `manifest/source.yaml`. Miss one page and the docs-facts
  test fails by name.
- `nn-site-generator/SKILL.md` frontmatter: `version: "V_0-2-0"`, `disable-model-invocation:
  true`, description "Create or edit websites, add analytics, or add contact forms."
- `nn-design-presets/SKILL.md` frontmatter: `version: "V_1-4-0"`, description is the
  must-activate one for visual work.
- Trees: `nn-site-generator/` = SKILL.md + `components/{ai-readiness,analytics,contact,
  deployment,interactive-showcase}.md`. `nn-design-presets/` = SKILL.md +
  `presets/{glassmorphism,morado-nazareno,neo-brutalism,nn-shad-cn,nordic-warm-editorial,
  sleek-dark}.md` + `demo/index.html`.

## Decision taken here (challenge it if you disagree, with a reason)

**Keep `nn-site-generator` as the surviving name.** Its description already covers
"create or edit websites", it is the entry point the docs route from, and
`disable-model-invocation: true` is deliberate (it is invoked explicitly, not guessed).
Renaming it would be a second contract change for no gain inside one change.

Fold the other skill in as: `presets/` and `demo/` move under `nn-site-generator/`, and its
SKILL.md body becomes a section of `nn-site-generator/SKILL.md` (the "MUST be activated
whenever generating visual components" trigger survives as a sentence inside the surviving
description). Bump the surviving skill's `version` and `last_updated`.

## Files to touch

| File | Change |
|---|---|
| `skills/nn-site-generator/SKILL.md` | absorb the presets body; description carries the visual trigger; bump version |
| `skills/nn-site-generator/presets/*` | moved from `skills/nn-design-presets/presets/` |
| `skills/nn-site-generator/demo/index.html` | moved likewise |
| `skills/nn-design-presets/` | deleted whole |
| `manifest/source.yaml` | drop the `nn-design-presets` entry |
| `docs/documentation/content/skills/nn-design-presets.md` | deleted |
| `docs/documentation/content/skills/nn-site-generator.md` | its "Design presets" section now points at the local folder |
| `docs/documentation/content/skills/README.md` | inventory row removed |
| `docs/documentation/content/skills/interaction-flows.md` | the flow that names both skills collapses to one |
| `docs/documentation/ai-index.yaml` | drop the `nn-design-presets` page entry |
| `docs/documentation/documentation_NN.md` | the canonical-skills section entry |
| `docs/documentation/_sidebar.md` | nav link |
| `docs/documentation/master.md` | regenerate, never hand-edit |
| `skills/nn-innfo/SKILL.md` + `content/reference/mcp-tools.md` | only if the skills-catalog region lists it (regenerate via `scripts/generate-docs-facts.mjs`) |
| `openspec/changes/merge-ui-skills/specs/skill-catalog/spec.md` | the delta spec |

Search for the old name before finishing: `git grep -n "nn-design-presets"` must return
nothing outside `openspec/changes/archive/**` and the review analysis folder.

## Delta spec

Capability name: **`skill-catalog`** (new in flight; no active change touches it, no
collision with `safe-delete`-style capabilities). Requirements to state, one physical line
each, with at least one scenario:

1. The canonical skill set has ONE UI skill; its description carries the trigger that
   activates it for visual components.
2. The presets are part of that skill (a `presets/` folder inside it), so a request for a
   site and a request for tokens resolve to the same skill.
3. The docs page set and `manifest/source.yaml` name the same skills (the `checkSkillPageSet`
   invariant, stated as a requirement rather than an accident).
4. The released `skills` key ships the merged skill and no longer ships the removed one.

## Verification

```
node scripts/check-openspec-deltas.mjs          # delta spec shape
node scripts/generate-docs-facts.mjs            # then --check
node scripts/generate-docs-master.mjs           # then --check
node scripts/check-docs-links.mjs
node scripts/regen.js --check
node scripts/verify.js --fast
```

`verify:fast` is unreliable on a machine near its commit limit (observed: V8 fatals at
10–75 MB, different steps each run, all green when run alone). CI `verify` is the gate.

## Risks

- **Doc-set drift is the main one**, and `checkSkillPageSet` is the net. Run `regen` and
  the docs-facts check *before* the first push, not after.
- Skill versions: check whether `check:versions` / `version-agreement.js` polices the
  `version:` field of a skill against anything. If it does, follow it; if not, a bump with
  a short reason is enough.
- If only 3 files change, the merge is wrong: the guard should have demanded the doc set.

## Log

L1 (verbatim, 2026-11-18): "Sí y no sé si sería interesante compactar esta conversación o
hacer un handoff a una sesión nueva por si esta ya empieza a ser muy larga". Decision: do
not start a 12-file contract change in a long thread; hand off with this map instead.

L2: #724 landed items 6 and 7 (remove_model + the D7 doc fixes) and released
`nn-mcp 0.39.0` / `nn-console 0.39.0`. #726 archived the landed changes. #728 fixed
`auto-tag` (atomic tag push, issue #725).
