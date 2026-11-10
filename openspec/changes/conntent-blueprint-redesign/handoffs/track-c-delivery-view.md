# Handoff — Track C: 4d (vista de entrega read-only + picker)

Sesión independiente y **sin archivos compartidos** con las otras dos pistas. Es la única que toca
nn-core (el builder de rutas), así que después de eso corre `npm run regen`.

## Arranque (obligatorio, en este orden)

1. `node scripts/nn-session.mjs start --id conntent-delivery` desde el checkout primario, y trabajá
   en `../cogNNitive-conntent-delivery` (rama `session/conntent-delivery`).
2. Cargá la skill `nn-dev-development` (`.agents/skills/nn-dev-development/SKILL.md`).
3. Leé, en este orden:
   - `openspec/changes/conntent-blueprint-redesign/specs/conntent-domain-console/spec.md`,
     sección **"Read-only delivery view"** (líneas ~640-690) — **es tu contrato**: un episodio y
     nada más, `kind: readonly`, payload sin explorer/rail/search, sin costos ni prompts, sin marca
     de superseded, media por ruta relativa hermana.
   - `openspec/changes/conntent-blueprint-redesign/specs/console-regeneration/spec.md` — el
     `writeConsole` compartido, la ruta de delivery y el caso **staging directory**.
   - `.../assets/console-view-conntent.js` (el panel de Episode que tenés que reusar en read-only) y
     `.../assets/console-view-conntent.data.mjs` (`collect()`).
   - `.../scripts/lib/delivery.mjs` (armado en carpeta temporal hermana + rename) y
     `iNNfo/packages/nn-core/src/console/output-path.ts`.
   - `scripts/export-console.mjs` líneas ~1739-1790: `scope.readOnly`, `scope.outFile` y el payload
     con `meta.consoleScope`.

## Qué tenés que construir

1. **`consoleOutputPath` gana el caso delivery** en nn-core:
   `scope: { view, model }` de delivery → `series/<s>/episodes/<slug>/deliveries/v<N>/<slug>_delivery.html`.
   Lo consumen el CLI, el MCP y el engine; el test del builder cubre el escenario del spec.
2. **`writeConsole` acepta la carpeta de staging**: el HTML se escribe ahí, pero el `relativePath`
   registrado en el payload es la ruta final (el HTML los links calcula como si ya estuviera en
   `vN/`, es decir `./<archivo>`).
3. **`delivery.mjs` escribe el HTML** dentro de la carpeta temporal, antes del rename, con
   `scope: { view: 'conntent-delivery', readOnly: true, models: [<modelo del episodio>], outFile }`.
   El HTML **no** entra en `outputs_hash` ni en `input_fingerprint` (lleva stamp, no es
   reproducible); sí puede figurar en `files[]` del `delivery.json` como dato informativo.
4. **Segunda registración `conntent-delivery`** en el mismo módulo de vista (X6: una sola
   codebase, dos ids). `kind: readonly`, sin `needs[]` de changeset/export/direct write, sin pedir
   grant de carpeta, sin sección Config/Status/costos. Renderiza: título, `v<N>`, idioma, hora de
   entrega, player por cada formato, thumbnails, descripción, guion por escena (narración + capas +
   stills/audio si están), resultado de QA y review history.
5. **Picker de portfolio de componentes** que pide el mismo spec (4d.2/.3): lista el portfolio del
   episodio sin pedir red.

## Restricciones que no podés romper

- **Reusá los primitivos**: `ctx.ui.FieldRow`, `ctx.ui.FieldValue`, `ctx.ui.Toast`, `nn-lightbox`,
  `nn-visual-card`, `nn-scene-card`, `nn-verdict`, `nn-cascade-chip`. Nada de markup nuevo si ya
  existe. `FieldRow` **sin** `inherited` (rompe la etiqueta y la dirección).
- La vista read-only **no** crea drafts, verdicts ni changesets. Cero controles. Cero costos.
- Los íconos de vista salen de un set cerrado (`play`, `layers`); `clapperboard` no existe.
- Las rutas de media son relativas al HTML de entrega (hermanas en `vN/`), no al domaiNN.
- Después de tocar fuentes de consola: `npm run build:console`. Después de nn-core: `npm run regen`
  (y commiteá los generados: `console-payload.generated.cjs`, `nn-core.generated.cjs`, bundle).
- No toques `pipeline.mjs` ni `compile.mjs` (los tienen las otras pistas).
- Blueprint `spec_NN.md` es UTF-8: nunca lo reescribas con `Set-Content`/`>`.

## Protocolo

Unidad = slice/PR. Un RED por módulo: `test/console-conntent-view.test.mjs` (jsdom, agregás casos,
no reescribas los 11 verdes) y `test/delivery.test.mjs` (HTML escrito una vez, nunca reemplazado,
links hermanos). Loop: `node --test <archivo>`. Un `node scripts/verify.js --only=console` y un
`--only=conntent` por slice. Un commit convencional, un push.

## Definition of done

- `deliveries/v1/` de un fixture contiene `<slug>_delivery.html`; al abrirlo en el navegador se ve
  sólo ese episodio, sin explorer, sin controles, con player cuyo `src` es `./<archivo>.mp4`.
- Un segundo intento de escribir el mismo `vN` **se niega** y deja el archivo intacto.
- `delivery.json` no incluye el HTML en `outputs_hash`/`input_fingerprint`; un rerun idéntico sigue
  siendo no-op.
- El domaiNN console (`conntent`) sigue mostrando su link al HTML cuando existe (4b.5 ya lo hace).
- `node scripts/verify.js --only=console` y `--only=conntent` verdes.

## Trampas

`writeConsole` exige que `outFile` resuelva dentro del root; el staging es hermano del `vN` final,
así que entra. El rename es lo que hace inmutable la entrega: nunca escribas después del rename.
PowerShell: `;`, nunca `&&`.
