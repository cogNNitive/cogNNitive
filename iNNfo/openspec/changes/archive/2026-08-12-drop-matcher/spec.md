# Drop Custom Skill Matcher — Spec

## Requirements

### REQ-1: Eliminar `agents/triggers.yaml`
- **Acción**: Borrar el archivo completo
- **Criterio**: El archivo no debe existir post-cambio

### REQ-2: Eliminar `scripts/skill-matcher.mjs`
- **Acción**: Borrar el archivo completo
- **Criterio**: El archivo no debe existir post-cambio

### REQ-3: Reemplazar Pre-Flight Protocol en `AGENTS.md`
- **Acción**: Reemplazar líneas 12-45 (sección `## Pre-Flight Protocol — Skill Loading (MANDATORY)` y todo su contenido) con una sección más simple que:
  1. Explique que iNNfo usa OpenCode y el dispatch nativo de skills
  2. Liste los skills del proyecto y qué hacen
  3. Tenga un Post-Mortem breve para cuando un skill no se carga (idem anterior, sin referencia al matcher)
- **Criterio**: No debe haber referencias a `triggers.yaml`, `skill-matcher.mjs`, `Pre-Flight Protocol`, ni al comando `node scripts/skill-matcher.mjs`

### REQ-4: No afectar otros archivos
- **Criterio**: Ningún otro archivo del repo debe ser modificado. Skills, configuraciones de OpenCode, docs no relacionados, etc. se conservan intactos.

## Scenarios

### SC-1: Happy path — agente en OpenCode
1. Usuario envía mensaje a OpenCode en iNNfo
2. OpenCode ve `available_skills` + descripciones
3. Modelo decide cargar el skill relevante via tool `skill`
4. Skill se carga y el agente procede
5. **Verificación**: funciona como antes, sin el matcher

### SC-2: Skill no se carga automáticamente
1. Usuario nota que un skill no se activó
2. Usuario invoca `/skill-name` directamente, o pide "cargá el skill X"
3. **Verificación**: el mecanismo de Post-Mortem en AGENTS.md cubre este caso

### SC-3: No hay scripts rotos
1. Verificar que ningún script en `package.json`, `scripts/`, o CI referencia `skill-matcher.mjs`
2. **Verificación**: cero referencias externas
