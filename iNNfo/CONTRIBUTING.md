# Guía de Revisión de Calidad de Código — iNNfo

> Qué mirar en este proyecto para garantizar **coherencia**, **buena estructura**,
> **aplicación de mejores prácticas** y, en general, **buena calidad de código**.
>
> Este documento sirve para dos cosas:
> 1. Como **prompt reutilizable** para lanzar una revisión (humana o con un agente).
> 2. Como **checklist accionable** con hallazgos concretos ya detectados en el repo.

---

## 1. Contexto del proyecto (stack real)

Monorepo con **npm workspaces** (`packages/*`, `apps/*`):

| Paquete | Rol | Stack |
|---|---|---|
| `apps/innfo-editor` | Editor visual (UI) | Vue 3 (SFC, `<script setup>`), Vite 6, TS 5, Pinia, Vue Router, Tailwind 3, d3/dagre/mermaid, radix-vue |
| `packages/innfo-core` | Librería de dominio: parser, modelo, drivers IO, validador | TS puro, compilado con `tsc`, sin dependencias de UI |
| `packages/innfo-mcp` | Servidor MCP sobre `innfo-core` (stdio) | TS + `@modelcontextprotocol/sdk`, build con `tsup` |
| `packages/format-core`, `packages/format-mcp` | ⚠️ **Legacy** — solo `dist/`, sin `src/` ni `package.json` de origen | Copias viejas anteriores al rename a `innfo-*` |

**Regla de oro de arquitectura**: `innfo-core` es el dominio y **no debe** conocer a Vue,
Pinia ni al navegador (salvo los drivers `-browser` explícitos). La UI depende del core,
nunca al revés.

---

## 2. Cómo usar este archivo como prompt

Pegá esto (o delegá a un agente de revisión) apuntando a un diff o al repo completo:

```
Revisá este código de iNNfo usando CONTRIBUTING.md.
Evaluá los cuatro ejes: coherencia, estructura, mejores prácticas y calidad general.
Para cada hallazgo indicá: archivo:línea, severidad (CRÍTICO/ALTO/MEDIO/BAJO),
el POR QUÉ técnico, y la corrección propuesta. No inventes problemas: si algo está
bien, decilo. Priorizá los hallazgos por impacto real, no por cantidad.
```

Severidades:
- **CRÍTICO**: rompe build/tests, bug de datos, vulnerabilidad, o viola el límite de capas.
- **ALTO**: deuda que va a doler pronto (SFC inmanejable, `any` en dominio, falta de tooling).
- **MEDIO**: incoherencia de convención, duplicación evitable, test faltante.
- **BAJO**: naming, formato, nit estético.

---

## 3. Ejes de revisión

### 3.1 Coherencia

Lo que hace que el código parezca escrito por **una sola cabeza**, no por diez.

- [ ] **Rutas de import unificadas.** Hoy conviven TRES formas de importar lo mismo:
      `@cognnitive/innfo-core`, `../model/types` (shims de re-export) y el alias `@/*`
      declarado en `tsconfig` pero casi sin uso. Decidí UNA convención por capa y aplicala:
  - Tipos/lógica de dominio → siempre desde `@cognnitive/innfo-core` (o el shim `@/model/*`),
    pero no ambos indistintamente.
  - Dentro del app → alias `@/` en vez de `../../..`.
- [ ] **Patrón de stores consistente.** Todos los stores usan Pinia Options API
      (`state/getters/actions`). Si aparece un store en Composition/Setup API, es una
      incoherencia: elegí un estilo y mantenelo.
- [ ] **Naming coherente**: `useXxx` para composables, `XxxStore`/`useXxxStore` para
      stores, `XxxWidget.vue` para widgets del registry, `FieldXxx.vue` para campos.
      Verificá que ningún archivo nuevo rompa la familia.
- [ ] **Idioma coherente**: código, identificadores y comentarios en inglés;
      documentación de proyecto (`AGENTS.md`, `openspec/`, esta guía) en español.
      No mezclar dentro de un mismo artefacto.
- [ ] **Un solo origen de verdad para el modelo.** `src/model/*.ts` deben seguir siendo
      shims finos de re-export; si empieza a aparecer lógica de dominio dentro del app,
      es una fuga de capa.

### 3.2 Estructura

- [ ] **Límite de capas app ↔ core.** `innfo-core` no debe importar nada de `apps/`,
      de Vue, de Pinia ni de `window`/DOM fuera de los drivers `-browser`. Buscá
      violaciones: `rg "from '.*apps/" packages/innfo-core/src`.
- [ ] **Tamaño de los SFC.** Componentes > ~300 líneas son señal de que hacen demasiado.
      Candidatos actuales a descomponer:
  - `components/editor/GraphViewer.vue` (~669)
  - `components/editor/MatricesGrid.vue` (~561)
  - `components/editor/BlockSheet.vue` (~531)
      Extraé lógica a **composables** (`composables/`) y sub-componentes presentacionales.
- [ ] **Composables para lógica reutilizable/con estado**, no copiar-pegar `watch`/`ref`
      entre componentes. Ya hay un buen patrón en `composables/` (useFileSystem,
      useResizablePanel, etc.) — que las cosas nuevas lo respeten.
- [ ] **Container vs. presentational.** Los componentes que tocan stores/IO deberían
      orquestar; los que solo pintan deberían recibir props y emitir eventos. Un widget
      de campo no debería importar un store directamente.
- [ ] **Registry de widgets.** `shared/widgets/registry.ts` centraliza el mapeo tipo→widget.
      Todo widget nuevo se registra ahí; que no haya `if (type === ...)` sueltos en otro lado.
- [ ] **Sin código muerto.** Los packages `format-core`/`format-mcp` (solo `dist/`, sin
      fuentes, no importados por código vivo) deberían eliminarse o archivarse. Peso muerto
      que confunde a cualquiera que abra el repo.

### 3.3 Mejores prácticas

**TypeScript**
- [ ] `strict: true` ya está activo (bien). Protegé esa inversión: **minimizá `any`**.
      Hay ~57 usos de `any`/`as any` en ~11 archivos del app. Cada uno es un agujero en
      el sistema de tipos. Reemplazá por tipos concretos, genéricos o `unknown` + narrowing.
- [ ] Preferí `type`/`interface` explícitos sobre inferencia opaca en las fronteras
      públicas (exports de `innfo-core`, props de componentes, payloads de acciones).
- [ ] Nada de `@ts-ignore` sin comentario que justifique el porqué.

**Vue 3**
- [ ] `<script setup lang="ts">` en todos los SFC nuevos (consistencia).
- [ ] Props tipadas con `defineProps<T>()`, emits con `defineEmits<T>()`.
- [ ] No mutar props; no mutar estado de un store fuera de sus `actions`.
- [ ] `computed` para derivados, no recalcular en el template.
- [ ] Keys estables en `v-for` (no el índice cuando la lista se reordena — ojo con
      árboles y matrices que sí se reordenan aquí).
- [ ] Limpiar `watch`/listeners/observers en `onUnmounted` (d3, mermaid, ResizeObserver).

**Pinia**
- [ ] El estado se muta **solo** dentro de `actions`. Getters puros, sin efectos.
- [ ] Un store = una responsabilidad (model, metamodel, ui, history, workspace).
      Si un store empieza a tocar responsabilidades de otro, revisá el límite.

**Seguridad**
- [ ] Todo HTML/Markdown renderizado pasa por `dompurify`/`utils/sanitize.ts`.
      Buscá `v-html` sin sanitizar: `rg "v-html" apps/innfo-editor/src`. Cada `v-html`
      debe consumir contenido ya saneado.
- [ ] Nada de `eval`, `new Function`, ni interpolación de input de usuario en selectores/URLs.

**Accesibilidad / UX**
- [ ] Modales (radix-vue) con foco atrapado, `Esc` para cerrar y roles ARIA correctos.
- [ ] Elementos interactivos que no sean `<button>`/`<a>` con `role` y manejo de teclado.

### 3.4 Calidad general y tooling

- [x] **Linter.** ESLint 9 flat config (`eslint.config.mjs`) + `eslint-plugin-vue` +
      `typescript-eslint`. Scripts `lint` / `lint:fix` en la raíz.
- [x] **Formateador.** Prettier con `format` / `format:check` en la raíz. CI lo chequea en
      *ratchet mode* (solo los archivos tocados en el PR), así que corré `npm run format`
      local antes de mergear lo que hayas cambiado.
- [x] **CI.** `.github/workflows/ci.yml` corre en cada push/PR a `main`/`dev`: lint,
      format-check de cambios, `vue-tsc --noEmit` del app, tests de `innfo-core` /
      `innfo-mcp` / app, y build del app. `deploy.yml` publica a GitHub Pages desde `main`.
- [x] **Integridad de specs.** Job `spec-integrity` en CI: `npm run check:spec-urls`
      falla si alguna URL `raw.githubusercontent.com/cogNNitive/iNNfo/...` hardcodeada
      apunta a un archivo inexistente. `npm run check:spec-version -- --inventory` lista
      todas las versiones de spec presentes (informativo). Para barrer también los skills
      bundleados en `cogNNitive/actioNN`: `node scripts/check-spec-version.mjs
      --check-urls --with-skills`.
- [ ] **Typecheck de packages.** El build del app hace `vue-tsc --noEmit`. `innfo-core` /
      `innfo-mcp` solo compilan; falta un `--noEmit` explícito de packages en CI.
- [ ] **Tests.** Buena base: ~49 specs, fixtures en `tests/fixtures/` y e2e Playwright.
- [ ] **`console.*` fuera de producción.** Hay ~5 llamadas `console` en el app. Definí una
      política: logger centralizado o eliminarlas antes de mergear.
- [ ] **Dependencias sin fijar / duplicadas.** `@cognnitive/innfo-core` está referenciado como
      `"*"` en el app y `"^0.1.0"` en el mcp. Unificá el criterio de versionado interno.

### 3.5 Trazabilidad de la spec de formato iNNfo

La cadena de dependencia de la spec del DSL (L0 `defiNNe` → L1 `iNNfo` → L2 templates)
está descrita en `docs/documentation/specifications.md` (sección *Trazabilidad y
propagación*). El procedimiento mecánico de un bump vive en el skill
`.agents/skills/nn-dev-spec-version-propagator/`. Reglas que se chequean en revisión:

- [ ] **Inmutabilidad.** Ningún archivo bajo `specs/` se edita in-place. Un cambio de
      versión crea archivo nuevo con la versión en el nombre (`spec-versioning` R-SV-02).
- [ ] **Fuente única de la versión.** `apps/innfo-editor/src/utils/constants.ts`
      (`DEFAULT_INNFO_VERSION` / `DEFAULT_TEMPLATE_VERSION`) es la única fuente. Si la
      bumpeás, corré `npm run check:spec-version -- --version <vieja> --check --by-type`
      y actualizá cada archivo que la liste (docs, samples, skills, fixtures).
- [ ] **URLs vivas.** `npm run check:spec-urls` en verde.
- [ ] **Skills en sync.** Si tocaste una L2 que `cogNNitive/actioNN` bundlea (hoy
      `workspace_spec_NN`), sincronizá la copia bundleada desde la canónica de `iNNfo`.

---

## 4. Checklist rápido antes de mergear

```
[ ] vue-tsc --noEmit pasa sin errores
[ ] vitest run verde (unit + fixtures)
[ ] npm run lint verde
[ ] npm run check:spec-urls verde
[ ] No hay v-html sin sanitizar nuevos
[ ] No hay any nuevos en dominio (innfo-core) ni en fronteras públicas
[ ] Ningún SFC nuevo supera ~300 líneas sin justificación
[ ] Imports siguen la convención de su capa
[ ] No quedan console.* ni código comentado
[ ] Si toca el modelo, las fixtures se actualizaron leyendo el diff
[ ] Si toca specs/: archivo nuevo versionado (no edición in-place) y check:spec-version limpio
```
