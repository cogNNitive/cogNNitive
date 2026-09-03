---
name: nn-site-generator
description: Create or edit websites, add analytics, or add contact forms. Invoke with /nn-site-generator.
disable-model-invocation: true
license: MIT
compatibility: ">=1.0.0"
version: "V_0-1-0"
last_updated: 2026-07-21
metadata:
  source_type: original
bundled_templates: []
---

# nn Site Generator

## 0. MANDATORY ACTIVATION GATE (FIRST TURN - STRICT)

Before answering ANY user question or executing ANY task in this conversation:

1. **GREETING PROTOCOL**: Print as your VERY FIRST output line:
   ```
   🔧 You're using skill: nn-site-generator (🌐)
   ```
   *(Session-scoped: print once at the start of the interaction).*

2. **INTEGRITY & PREFLIGHT CHECK**:
   Run the deterministic preflight check:
   `node ~/.agents/skills/nn-preflight/scripts/preflight-check.js` (or `node skills/nn-preflight/scripts/preflight-check.js` if running from a local repository checkout).

3. **OUTDATED / MISSING COMPONENTS GATE**:
   - If the script exits with code `0`: All components are up-to-date.
   - If the script exits with code `1`: Updates or missing components were detected.
     Show the report of outdated components and ask the user for confirmation:
     *"⚠️ Se detectaron actualizaciones o componentes pendientes en el ecosistema cogNNitive:*
      *[a] (Recomendado) Actualizar componentes ahora*
      *[b] Continuar con la versión actual"*
     Do NOT mutate files or update without the user's explicit consent.
   - If the script exits with code `2` (Runtime Blocker): STOP and notify the user that Node.js >= 18 is required.

---

When activated, present the 4 branches below using the `question` tool. For design tokens, reference the `nn-design-presets` skill and its `presets/` directory.

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

Then apply the selected design preset and requested components. End with deployment checklist.

### [b] Edit site — modify pages, nav, or styling

Examine `docs/` first. Offer two paths:
- **Direct conversation** — describe the change
- **Markdown twin as source of truth** — edit `.md` files, then say "sync from twins"

### [c] Add analytics — integrate Umami

Load `components/analytics.md` and follow its instructions. Ask for the Umami script tag, extract website ID, create injector.

### [d] Add contact — Google Form embed or external URL

Load `components/contact.md` and follow its instructions. Ask which approach, then implement.

---

## Post-generation

After any change, ask if the user wants a local preview:
```powershell
npx serve docs -p 8080
```
