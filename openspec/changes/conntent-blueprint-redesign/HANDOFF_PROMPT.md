# Prompt de handoff — coNNtent bluepriNNt Redesign

Copia y pega el bloque de abajo en una sesión nueva. Es autocontenido: no necesita este chat.

---

Continúas el cambio SDD **`conntent-blueprint-redesign`** en el repo **cogNNitive**.

## Dónde trabajar

- Worktree: `D:/Users/lucas/Documents/GitHub/cogNNitive-conntent-redesign-sdd`
- Rama: `feat/conntent-redesign` · HEAD `551394e7` · todo commiteado y pusheado
- **El checkout primario es read-only** (integración/release). Nunca escribas ahí: hay un hook que
  lo bloquea. Trabajá siempre en el worktree.
- Antes de tocar nada, cargá la skill `nn-dev-development` y leé
  `openspec/changes/conntent-blueprint-redesign/handoff.md` (estado real + trampas). `tasks.md`
  tiene 152 casillas sin tildar que **no** reflejan el estado: el handoff es la fuente de verdad.

## Qué existe ya

- Motor `coNNtent` completo salvo subtítulos, extracción de `pipeline.mjs`, QA real y los E2E.
- Consola: runtime cerrado (4a), vista unificada `Pipeline` con **revisión y aprobación reales**
  (4c.3): tira de gates, tarjeta por escena con miniatura y audio, `Approve` / `Needs change`,
  cambios `review_gate` con `author_kind: human`, `origin: console` y hash publicado por el payload.
- Un domaiNN de usuario final en `D:\Users\lucas\Documents\_NN\coNNtent_NN` **con el piloto
  `villabotijos-today/pepper-mapache` ya producido y entregado (v1)**: 3 formatos, 2 miniaturas y
  descripción con capítulos. Ese dominio **no va al repo**: es el banco de pruebas; los videos viven ahí.
- Gates verdes: `node scripts/verify.js --only=conntent` y `--only=console`.

## Qué falta, en este orden

1. **4c.4** regenerar la consola tras cada salida del engine y cada changeset aplicado.
   **4c.6** test de tamaño con 50 episodios de fixture.
2. **Picklists del catálogo** (spec `conntent-domain-console`, "Picklists come from the catalog"):
   `image_model`, `avatar_model`, `voice_model` y `voice` hoy son texto libre. Bloqueado por: el
   parser del blueprint descarta claves no declaradas; el payload de la consola lleva **slugs** del
   catálogo, no el `api_id` del proveedor que esperan esos campos; y un `select` sin opciones
   renderiza una lista vacía. Hace falta llevar el catálogo mergeado (con `api_id`) al payload y
   agregar el hook de opciones al schema. En `scripts/export-console.mjs` hay un bloque **inerte**
   de resolución `options_from`: conectalo o borralo.
3. **4b.4** marcar traducción obsoleta (`translation_of`); **4b.5** el caso "servida" de entregas
   superadas.
4. **4d** vista de entrega (`conntent-delivery`, read-only, `writeConsole` `scope.outFile` a
   `deliveries/v<N>/<slug>_delivery.html`) + picker de componentes.
5. **3b-3.6-.9** subtítulos: cablear en `produce` (tras TTS/imágenes, antes del animático; bajo 90%
   de alineación, exit 1), chequeo de consentimiento ASR antes de gastar, `caption-skin.html` desde el frame.
6. **3b-2.2/.8** extraer `pipeline.mjs` de `produce.mjs`; E2E de caché fría con proveedores falsos.
7. **3b-5.7/.8** reconciliar la descripción con HyperFrames; E2E que llega a `delivered v1` y cuyo
   rerun es no-op.
8. **QA real (3b-4)**: `qa.test.mjs`, `lib/qa.mjs`, checkpoint del set de salida y calibrar
   `QA_TEXT_EDGE_MIN` sobre los frames reales del piloto (V.4).
9. **5b.4** simular U1-U7 sobre un domaiNN de fixture, proveedores falsos.
10. **Fase 7**: fusionar los 41 specs delta en `openspec/specs/`, regenerar, `node scripts/verify.js`
    completo, release con `nn-dev-release`, correr U1-U7 contra el dominio del usuario, archivar.
11. **Final**: merge de `feat/conntent-redesign` a `dev` sólo con `verify.js` verde.

## Protocolo de entrega (no reabrir)

Unidad = slice/PR; un RED por módulo con casos tabulares; runner dirigido en el loop; un
`verify.js --only=<área>` por slice; un `verify:fast` por PR; un push. Sin compatibilidad hacia atrás.
`review_gates: []` es autopilot. Sólo cuentan veredictos `author_kind: human` + `origin: console` +
reviewer con nombre (distinto de `reviewer`).

## Reglas de diseño

**Reutilizá lo que la consola ya tiene** antes de escribir markup nuevo: `ctx.ui.FieldRow`,
`ctx.ui.FieldValue`, `ctx.ui.Toast`, `nn-lightbox`, `nn-visual-card`/`nn-visual-thumb`/`nn-visual-details`,
`nn-scene-card`, `nn-verdict`, `nn-cascade-chip`, `.table`.

## Trampas que ya costaron tiempo

- `iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md` es **UTF-8**. No lo restaures con redirección de
  PowerShell ni `Set-Content`: escriben UTF-16 y el resolvedor del paquete falla con
  "bluepriNNt package not found".
- El domaiNN guarda una **copia local del blueprint** (`specs/bluepriNNts/coNNtent/` y
  `V_0-17-0/`). Después de editar el blueprint, refrescá ambas copias antes de exportar.
- `produce` necesita la caché TTS: corré `compile` primero o las escenas con avatar fallan.
- La config del guard es **una sola** (`loadGuardWithVoices`): de ella depende la clave de caché TTS.
- Vocabulario de capas: `type:: avatar|media|text|animation` + `style:: title|lower-third|caption|
  watermark|quote`. `presenter/background/title` está retirado y el validador lo rechaza.
- `background_audio` es `type:: file`: ruta relativa, no nombre de librería.
- En `FieldRow`, **no** pases `inherited`: reemplaza la etiqueta del campo y apunta la dirección a
  `concept:<nivel>`, que la consola marca como no editable.
- Tras tocar fuentes de consola: `npm run build:console`. Tras tocar nn-core: `npm run regen`.

## Primer paso sugerido

`4c.4`: escribir el RED que exige regeneración de la consola tras cada salida del engine y cada
changeset aplicado, implementarlo sobre el `finally` del pipeline, y seguir con la extracción de
`pipeline.mjs` (3b-2.2), que es su prerequisito natural.
