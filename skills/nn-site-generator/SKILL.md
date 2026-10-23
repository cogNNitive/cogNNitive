---
name: nn-site-generator
description: Create or edit websites, add analytics, or add contact forms. Invoke with /nn-site-generator.
disable-model-invocation: true
license: MIT
compatibility: ">=1.0.0"
version: "V_0-2-0"
last_updated: 2026-09-03
metadata:
  source_type: original
bundled_blueprints: []
---

# nn Site Generator

<!-- docs-options: new-site=content/skills/nn-site-generator, edit-site=content/skills/nn-site-generator, analytics=content/skills/nn-site-generator, contact=content/skills/nn-site-generator, showcase=content/skills/nn-site-generator -->

## 0. Activation Gate
Execute the canonical activation gate defined in `nn-preflight` (session greeting + deterministic preflight integrity check).

---

When activated, present the 5 branches below using the `question` tool. For design tokens, reference the `nn-design-presets` skill and its `presets/` directory.

---

## Branches

### [a] New site — generate from scratch

Generate all files inside `docs/`:
- Landing + about page (HTML + Markdown twin)
- Favicon set, robots.txt, sitemap.xml
- AI-readiness: llms.txt, ai-index.yaml, .well-known/ai-catalog.json
- Attribution metadata on every page

Ask about optional extras:
- Docsify documentation site at `docs/documentation/`
- Separate app at `docs/app/`
- Interactive pipeline showcase (`components/interactive-showcase.md`)

Then apply the selected design preset and requested components. End with deployment checklist.

### [b] Edit site — modify pages, nav, or styling

Examine `docs/` first. Offer two paths:
- **Direct conversation** — describe the change
- **Markdown twin as source of truth** — edit `.md` files, then say "sync from twins"

### [c] Add analytics — integrate Umami

Load `components/analytics.md` and follow its instructions. Ask for the Umami script tag, extract website ID, create injector.

### [d] Add contact — Google Form embed or external URL

Load `components/contact.md` and follow its instructions. Ask which approach, then implement.

### [e] Add interactive showcase — Quadratic-style animated pipeline & before/after comparison

Load `components/interactive-showcase.md` and follow its instructions. Embed the 3-stage animated pipeline in the hero and/or the comparative paradigm section at the closing of the page.

---

## Post-generation

After any change, ask if the user wants a local preview:
```powershell
npx serve docs -p 8080
```

<!-- generated:shared-rules (source: scripts/skill-shared-rules.md; run node scripts/build-skill-shared-rules.mjs) -->
### Shared Rules (generated — do not edit)

**Menu Documentation Links (MANDATORY)**

Every decision menu or option set you present MUST carry, for each option that
declares one, a deep link to the documentation page that explains it, so the
user can read the option in depth (walkthroughs, examples, and videos live
there).

- The per-skill option→page map is declared in a `docs-options` HTML comment
  whose body is `<id>=<route>, <id>, ...`. A bare `<id>` means the option has no
  documentation page yet.
- Render each declared link as
  `https://cognnitive.com/documentation/#/<route>`, optionally with a short
  `(docs)` label appended to the option line. Options with no declared route are
  shown without a link.
- When you add, rename, or remove a menu option, update its `docs-options`
  marker in the same change. Run `npm run audit:skill-docs` to review coverage.
<!-- /generated:shared-rules -->
