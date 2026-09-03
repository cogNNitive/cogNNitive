# Drop Custom Skill Matcher — Proposal

## Intent

Eliminar el sistema custom de skill dispatch (triggers.yaml + skill-matcher.mjs + Pre-Flight Protocol) y delegar el descubrimiento y carga de skills al mecanismo nativo de OpenCode.

## Motivation

El matcher fue diseñado para ser un dispatch determinístico cross-runtime (OpenCode, Claude Code, Antigravity). En la práctica:

1. **Claude Code no puede ejecutar el matcher** — no lee AGENTS.md, no corre scripts pre-flight. El skill es invisible.
2. **Antigravity requeriría un port a Python** para ejecutar el mismo matcher. Costo de mantenimiento no justificado.
3. **OpenCode ya tiene dispatch nativo** via `available_skills` + tool `skill` + `description`. El matcher es una capa redundante que el modelo igual puede ignorar si no ejecuta el pre-flight.
4. **El ecosistema (addyosmani/agent-skills, softspark/ai-toolkit) no usa matchers custom** — skills `.md` estandarizados, cada runtime los carga con su mecanismo nativo.

## Scope

**Eliminar:**
- `agents/triggers.yaml` — registro de ~30 skills con triggers (353 líneas)
- `scripts/skill-matcher.mjs` — motor de matching (225 líneas)
- `AGENTS.md:12-45` — Pre-Flight Protocol completo

**Modificar:**
- `AGENTS.md` — reemplazar sección de Pre-Flight por instrucciones OpenCode-nativas

**Conservar:**
- Todos los skills en `.agents/skills/` — siguen funcionando via OpenCode nativo
- Skills en `~/.config/opencode/skills/` (SDD, etc.) — idem

## Riesgos

- **Perder dispatch determinístico**: ya no hay garantía de que "modelo" → nn-innfo. El modelo decide según `description`. Aceptable: los skills tienen descripciones claras, y el Post-Mortem cubre los fallos.
- **Scripts o docs que referencien el matcher**: el explore encontró que NO hay referencias externas a estos archivos (no aparecen en package.json, ningún script los llama, ningún doc los menciona fuera de AGENTS.md).
