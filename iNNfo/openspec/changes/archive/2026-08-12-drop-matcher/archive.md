# Drop Custom Skill Matcher — Archive

## Status
✅ Completed

## Summary
Se eliminó el sistema custom de skill dispatch:
- `agents/triggers.yaml` (353 líneas) — borrado
- `scripts/skill-matcher.mjs` (225 líneas) — borrado
- `AGENTS.md` Pre-Flight Protocol (34 líneas) — reemplazado por sección OpenCode-native (13 líneas)

## Delta
- **3 archivos tocados**: 2 eliminados, 1 modificado
- **+13 líneas** (nueva sección AGENTS.md)
- **−612 líneas** (triggers.yaml + skill-matcher.mjs + texto viejo de AGENTS.md)
- **Neto: −599 líneas**

## Lo que no cambió
- Skills en `.agents/skills/` — intactos
- Skills globales en `~/.config/opencode/skills/` — intactos
- OpenCode config (`opencode.json`) — sin cambios
- Resto de documentación y código — sin cambios

## Verificación
- Cero referencias residuales a `triggers.yaml`, `skill-matcher.mjs`, o `Pre-Flight Protocol` fuera de los artefactos SDD
- OpenCode sigue viendo los skills via `available_skills` + tool `skill`
