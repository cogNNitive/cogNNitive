# Handoff — Track A: QA (3b-4) + `failed_qa`

Sesión independiente. Worktree propio, sin dependencias de las otras dos pistas.

## Arranque (obligatorio, en este orden)

1. `node scripts/nn-session.mjs start --id conntent-qa` desde el checkout primario, y trabajá en
   `../cogNNitive-conntent-qa` (rama `session/conntent-qa`).
2. Cargá la skill `nn-dev-development` (`.agents/skills/nn-dev-development/SKILL.md`).
3. Leé, en este orden:
   - `openspec/changes/conntent-blueprint-redesign/specs/conntent-qa/spec.md` — **es tu contrato**
     (167 líneas: dos checkpoints, `overlay-missing`, `duration-mismatch`, `size-mismatch`,
     `audio-missing`, `output-missing`/`output-empty`/`output-size-mismatch`, `qa-unavailable`,
     `failed_qa`, reporte `qa.json`, exit 12, sin flag de skip, muestreo determinista).
   - `iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/pipeline.mjs` — bloque
     "5b. Overlay QA gate" y el orden de etapas.
   - `.../scripts/lib/overlay-qa.mjs` — la comprobación mínima del hotfix que tu módulo ABSORBE.
   - `.../test/produce.test.mjs` — los tres tests de overlay QA (líneas ~726-800) que migran.

## Qué tenés que construir

`lib/qa.mjs`, un módulo profundo, sin dependencias externas, con:

- `qaMaster({ episodeDir, manifest, masterPath, declaredSize, deps })` → `{ ok, checks: [...] }`
  1. **Estructural**: cada overlay/caption del manifest tiene host en `hyperframes/index.html` con
     start y duración iguales a las del manifest (esto reemplaza `overlay-qa.mjs`; **una sola
     comprobación en el repo**).
  2. **Visible**: a mitad de cada intervalo, recortá la región de texto con ffmpeg y compará la
     densidad de bordes contra el mismo recorte en un frame de referencia afuera del intervalo.
     Umbral nombrado `QA_TEXT_EDGE_MIN` (constante exportada, calibrable).
  3. **Duración/tamaño/audio** con `ffprobe`: total ±1 frame, escenas dentro del total, W×H igual al
     master declarado, stream de audio si hay narración.
- `qaOutputSet({ episodeDir, slug, outputFormats, thumbnailFormats })` → existencia, no-vacío y
  dimensiones según el nombre del archivo, más el `description.md`.
- `qa.json` escrito en la carpeta del episodio; ids de check, checkpoint, escena, esperado, hallado y
  tiempo/archivo muestreado. Determinista: mismos inputs → mismo reporte.
- `qa-unavailable` cuando falta `ffprobe`/`ffmpeg` o el master no se puede leer → **falla**, nunca pasa.

Cableado en `pipeline.mjs`:
- Master checkpoint reemplaza el bloque inline actual, justo después de `render` y antes de formats.
- Output-set checkpoint después de description y antes de `deliver`.
- Ambos escriben `recordStage(facts, { stage: 'qa', ... })` (dos filas `qa` en el timing log).
- Falla → `status:: failed_qa` por changeset de engine, exit 12 con error `qa-failed`, **sin** tocar
  `deliveries/`.
- `deps.qa` inyectable (los tests existentes inyectan `render`, `thumbStubs`, etc.).
- No existe `--skip-qa`: el CLI no lo lista y lo rechaza como opción desconocida.

## Restricciones que no podés romper

- **`pipeline.mjs` es compartido con la pista de captions.** Tocá SOLO los dos call sites de QA y el
  borrado del bloque de overlay inline. No reordenes etapas ni toques el bloque de síntesis/preview.
- Los tests existentes de `produce` usan un `fakeRender` que escribe `master-bytes` (no es un video
  real). Inyectá `deps.qa` en el helper compartido (`thumbStubs()`) para que sigan verdes; el test
  real de QA usa un master de fixture.
- Sin compatibilidad hacia atrás: borrá `overlay-qa.mjs` y su test si queda sin uso, no lo dejes como
  segunda vía.
- Para el escenario "emitido pero invisible" (F1) alcanza un fixture que reproduzca el síntoma: un
  overlay en el manifest cuyo host existe pero cuyo píxel no aparece.
- Blueprint `spec_NN.md` es UTF-8: nunca lo reescribas con `Set-Content`/`>`.
- No toques `openspec/specs/` (eso es la Fase 7, pista de cierre).

## Protocolo

Unidad = slice/PR. Un RED por módulo (`test/qa.test.mjs`), casos table-driven. Loop:
`node --test <archivo>`. Un `node scripts/verify.js --only=conntent` por slice. Un commit
convencional (sin atribución de IA), un push.

## Definition of done

- `test/qa.test.mjs` verde con: overlay ausente, overlay invisible, duración off, tamaño wrong,
  audio faltante, thumbnail faltante, dimensión wrong, archivo vacío, `qa-unavailable`, reporte
  determinista, `failed_qa` bloquea delivery y deja el master, rerun desde `failed_qa` avanza.
- `node scripts/verify.js --only=conntent` verde.
- `overlay-qa.mjs` ya no existe y ninguna referencia quedó (`rg overlay-qa`).
- `QA_TEXT_EDGE_MIN` documentado con el valor elegido y el criterio (se calibra después sobre los
  frames del piloto; dejá el número actual y una nota).

## Trampas

`produce` necesita caché TTS previa (compile primero) para episodios con avatar. Una sola config de
guard: `loadGuardWithVoices`. PowerShell: `;`, nunca `&&`. `git reset --hard`/`clean`/`stash` están
bloqueados por hook. Después de tocar la consola: `npm run build:console`; después de nn-core:
`npm run regen`.
