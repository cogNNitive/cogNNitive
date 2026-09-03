# Proposal: traNNsform Workspace Integration

**Status:** Registered â€” design & implementation planned.

## Intent

Hacer de traNNsform un componente **nativo del workspace**, no un externo descargado *lazy* desde el AI Guide Panel. Esto significa:

1. **Descargar traNNsform al crear el workspace** (en SetupWizard), no al abrir el panel de AI Guide.
2. **Carpeta visible y singular**: `traNNsform/` (sin dot), con `input/` y `output/` (singular), eliminando `outputs/` (plural) y `.traNNsform/` (hidden).
3. **Botones Import / Export en el Header**, al lado de "Use AI".
4. **Flujo Import** (documentos â†’ iNNfo model): el agente detecta archivos en `traNNsform/input/`, los procesa y genera un modelo iNNfo nombrado segÃºn defiNNe.
5. **Flujo Export** (model â†’ HTML): el agente genera un visualizador HTML dentro de `traNNsform/output/`.
6. **Puntero de naming a defiNNe**: traNNsform/AGENT.md referencia la spec en lugar de duplicar la convenciÃ³n.

## Problemas resueltos

| # | Problema | Impacto |
|---|----------|---------|
| P1 | `ensureTemplates()` se ejecuta en `AIGuidePanel.vue` al *montar el panel* â€” lazy. Si el usuario nunca abre el panel, no hay templates. | El export falla silenciosamente o el agente no tiene instrucciones. |
| P2 | `.traNNsform/` (hidden) y `outputs/` (plural). El usuario no puede navegar archivos fÃ¡cilmente en su FS. | FricciÃ³n: el usuario tiene que mostrar archivos ocultos o recordar paths con dot. |
| P3 | No existe `input/` â€” no hay un lugar definido donde el usuario deje documentos fuente para importar. | El flujo Import no tiene un contrato claro. |
| P4 | No hay botones Import/Export en el Header. El usuario debe abrir el AI Guide Panel para exportar. | 2 clics extra vs 1 clic, descubribilidad baja. |
| P5 | No existe flujo Import (documentos â†’ iNNfo model). | Los documentos raw no tienen un camino definido hacia un modelo estructurado. |
| P6 | El naming de modelos generados estÃ¡ implÃ­cito en `AGENT.md` en vez de referenciar la spec canÃ³nica (defiNNe Â§File Naming Convention). | Riesgo de divergencia si defiNNe actualiza la convenciÃ³n. |
| P7 | `outputs/` en el repo traNNsform vs `output/` en el CLI (`~/.agents/skills/innv0-trannsform/scripts/index.js`). | Inconsistencia que confunde al agente y al usuario. |

## Scope

### In scope (este cambio)

| Ãrea | Tipo | DescripciÃ³n |
|------|------|-------------|
| `apps/innfo-editor/src/components/layout/SetupWizard.vue` | Modified | Mover `ensureTemplates()` aquÃ­ como parte de `initWorkspaceStructure()`; cambiar `.traNNsform/` â†’ `traNNsform/`; agregar `input/` y `output/` a la estructura. |
| `apps/innfo-editor/src/components/layout/Header.vue` | Modified | Agregar botones [Import] y [Export] al lado de "Use AI", cada uno abre su panel/secciÃ³n. |
| `apps/innfo-editor/src/components/editor/AIGuidePanel.vue` | Modified | Remover `ensureTemplates()` y su lÃ³gica de download; separar secciones Import y Export; mantener solo la guÃ­a textual. |
| `apps/innfo-editor/src/components/editor/ImportPanel.vue` | **NEW** | Panel/secciÃ³n para Import: instrucciones para el agente + prompt copiable + visualizaciÃ³n de estado de `input/`. |
| `apps/innfo-editor/src/components/editor/ExportPanel.vue` | **NEW** | Panel/secciÃ³n para Export: prompt copiable, selector de modelo, estado de `output/`. |
| `traNNsform/` folder structure | Modified | `outputs/` â†’ `output/`; agregar `input/` (vacÃ­o con `.gitkeep`); actualizar `AGENT.md` y `README.md`. |
| `traNNsform/AGENT.md` | Modified | Agregar secciÃ³n Import con referencia a defiNNe para naming; cambiar paths de `outputs/` â†’ `output/`; agregar notas sobre imports incrementales (PLOM). |
| `traNNsform/README.md` | Modified | Cambiar paths `outputs/` â†’ `output/`; agregar documentaciÃ³n del flujo Import. |

### Fuera de scope (no en este cambio)

- **ImplementaciÃ³n del CLI** (`~/.agents/skills/innv0-trannsform/scripts/index.js`): no se modifica â€” el CLI ya usa `output/` (singular), estÃ¡ correcto.
- **Imports incrementales** (PLOM â€” documentar pero no implementar): la lÃ³gica de "detectar que ya existe un modelo y hacer merge" queda para una futura iteraciÃ³n.
- **Backend de transformaciÃ³n**: el agente (Claude Code, OpenCode, etc.) ejecuta la transformaciÃ³n; este cambio solo toca la UI y los contratos (AGENT.md).

## Decisions

### D1. Download en SetupWizard, no en AIGuidePanel

La funciÃ³n `ensureTemplates()` actual:

```
AIGuidePanel.vue:onMounted() â†’ ensureTemplates()
  â†’ fetch traNNsform/{AGENT.md, templates/*, snippets/*} desde GitHub
  â†’ crear traNNsform/ en el workspace
```

Pasa a:

```
SetupWizard.vue:initWorkspaceStructure()
  â†’ crear traNNsform/ (visible, sin dot)
  â†’ crear traNNsform/templates/, snippets/, input/, output/
  â†’ fetch traNNsform/{AGENT.md, templates/*, snippets/*} desde GitHub
```

`AIGuidePanel.vue` solo **verifica existencia** (`getDirectoryHandle('traNNsform')`) y setea `templatesReady`. Si no existe, muestra el error con link al repo. El download ya no es responsabilidad del panel.

### D2. Carpeta visible, singular

| Actual | Nuevo | RazÃ³n |
|--------|-------|-------|
| `.traNNsform/` (hidden) | `traNNsform/` (visible) | El usuario necesita acceder a los archivos via FS sin mostrar ocultos |
| `outputs/` (plural) | `output/` (singular) | Consistencia con el CLI (`~/.agents/skills/innv0-trannsform/scripts/`) |
| *(no existÃ­a)* | `input/` | Lugar definido donde el usuario deja documentos raw |

Structure final:

```
traNNsform/
â”œâ”€â”€ AGENT.md
â”œâ”€â”€ README.md
â”œâ”€â”€ templates/
â”‚   â”œâ”€â”€ business.md
â”‚   â”œâ”€â”€ procedures.md
â”‚   â””â”€â”€ ...
â”œâ”€â”€ snippets/
â”‚   â””â”€â”€ chart-patterns.md
â”œâ”€â”€ input/          â† NEW: raw files for import
â””â”€â”€ output/         â† renamed from outputs/, generated exports
```

### D3. Botones Import / Export en Header

Dos nuevos botones en `Header.vue`, despuÃ©s de "Use AI":

```
[âœ¨ Use AI] [ðŸ“¥ Import] [ðŸ“¤ Export] [ðŸ’¾ Save â–¾]
```

- **Import**: abre `ImportPanel` (nuevo) o setea `uiStore.activeView('import')`.
- **Export**: abre `ExportPanel` (nuevo) o setea `uiStore.activeView('export')`.
- Ambos paneles pueden ser secciones dentro de `AIGuidePanel.vue` (reorganizado) O componentes separados. La decisiÃ³n se toma en design.

### D4. Import flow (agente)

El Import NO ejecuta lÃ³gica de transformaciÃ³n en la UI. La UI solo:

1. Detecta archivos en `traNNsform/input/` y muestra un listado.
2. Provee un prompt copiable para el agente.
3. El agente (guiado por `AGENT.md`) ejecuta: copiar a `raw/` â†’ normalizar a `md/` â†’ aplicar template â†’ generar modelo.

El prompt copiable serÃ­a algo como:

> Import documents from traNNsform/input/ following traNNsform/AGENT.md

### D5. Export flow (model â†’ HTML)

El Export actual se mantiene pero se mejora:

1. Selector de modelo (si hay mÃºltiples).
2. Prompt mÃ¡s especÃ­fico que incluye el nombre del modelo.
3. Output en `traNNsform/output/` (singular) con naming `<ModelBaseName>_V<version>_<templateName>_visualizer.html`.

### D6. Naming pointer a defiNNe

`traNNsform/AGENT.md` **no duplica** la convenciÃ³n de naming de modelos. En cambio, referencia la spec:

```
## Naming de modelos generados (Import)

Seguir la convenciÃ³n definida en defiNNe (File Naming Convention):

`<Model>_V_x-y-z_<Template>_NN.md`

â†’ https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/specs/latest/level0/defiNNe_NN.md
```

El naming de exports (HTML visualizer) **sÃ­** se define en traNNsform porque es especÃ­fico de sus outputs:

`<ModelBaseName>_V<version>_<templateName>_visualizer.html`

### D7. Incremental imports (PLOM â€” document only)

Se agrega una nota en `AGENT.md` sobre el caso futuro:

```
## Import incremental (FUTURO â€” no implementado)

Cuando ya existe un modelo y se agregan nuevos documentos a input/,
el agente deberÃ­a:
1. Leer el modelo existente
2. Cruzar los nuevos documentos contra conceptos/elementos existentes
3. Producir una versiÃ³n actualizada del modelo (bump de versiÃ³n)

Esto requiere lÃ³gica de merge que aÃºn no estÃ¡ definida.
```

## Affected Areas

| Area | Change | Description |
|------|--------|-------------|
| `apps/innfo-editor/src/components/layout/SetupWizard.vue` | ~15 lines | Agregar download de traNNsform en `initWorkspaceStructure()`; cambiar `.traNNsform/` â†’ `traNNsform/`; agregar `input/` y `output/`. |
| `apps/innfo-editor/src/components/layout/Header.vue` | ~20 lines | Agregar botones Import y Export. |
| `apps/innfo-editor/src/components/editor/AIGuidePanel.vue` | ~50 lines | Remover `ensureTemplates()`, `TRANSFORM_BASE_URL`, `downloadError`, download logic. Simplificar secciÃ³n Export. |
| `apps/innfo-editor/src/components/editor/ImportPanel.vue` | NEW ~80 lines | Panel de import con file detection + prompt copiable. |
| `apps/innfo-editor/src/components/editor/ExportPanel.vue` | NEW ~80 lines | Panel de export con selector de modelo + prompt copiable + output status. |
| `traNNsform/AGENT.md` | ~20 lines | Agregar Import flow, pointer a defiNNe, cambiar paths, notas PLOM. |
| `traNNsform/README.md` | ~10 lines | Cambiar paths `outputs/` â†’ `output/`, agregar Import flow doc. |
| `traNNsform/` directory | Structural | Renombrar `outputs/` â†’ `output/`; crear `input/` con `.gitkeep`. |

## Resolved Questions

1. **Â¿ImportPanel y ExportPanel como componentes separados o secciones dentro de AIGuidePanel?** â†’ Decidir en design phase. Tradeoff: separados = mÃ¡s claros, mÃ¡s imports; dentro del panel = menos componentes, pero el panel ya es grande.
2. **Â¿El download en SetupWizard es en el frontend o en el CLI?** â†’ Frontend (fetch desde GitHub igual que hoy). SetupWizard ya corre en el browser y tiene acceso a `fetch()`.
3. **Â¿QuÃ© pasa si el workspace se reabre y ya tiene `traNNsform/`?** â†’ SetupWizard solo crea si no existe (`getDirectoryHandle` sin `create` para check, con `create` solo si no existe). No sobreescribe.
4. **Â¿Import usa el mismo `TRANSFORM_BASE_URL` para descargar?** â†’ No. El Import no descarga nada. Solo muestra archivos en `input/` y da un prompt. La transformaciÃ³n la hace el agente externo.

## Success Criteria

- [ ] `initWorkspaceStructure()` en SetupWizard crea `traNNsform/` (visible) con `input/`, `output/`, `templates/`, `snippets/`, y descarga todos los archivos.
- [ ] `AIGuidePanel.vue` ya no tiene `ensureTemplates()` ni lÃ³gica de download. Solo verifica existencia.
- [ ] `Header.vue` tiene botones Import y Export funcionales.
- [ ] `ImportPanel.vue` muestra archivos en `traNNsform/input/` y ofrece prompt copiable.
- [ ] `ExportPanel.vue` muestra selector de modelo y prompt copiable.
- [ ] `traNNsform/AGENT.md` referencia defiNNe para naming de modelos (no duplica).
- [ ] No existe `.traNNsform/` ni `outputs/` en el workspace creado por SetupWizard.
- [ ] `traNNsform/output/` (singular) existe y se usa para exports.
- [ ] `traNNsform/input/` existe como directorio vacÃ­o listo para recibir documentos.
