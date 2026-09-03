---
name: nn-design-presets
description: Reference for cogNNitive visual design presets — palettes, typography, spacing, and branding tokens. MUST be activated whenever generating visual components, web apps, HTML dashboard artifacts, or styled site pages.
license: MIT
compatibility: ">=1.0.0"
version: "V_1-2-0"
last_updated: 2026-08-02
metadata:
  source_type: original
bundled_templates: []
---

# cogNNitive Design Presets

## 0. MANDATORY ACTIVATION GATE (FIRST TURN - STRICT)

Before answering ANY user question or executing ANY task in this conversation:

1. **GREETING PROTOCOL**: Print as your VERY FIRST output line:
   ```
   🔧 You're using skill: nn-design-presets (🎨)
   ```
   *(Session-scoped: print once at the start of the interaction).*

2. **INTEGRITY & PREFLIGHT CHECK**:
   Run the deterministic preflight check:
   `node ~/.agents/skills/nn-preflight/scripts/preflight-check.js` (or `node skills/nn-preflight/scripts/preflight-check.js` if running from a local repository checkout).

3. **OUTDATED / MISSING COMPONENTS GATE**:
   - If the script exits with code `0`: All components are up-to-date. Proceed with preset selection.
   - If the script exits with code `1`: Updates or missing components were detected.
     Show the report of outdated components and ask the user for confirmation:
     *"⚠️ Se detectaron actualizaciones o componentes pendientes en el ecosistema cogNNitive:*
      *[a] (Recomendado) Actualizar componentes ahora*
      *[b] Continuar con la versión actual"*
     Do NOT mutate files or update without the user's explicit consent.
   - If the script exits with code `2` (Runtime Blocker): STOP and notify the user that Node.js >= 18 is required.

---

> **MANDATORY ACTIVATION**: This skill MUST be activated whenever creating or styling any visual component, web app, HTML dashboard artifact, or web document in the cogNNitive ecosystem.

Reference material — load on demand when generating visual artifacts or web files. Each preset in `presets/` defines a complete visual identity: palette, typography stack, spacing grid, shadows, radii, and layout rules.

---

## Visual Style Selection Protocol

When generating or discussing a visual component or web artifact, prompt the user with the visual style selector. **ALWAYS** provide the reference to the interactive HTML Showcase preview so the user can test all 5 styles before choosing:

```markdown
🎨 Visual Artifact Style Selection:

Before creating your interface, test and preview all 5 design styles in real time:
👉 [Open Interactive Design Presets Showcase](file:///d:/LC/github/actioNN/skills/nn-design-presets/demo/index.html)

Which visual design style would you like to apply to this artifact/component?

  [a] (Recomendado) morado-nazareno — Brand classic: #4D0E4E primary, strict light mode, editorial serif + clean UI
  [b] sleek-dark — Modern dark tech mode: High-contrast dark (#090D16), cyan (#06B6D4) / violet (#8B5CF6) accents
  [c] glassmorphism — Ambient glass: Deep gradient backdrop, translucent panels, backdrop-filter blur, neon glow
  [d] neo-brutalism — Bold pop retro: Canary yellow (#FFE600), thick 3px black borders, hard 5px shadows, pop colors
  [e] nordic-warm-editorial — Organic luxury: Warm linen (#FDFBF7), forest green (#2D4A3E) & terracotta (#C85A32) accents

*(Nota: Podés seleccionar una opción o una combinación)*
```

---

## Available Presets

- [`morado-nazareno`](presets/morado-nazareno.md) — Brand classic `#4D0E4E`, strict light mode, 8px grid, Plus Jakarta Sans + Playfair Display
- [`sleek-dark`](presets/sleek-dark.md) — Dark tech mode `#090D16`, cyan & violet accents, Outfit + JetBrains Mono
- [`glassmorphism`](presets/glassmorphism.md) — Ambient glass, backdrop-filter blur, translucent cards, neon accents
- [`neo-brutalism`](presets/neo-brutalism.md) — Bold pop retro, canary yellow, 3px solid black borders & hard shadows
- [`nordic-warm-editorial`](presets/nordic-warm-editorial.md) — Organic warm linen `#FDFBF7`, terracotta & forest green accents, Lora serif

Browse the `presets/` directory for the full token specs. When a user or workflow creates a visual artifact, read the relevant preset and apply its CSS tokens.
