# Proposal: Desacoplar el MCP de plantillas y URLs hardcodeadas

## Intent

El MCP `innfo-mcp` no debe conocer ninguna plantilla ni URL de spec por adelantado. Hoy `packages/innfo-mcp/src/tools/spec.ts` todavÃ­a contiene dos constantes de contenido:

- `SPEC_BASE_URL = 'https://raw.githubusercontent.com/cogNNitive/cogNNitive/v0.1.5/specs'`
- `TEMPLATE_SPECS = { business, procedures, catalog }` (nombres de archivo con versiones fijas)

Ambas estÃ¡n **rotas** (verificado: la URL `.../v0.1.5/specs/business_V_0-2-0_NN.md` devuelve **404**; el layout actual vive en `specs/latest/level2/...`) y, mÃ¡s importante, **violan el diseÃ±o**: un motor de resoluciÃ³n iNNfo debe ser agnÃ³stico del publicador. Un modelo iNNfo es autodescriptivo â€” su frontmatter declara `spec_url` y `parent_spec.url`. Esa es la Ãºnica fuente de verdad.

El cambio archivado `2026-07-06-mcp-template-from-url` hizo la mitad del trabajo: agregÃ³ `getTemplateFromUrl()` y reconectÃ³ `validateModel`/`applyChange`, pero **decidiÃ³ a propÃ³sito conservar** el camino hardcodeado para `get_template` (ver requirement "getTemplate legacy remains unchanged"). Esta propuesta completa el trabajo: elimina el hardcodeo por completo y redefine el contrato de las tools `get_spec` y `get_template` para que la URL entre **desde el usuario o desde el `parent_spec.url` de un modelo cargado, nunca desde una constante**.

## Scope

### In Scope
- `packages/innfo-mcp/src/tools/spec.ts`: eliminar `SPEC_BASE_URL` y `TEMPLATE_SPECS`. Reescribir `getSpec()` para resolver desde `url` explÃ­cita o desde `parent_spec.url` de un modelo. Eliminar `getTemplate(name)` legacy; `getTemplateFromUrl` queda como Ãºnico motor de resoluciÃ³n de plantillas.
- `packages/innfo-mcp/src/tools/mutate.ts`: eliminar el fallback `else if (parentName) getTemplate(...)` en `validateModel()` y `applyChange()`. Sin `parent_spec.url` resoluble, la validaciÃ³n procede sin plantilla (con warning) o acepta un `template_url` explÃ­cito.
- `packages/innfo-mcp/src/server.ts`: redefinir el `inputSchema` y las descripciones de `get_spec` y `get_template` â€” reciben `url` y/o `model_id`, ya no `name`/`version`. Actualizar los handlers.
- `packages/innfo-mcp/src/tools/spec.spec.ts`: actualizar los tests que ejercen el camino por nombre/versiÃ³n hardcodeado.

### Out of Scope
- `packages/innfo-core/src/resolver.ts` y `resolver-node.ts` â€” ya son genÃ©ricos (reciben la URL como argumento). No se tocan.
- El wiring en `iNNv0_skills` (registro del MCP en OpenCode y reescritura de la skill). Es la fase siguiente, en el otro repo.
- Publicar una versiÃ³n nueva de spec en cognitive.

## Capabilities

### Modified Capabilities
- `innfo-mcp`: el contrato de las tools `get_spec` y `get_template` cambia. Es un **breaking change** de la API pÃºblica del MCP server (deliberado, alineado con la regla "NO BACKWARDS COMPATIBILITY" del repo).

### Removed Capabilities
- ResoluciÃ³n de plantilla/spec por `name`/`version` contra constantes internas. Ya no existe.

## Approach

1. **`spec.ts`** â€” Borrar `SPEC_BASE_URL`, `TEMPLATE_SPECS`, `resolveVersion()` y `getTemplate(name)`. Agregar `getSpecFromModel(rootDir, modelId)` que lee el modelo, toma `parent_spec.url` y resuelve la cadena. `getSpec` pasa a firmar `(rootDir, { url?, modelId? })`. `getTemplateFromUrl` queda intacto.
2. **`mutate.ts`** â€” En `validateModel()` y `applyChange()`, quitar la rama `else if (parentName)`. Si el modelo no trae `parent_spec.url`, `template` queda `null` (validaciÃ³n estructural con warning), salvo que el caller pase `template_url`.
3. **`server.ts`** â€” `get_spec` y `get_template` reciben `{ url?, model_id? }`; error claro si no viene ninguno. Descripciones sin menciÃ³n a "business/procedures/kb".
4. **Tests** â€” Reescribir los casos de `spec.spec.ts` para ejercer resoluciÃ³n por URL y por modelo, no por nombre.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/innfo-mcp/src/tools/spec.ts` | Modified | Elimina hardcodeo; `getSpec` y resoluciÃ³n por URL/modelo. |
| `packages/innfo-mcp/src/tools/mutate.ts` | Modified | Quita fallback legacy en validate/apply. |
| `packages/innfo-mcp/src/server.ts` | Modified | Nuevo contrato de tools `get_spec`/`get_template`. |
| `packages/innfo-mcp/src/tools/spec.spec.ts` | Modified | Tests por URL/modelo. |
| `openspec/specs/innfo-mcp/spec.md` | Modified | Revierte "getTemplate legacy remains unchanged". |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Un consumidor del MCP dependÃ­a de `get_template` por `name` | Low | Solo `handleGetTemplate` lo usaba; no hay otros consumidores en el monorepo (grep confirmado). |
| Un modelo sin `parent_spec.url` ya no valida contra plantilla | Medium | ValidaciÃ³n estructural procede con warning explÃ­cito; el caller puede pasar `template_url`. Documentado en el spec. |
| El bundle `bin/innfo-mcp.bundle.js` queda desincronizado | High | Rebuild del bundle es tarea explÃ­cita de la fase de apply. |

## Rollback Plan

Revertir `spec.ts`, `mutate.ts`, `server.ts` y `spec.spec.ts`. Restaurar `openspec/specs/innfo-mcp/spec.md` al estado previo. El hardcodeo `SPEC_BASE_URL`/`TEMPLATE_SPECS` vuelve.

## Dependencies

Ninguna en cognitive. La fase de `iNNv0_skills` depende de que este cambio estÃ© aplicado y el bundle reconstruido.

## Success Criteria

- [ ] `spec.ts` no contiene `SPEC_BASE_URL` ni `TEMPLATE_SPECS` (grep vacÃ­o).
- [ ] `get_spec` resuelve desde `url` explÃ­cita y desde `model_id` (vÃ­a `parent_spec.url`).
- [ ] `get_template` resuelve desde `url` explÃ­cita y desde `model_id`; error claro si no viene ninguno.
- [ ] `validateModel`/`applyChange` no llaman a ningÃºn resolver por nombre.
- [ ] `npm run typecheck` y `npm run test` verdes en `packages/innfo-mcp`.
- [ ] Bundle `bin/innfo-mcp.bundle.js` reconstruido.
