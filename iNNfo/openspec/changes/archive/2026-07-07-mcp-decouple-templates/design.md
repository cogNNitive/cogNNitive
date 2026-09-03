# Design: Desacople del MCP de plantillas y URLs

## Decisión de arquitectura

El MCP es un **motor de resolución agnóstico**. El conocimiento de "qué spec / qué plantilla / en qué URL" vive en el **modelo** (`parent_spec.url`) o lo aporta el **usuario** (argumento `url`). El MCP no guarda constantes de contenido.

Esto ya es cierto en la capa `innfo-core`: `resolveParentChain(parentUrl, ...)` recibe la URL como argumento. El desacople consiste en **eliminar** la capa de "comodidad" hardcodeada que `spec.ts` puso encima.

## Estado actual → objetivo

| Símbolo | Hoy | Objetivo |
|---------|-----|----------|
| `SPEC_BASE_URL` | const con `v0.1.5/specs` (404) | **eliminado** |
| `TEMPLATE_SPECS` | mapa `{business, procedures, catalog}` | **eliminado** |
| `resolveVersion()` | deriva versión + fallback `'0-1-2'` | **eliminado** |
| `getSpec(rootDir, version?, modelId?)` | construye URL desde `SPEC_BASE_URL` | `getSpec(rootDir, { url?, modelId? })` |
| `getTemplate(rootDir, name, version?)` | usa `TEMPLATE_SPECS` | **eliminado** |
| `getTemplateFromUrl(rootDir, url, name)` | ya existe, correcto | **sin cambios** (motor único) |

## Firma nueva de las tools (contrato MCP)

```jsonc
// get_spec
{ "url": "string (optional)", "model_id": "string (optional)" }
// requiere al menos uno; error claro si faltan ambos

// get_template
{ "url": "string (optional)", "model_id": "string (optional)" }
// requiere al menos uno; error claro si faltan ambos
```

`list_models`, `read_model`, `apply_change` no cambian de firma. `validate_model` gana un `template_url` opcional para el caso de modelos sin `parent_spec.url` que aun así quieran validar contra plantilla.

## Resolución por `model_id` (helper nuevo)

```ts
// spec.ts
async function readParentSpecUrl(rootDir, modelId): Promise<{ url; name } | null> {
  const fp = await findModelFile(rootDir, modelId)   // reusar de mutate.ts o duplicar mínimo
  if (!fp) return null
  const fm = parseFrontmatter(await readFile(fp, 'utf-8'))
  const url = fm?.parent_spec?.url, name = fm?.parent_spec?.name
  return url && name ? { url, name } : null
}
```

`getSpec` y `handleGetTemplate` usan este helper cuando reciben `model_id` sin `url`.

## `mutate.ts` — quitar el fallback legacy

En `validateModel()` y `applyChange()`, el bloque actual:

```ts
if (parentUrl && parentName) {
  template = await getTemplateFromUrl(rootDir, parentUrl, parentName)
} else if (parentName) {
  const templateName = parentName.split('_V_')[0] ?? parentName
  template = await getTemplate(rootDir, templateName, modelVersion)   // ← ELIMINAR
}
```

queda:

```ts
if (parentUrl && parentName) {
  template = await getTemplateFromUrl(rootDir, parentUrl, parentName)
}
// sin parentUrl → template = null → validación estructural + warning
```

En `validateModel`, si `content`/`id` no traen `parent_spec.url` y el caller pasó `template_url`, resolver por ahí.

## Estrategia de TDD (strict_tdd: true)

Runner: `npm run test` (Vitest). Orden red → green por cada requirement:

1. Test: `get_spec` con `url` explícita resuelve (local specs/ stub, sin fetch).
2. Test: `get_spec` con `model_id` deriva `parent_spec.url`.
3. Test: `get_spec` sin args → error, sin fetch.
4. Test: `get_template` con `url` / con `model_id` / sin args (error).
5. Test: `validateModel` sin `parent_spec.url` → `template null` + warning.
6. Test: grep-guard — `spec.ts` no contiene `SPEC_BASE_URL` ni `TEMPLATE_SPECS`.

## Build

`packages/innfo-mcp` compila con `tsup` (`npm run build:bundle`) → regenera `bin/innfo-mcp.bundle.js`. Tarea explícita post-verde. El bundle es el artefacto que `iNNv0_skills` consume vía `update-mcp.js`.

## Consumidores verificados

`grep` de `getTemplate|getSpec|TEMPLATE_SPECS|SPEC_BASE_URL` en el monorepo: los únicos consumidores de las funciones hardcodeadas son `server.ts` (handlers) y `spec.spec.ts` (tests). El editor Vue no las importa. No hay riesgo fuera de `innfo-mcp`.
