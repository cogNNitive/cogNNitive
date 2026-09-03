# iNNfo Agent Instructions

## SDD Default Preferences

Estas preferencias se aplican a todos los cambios SDD en este proyecto a menos que se anulen explícitamente.

- **Pace**: `auto` (Automático — ejecutar fases seguidas, frenar solo en riesgo alto)
- **Artifact Store**: `openspec` (archivos en el repo, trazables en revisión)
- **PR Strategy**: `single-pr-default` (un solo PR, a menos que la estimación exceda el presupuesto)
- **Review Budget**: `800` líneas máximas antes de parar y preguntar
- **Ciclo completo (proposal→spec→design→tasks→verify-report)**: solo cuando hay ambigüedad de diseño real, no por tamaño o riesgo del cambio. Ver `openspec/config.yaml#sdd_gate` para el criterio exacto. `strict_tdd` sigue aplicando siempre — esta gate no afecta si se escriben tests, solo si se genera la ceremonia de artefactos.

## AI Agent Setup

For AI-assisted work with iNNfo models (create, edit, validate, transform), install the **actioNN suite**:

```bash
# Clone or junction actioNN into your OpenCode agents directory
git clone https://github.com/iNNfo/actioNN.git ~/.agents/skills/actioNN

# Ensure the MCP server bundle is available
cd ~/.agents/skills/actioNN
node scripts/update-mcp.js
```

See [USE_AI.md](USE_AI.md) for full details.

### Project Skills

Los skills definidos en `.agents/skills/` se cargan automáticamente según la descripción de cada uno. Si un skill no se carga cuando corresponde, invocá `/skill-name` o pedí "cargá el skill X" para cargarlo manualmente.

### Post-Mortem (si falló)

Si el usuario señala que un skill debería haberse cargado y no se cargó:
1. Aceptá el error sin excusas
2. Cargá el skill via la tool `skill` o pedile al usuario que lo invoque con `/skill-name`

## Ubiquitous Language & Domain Terminology

All agents, developers, and code artifacts in this project MUST strictly follow the canonical domain terms:

- **Workspace**: The local working directory containing one or more iNNfo models (aligned with OpenCode, VS Code, and AI Agents native workspace scope).
- **Model**: An iNNfo Level-3 data document (`<Name>_V_x-y-z_<Template>_NN.md`).
- **Template**: An iNNfo Level-2 schema document (`business`, `organization`, `procedures`).
- **Concept**: A type/class section defined by `# NN <Concept>`.
- **Element**: A concrete instance defined by `## NN <Concept>: <Element>`.
- **Block**: An iNNfo Markdown structural unit (`# NN` or `## NN`). A block represents either a Concept or an Element.
- **Pill / Sheet**: UI presentation components rendering a Block (Pill = compact summary view, Sheet = detailed editing panel).

### Strict Policy: No Silent Fallbacks or Aliases
- Never implement silent automatic fallbacks, hidden translations, or unannounced compatibility aliases unless explicitly requested by the user.
- System behaviors and terminology transitions MUST be explicit and transparent.

