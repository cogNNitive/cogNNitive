# Handoff — Track B: captions (3b-3.6 → 3b-3.9)

Sesión independiente. La única pista que hoy tiene una promesa silenciosa: `captions` es un campo
declarado (default `off`) y **nadie lo lee**; `lib/captions.mjs` existe pero ningún stage lo llama.

## Arranque (obligatorio, en este orden)

1. `node scripts/nn-session.mjs start --id conntent-captions` desde el checkout primario, y trabajá
   en `../cogNNitive-conntent-captions` (rama `session/conntent-captions`).
2. Cargá la skill `nn-dev-development` (`.agents/skills/nn-dev-development/SKILL.md`).
3. Leé, en este orden:
   - `openspec/changes/conntent-blueprint-redesign/specs/conntent-captions/spec.md` — **es tu
     contrato** (modo por escena `off|words|lines`, modelo derivado del idioma, texto del guion y
     whisper solo da tiempos, <90% corta, caché, whisper chequeado antes de gastar, y "Caption stage
     position": después de TTS/imágenes y antes del animático, costo cero).
   - `.../scripts/lib/captions.mjs` — todo el núcleo ya está (`alignCaptions`,
     `alignCaptionLines`, `captionsCacheKey`, `runTranscribe`, `CAPTION_MATCH_MIN`,
     `wordsUnsupported`). **No lo reescribas**: cablealo.
   - `.../scripts/lib/pipeline.mjs` — bloque "4b. Synthesis" y el orden hasta el animático.
   - `.../scripts/lib/compile.mjs` (emisión de `frame.md`, skin, overlays) y `.../scene-project.mjs`
     (línea ~224: `plan.narrationCaptions` arma el host `#captions`; **hoy nada lo setea**) y
     `.../scene-compiler.mjs` (`createCaptionsOverlay`, `overlayTracks`).
   - `.../test/captions.test.mjs` — el núcleo ya está cubierto: no dupliques casos.

## Qué tenés que construir

1. **Stage de alineación** (nuevo `lib/captions-stage.mjs`, y sólo dos líneas de pipeline):
   - Corre después de `synthesizeEpisodeAssets` y **antes** del animático.
   - Por escena con `captions != off`: audio TTS ya cacheado → `runTranscribe` con el modelo derivado
     del idioma (`small.en` para `en`, `small` para el resto; nunca el default) → `alignCaptions`
     (o `alignCaptionLines`) → cobertura < `CAPTION_MATCH_MIN` (0.90) ⇒ **stop con exit 1 antes de
     renderizar**, nombrando escena y cobertura.
   - Caché en `cache/video/captions/<sha256(audio sha, texto, engine, versión)>.json`
     (`captionsCacheKey`): hit no transcribe; cambiar texto o modelo invalida.
   - Idioma sin espacios (`zh`, `ja`) + `words` ⇒ error de validación (`wordsUnsupported` ya existe).
2. **Consentimiento ASR antes de gastar** (3b-3.7): si `captions != off` y whisper/transcribe no está
   disponible, `produce` **falla en validación, antes de cualquier gasto**, con un mensaje que ofrece
   instalar; no instala nada solo. `captions: off` siempre es válido. Test propio
   (`test/whisper-consent.test.mjs`).
3. **Timings al render**: setear `plan.narrationCaptions` y los bloques de caption por palabra/línea
   para que `scene-project` emita el host `#captions` y `scene-compiler` sus overlays con `fromFrame`
   y duración reales. Las palabras muestran **el texto del guion**; whisper sólo aporta tiempos.
4. **`caption-skin.html` desde el frame activo** (3b-3.9): la emisión copia el skin del frame
   (`library/frames/<name>/caption-skin.html`) al proyecto HyperFrames junto con `frame.md`.
   Si el frame no trae skin, se usa el estilo por defecto del componente `caption` — sin inventar CSS
   nuevo en el view del engine.

## Restricciones que no podés romper

- **`pipeline.mjs` es compartido con la pista de QA.** Tocá SOLO el import y la llamada al stage de
  captions, en el hueco entre síntesis y animático. No reordenes etapas, no toques el bloque de QA.
- `compile.mjs` es tuyo en esta pista; QA no lo toca.
- Sin compatibilidad hacia atrás ni modo "estimado": el spec prohíbe el fallback inventado.
- `captions` y `caption_model` dejan de estar en `PLANNED_CONSUMERS` (`lib/field-consumers.mjs`) y
  pasan a `FIELD_CONSUMERS` con los módulos reales.
- Blueprint `spec_NN.md` es UTF-8: nunca lo reescribas con `Set-Content`/`>`.
- No toques `openspec/specs/` (Fase 7, pista de cierre).

## Protocolo

Unidad = slice/PR. Un RED por módulo (`test/captions-stage.test.mjs`, `test/whisper-consent.test.mjs`).
El núcleo (`captions.test.mjs`) ya es verde: no lo toques salvo para agregar el caso que falte. Loop:
`node --test <archivo>`. Un `node scripts/verify.js --only=conntent` por slice. Un commit convencional,
un push.

## Definition of done

- Stage en la posición correcta y **costo cero** cuando la caché pega (assert de llamadas al runner).
- 90% pasa, 80% corta antes del render con exit 1 y nada gastado; escena sin habla no corta.
- `captions: off` no requiere whisper; `words`/`lines` sin transcribe fallan antes del gasto.
- Caché: hit no llama al runner; cambio de texto o de modelo invalida.
- Host `#captions` y overlays con tiempos reales en un render de fixture; `caption-skin.html` del
  frame presente en el proyecto emitido.
- `node scripts/verify.js --only=conntent` verde.

## Trampas

V3 (decidido): whisper no es instalable en Windows; se usa `hyperframes transcribe --engine auto`, y
`captions: lines` es el fallback válido si no hay word timings. `produce` depende de la caché TTS:
compilá primero. Una sola config de guard: `loadGuardWithVoices`. PowerShell: `;`, nunca `&&`.
