# Slice 2a — the five product decisions

Slice 2a writes the V_0-15-0 text of `iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md`. The 20 delta specs
already settle most of the contract; five points are still open because the deltas describe intent while
the Level-2 blueprint must name a Field, a Concept or a version axis. Each decision below states the fork,
what it looks like in a real episode, and a recommendation. Nothing is applied until the table at the end
is filled.

---

## D1. `style` on a `text` Layer: field, Preset, or free string?

**What it decides.** A `text` Layer has to say *which* visual component it renders (title, lower-third,
caption, watermark, quote). The four Layer **types** name behaviour; they must not name appearance. So
where does "lower-third" live?

**Option A — `style` is a Field on the `text` Layer (5 options), and the component is resolved by name.**

```markdown
### NN Layer: Host name
slug:: host-name
type:: text
style:: lower-third
text:: Lucas Cervera
```

The look (colour, type, motion) comes from a Preset or a `components/lower-third.html` override.

**Option B — no Field; a Preset supplies `style`.**

```markdown
## NN Video: Episode
presets:: [Studio, Lower third]
```

A scene with no Preset cannot say what it is. The decision moves out of the Layer and into a bundle.

**Option C — `style` is a free string naming a component file** (`style:: house-lower-third`).

**Recommendation: A.** The type answers "what kind of thing is this" (text), `style` answers "which
component" (the decision a person makes per layer), and the Preset answers "how it looks" (the decision a
person makes once per series). A stays registry-checkable (`options::`), keeps `type` at four values, and
still lets a series restyle a lower-third without inventing a type, because the component lookup
(`components/<style>.html`, episode → series → domain → skill fallback) already exists.

**Cost if wrong.** If a series needs a text component outside the five names, V_0-15-x adds a `custom` value
plus a `component::` path. That is a minor bump, not a redesign.

---

## D2. `source:: narration`: a Field, or magic?

**What it decides.** Captions and outros read the scene body. Today the blueprint says captions "default
to the owning Scene's body prose when `text` is omitted, at the guard's discretion" — a silent fallback,
exactly the class of behaviour P2 (no field registry) exists to kill.

**Option A — explicit single-value Field on `text` Layers, exclusive with `text`.**

```markdown
### NN Layer: Captions
slug:: captions
type:: text
style:: caption
source:: narration
```

```markdown
### NN Layer: Watermark
slug:: watermark
type:: text
style:: watermark
text:: generado con IA
```

**Option B — implicit by style**: a `caption` with no `text` reads the narration. Fewer fields; the rule
lives in the engine, and a scene cannot opt out or be explicit.

**Option C — general `source:: <scene field>`**, mirroring `Variant.for`, so a title could render the scene
`title`. More power, more surface, more validation.

**Recommendation: A.** One reserved value (`narration`), stated by the document, validated by the registry,
and no inference by component name. C is a plausible V_0-15-x addition if a real need appears; it is not
needed by any of the three ported series.

**Cost if wrong.** B saves one field but reintroduces a silent rule; C would add a second reserved value
later without breaking documents written under A.

---

## D3. `validation.conditional_fields` per Layer type

**What it decides.** Which Fields a Layer must carry, per type. Current semantics (spec §Conditional
Fields) are an **OR group**, satisfied by the Layer's own Field or by the cascaded value:
`presenter → [asset, prompt, avatar]`, `background → [asset, prompt]`, `title → [text]`.

**Option A — keep the OR semantics, rename keys to the four types.**

```yaml
validation:
  conditional_fields:
    avatar: [asset, prompt]
    media: [asset, prompt]
    text: [text, source]
    animation: [asset]
```

`avatar_model` is not listed: it has a blueprint default, so it is never missing.
`text: [text, source]` means "one of `text` or `source`" — the same OR semantics the table already has.

**Option B — drop conditional fields**, and let the engine fail at compile. Loses the pre-spend guard.

**Option C — extend iNNfo L1 with `one_of` / `exactly_one`.** Rejected: the spec must not grow L1 primitives
for one blueprint.

**Recommendation: A**, plus one clarification line in the spec: the list is an OR group and a cascaded value
satisfies an entry. That preserves today's behaviour, retires the visual type names, and keeps the guard
in front of any spend.

**Cost if wrong.** If a type later needs two mandatory fields (not "one of"), the key grows a `required`
sibling; no document changes.

---

## D4. Where `Provider`, `Model` and `Voice` live

**What it decides.** The catalog is kNNowledge (D5). The question is whether its *schema* is part of the
`coNNtent` blueprint or a separate document.

**Option A — same `spec_NN.md`.** Three Concepts plus their Field Definitions; the package ships the
instance as `catalog/model-catalog_NN.md` (L3, `parent_spec: coNNtent_V_0-15-0`).

**Option B — a sibling blueprint**, e.g. `catalog/spec_NN.md`, composed with `includes`.

**Option C — L3 only**, no Concepts in L2. The shipped catalog would be unvalidated.

**Recommendation: A.** L2 is schema, L3 is data; the catalog instance is data. One `parent_spec` for an
episode, one version axis, one validation pass, and no `includes` machinery for a 3-Concept addition — the
same shape `Series` and `Video Defaults` already use. The domaiNN overlay (`model-catalog_NN.md`) is a
second L3 instance of the same schema, which is exactly how invoice prices are meant to be declared.

**Cost if wrong.** The spec grows by roughly 120 lines. If the catalog later needs its own release cadence,
splitting it is a `git mv` plus an `includes` entry, and the instances keep their `parent_spec`.

---

## D5. Version axis and the editor registry

**What it decides.** What `2a.2` actually bumps. The task says "bump `template_version` and register it in
the editor's `SHIPPED_TEMPLATE_VERSIONS`", but in this repository:

- `coNNtent` versions on `blueprint_version` (today `V_0-14-5`); `template_version` is used only by frozen
  blueprints such as `workspace`.
- `SHIPPED_TEMPLATE_VERSIONS` does not exist in this repo (only the change folder mentions it); the editor
  lives in `cogNNitive-web`.
- `manifest/source.yaml` has no `coNNtent` entry, so its `version:` axis does not apply here; the catalogs
  are the version surface.

**Option A — single axis.** `blueprint_version: "V_0-15-0"`; package defaults `parent_spec: coNNtent_V_0-15-0`;
both catalogs regenerated; episodes pin `V_0-15-0`. The editor registry is a recorded cross-repo follow-up.

**Option B — dual axis.** Add `template_version: V_0-15-0` beside `blueprint_version`. Two versions of the
same document drift on the first patch.

**Option C — hold 2a** until the editor registry is located.

**Recommendation: A**, with the editor item written into the 2a PR body and into Slice 10's docs task as an
explicit external dependency. In-repo gates are `check:spec-version`, catalog parity and template
immutability; none of them reads a template registry, so nothing breaks by choosing A.

**Cost if wrong.** If the editor really needs a registry maintained in this repo, we add it in Slice 10 with
the other docs work instead of blocking 2a and 2b–10 behind it.

---

## Decision table (resolved by the maintainer, 2026-11-02)

| # | Decision | Recommended | Chosen |
|---|---|---|---|
| D1 | `style` on `text` Layers | A: enum Field (5 options), component by name | **A** |
| D2 | `source:: narration` | A: explicit single-value Field | **A** |
| D3 | `conditional_fields` | A: OR groups keyed by the four types | **A** |
| D4 | Catalog Concepts location | A: same `spec_NN.md`, instance as L3 | **A** |
| D5 | Version axis | A: single `blueprint_version`, editor registry external | **A, with the version renamed `V_0-15-0`** |

Note on D5: the maintainer keeps the `0` major and bumps the minor digit, so the redesign ships as
**`V_0-15-0`** instead of a breaking `1.0` version. Every artifact in this change folder has been swept to
`V_0-15-0` (episode pins, `parent_spec` names, the `produce` refusal and the catalog entry).

