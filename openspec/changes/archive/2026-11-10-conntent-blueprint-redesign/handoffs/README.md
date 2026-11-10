# Handoffs — cómo partir el trabajo restante

Tres pistas en paralelo, una de cierre. Cada pista es una sesión con su worktree y su rama; ninguna
necesita a las otras para arrancar.

| Pista | Archivo | Alcance | Archivos propios | Toca nn-core |
|---|---|---|---|---|
| **A** | `track-a-qa.md` | 3b-4 QA + `failed_qa` | `lib/qa.mjs` (nuevo), `pipeline.mjs` (2 call sites), `test/qa.test.mjs` | no |
| **B** | `track-b-captions.md` | 3b-3.6→3.9 captions | `lib/captions-stage.mjs` (nuevo), `lib/captions.mjs`, `compile.mjs`, `scene-project.mjs`, `scene-compiler.mjs`, `pipeline.mjs` (import + 1 llamada) | no |
| **C** | `track-c-delivery-view.md` | 4d vista de entrega + picker | vista `conntent*`, `lib/delivery.mjs`, `console/output-path.ts`, tests de consola | **sí** (`npm run regen`) |
| **cierre** | — (serial) | 3b-2.8 cold-cache E2E, 3b-5.8 description E2E, 5b.4 U1-U7, Fase 7 (41 deltas + archivo), prettier, tag | todo | sí |

## El único archivo compartido

`lib/pipeline.mjs` lo tocan A y B. Regla: **A** reemplaza el bloque inline de overlay QA por los dos
checkpoints; **B** agrega el import y la llamada del stage de captions en el hueco entre síntesis y
animático. Hunks chicos y lejanos: git los auto-mergea. Nadie más toca ese archivo.

Nadie toca: `spec_NN.md` (sólo si su slice lo pide), `openspec/specs/` (Fase 7), ni `produce.mjs`
(es un CLI de 80 líneas).

## Orden de merge

1. A y B en cualquier orden (conflicto chico y esperable en `pipeline.mjs`; resolvelo a mano, no
   "tomando un lado").
2. C cuando quieras; no depende de A ni de B.
3. **Cierre** sólo cuando A, B y C estén en `dev`: los E2E tienen que correr contra el pipeline
   final, y la Fase 7 archiva los specs de todo.

Cada pista termina con: un RED por módulo, `node scripts/verify.js --only=conntent` (o `--only=console`
en C), un commit convencional sin atribución de IA, un push.

## Cómo arrancar cada sesión

```powershell
node scripts/nn-session.mjs start --id conntent-qa
node scripts/nn-session.mjs start --id conntent-captions
node scripts/nn-session.mjs start --id conntent-delivery
```

Cada una crea `../cogNNitive-<id>` sobre `session/<id>` desde `origin/dev`. En la sesión nueva, pegá
el contenido del archivo de la pista como prompt inicial (o pasá la ruta
`openspec/changes/conntent-blueprint-redesign/handoffs/track-*.md` y pedile que la lea primero).

## Regla de oro

Ninguna pista "arregla de paso" algo de otra. Si encontrás un bug fuera de tu alcance, anotalo en
`openspec/backlog_NN.md` como `## NN Item:` y seguí. El trabajo restante está partido así justamente
para que nadie se pise en un árbol compartido.
