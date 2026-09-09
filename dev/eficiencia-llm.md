# Eficiencia LLM — findings y propuestas (uso real iNNfo, semana 2026-09-02 → 2026-09-09)

> Objetivo: limitar el contexto a lo estrictamente necesario por llamada (menos tokens, más velocidad, menos coste)
> y rutear cada llamada al modelo adecuado. Vale para cualquier world y cualquier modelo (Nivel 2 / Nivel 3).
> Convención: la evidencia puede citar casos concretos con `#NNN`; findings y propuestas son genéricos.

## 1. Findings (dónde se desperdicia contexto hoy — genéricos)

1. **Archivo/modelo completo en prompt para cambios quirúrgicos.** Se mete el archivo o modelo entero cuando el
   cambio toca pocos elementos (evidencia: ~600 líneas × 6+ iteraciones; modelo maestro + decenas de fuentes para
   un mapeo puntual). Coste O(n) tokens por iteración aunque el diff sea O(1). Vale para cualquier Nivel 3.
2. **Re-validaciones completas tras cada micro-cambio.** Cada fix puntual re-corre validador/MCP sobre todo el
   workspace en vez de la unidad afectada (evidencia: verificación headless repetida por cambio + harnesses
   recreados por pasada).
3. **Resolución de plantillas a ciegas.** Scaffold/lectura/validación cargan spec completo + padres —y el resolver
   encima escribe caché en el árbol— aunque la tarea sea "N campos de 1 concepto" (evidencia: caché a borrar pre-commit).
4. **Fuentes externas como contexto crudo.** Decenas de textos importados/normalizados/mapeados con el LLM en el
   loop, sin chunking ni scores previos; el mapeo fuzzy consume ventana que debería usar un matcher barato +
   revisión solo en dudosas.
5. **Mismo modelo para razonar y para editar.** Sin distinción entre (a) razonar sobre todos los modelos/specs
   (ventana grande + modelo potente) y (b) aplicar un edit tipado (poco contexto + modelo rápido). Todo pasa por
   el mismo agente/modelo, en cualquier world.
6. **Artefactos y logs en el prompt.** El HTML generado y los logs completos viajan en la conversación; lo que el
   LLM necesita es código de salida + diff + veredicto, no el DOM.
7. **Ruido de validación pre-existente.** Cada error viejo se re-lee, re-explica y re-ignora en cada pasada (ver A8
   del doc hermano). También es coste LLM.

## 2. Principio rector (genérico)

> **Cada llamada declara su presupuesto de contexto y su clase de modelo. Nada viaja "por si acaso".**
> - `surgical` (edit de pocos elementos de 1 concepto): solo paths + slices + schema. Modelo rápido/barato.
> - `verify` (validador/harness/lint): solo exit code + errores nuevos vs baseline. Modelo barato, reintentos baratos.
> - `coach` (arquitectura, diseño, promoción a plantilla): índice + summaries + specs implicados. Modelo potente,
>   ventana grande, pocas llamadas.
> - `match` (mapeo N fuentes → M elementos): scores/embeddings fuera del LLM; LLM solo para dudosas.

## 3. Propuestas concretas (priorizadas, válidas para cualquier modelo)

### P0 — Acceso por slices
- Patrón MCP: lectura por slice (modelo, concepto, elementos) / consulta de unidades con tope + truncado — usarlo
  SIEMPRE, nunca dump completo.
- Regla de skill: ningún prompt `surgical` incluye un archivo de más de X líneas sin slice explícito.
- Contrato de datos abstraídos: el LLM edita el bloque de datos versionado, no el artefacto renderizado; el
  artefacto se regenera y verifica fuera del prompt.

### P0 — Validación diferencial + baseline
- Validar con baseline y solo-cambios: solo errores NUEVOS entran al prompt; lo pre-existente va a backlog.
- El harness devuelve exit + lista de checks; el log completo queda en disco.
- Efecto esperado: −60/−80% tokens en iteraciones 2..N del mismo artefacto (estimación; medir en la próxima auditoría).

### P1 — Router de modelos por intent
| Intent | Contexto | Modelo sugerido | Ejemplo genérico |
|---|---|---|---|
| `coach` | índice + specs + summaries (grande) | potente, ventana grande (lento ok) | diseñar plantilla, decidir matriz vs reference |
| `surgical` | slice de pocos elementos + schema | rápido/barato | corregir campo, color, tipo |
| `verify` | diff + errores nuevos | barato, tolerante a reintentos | validar, harness, lint |
| `match` | scores, no LLM pesado | matcher + LLM solo dudosas | mapear fuentes a elementos |
- Implementación mínima: el skill declara `intent:` + override manual; documentar qué modelo usar por intent y medir.
- Regla presupuestaria: `coach` pocas llamadas pero puede consumir la mitad del presupuesto; `surgical/verify`
  la mayoría de llamadas con una fracción menor del coste.

### P1 — Fuentes fuera del loop caliente
- Pipeline: importar → normalizar → match con scores → revisión solo de dudosas. Las genéricas sin elemento van a
  cola, no a contexto.

### P2 — Caché de specs + índice
- Índice (conceptos, elementos, URIs) por workspace; `coach` lee índice, `surgical` lee slice. El spec completo se
  carga una vez por sesión y se cachea fuera del prompt.
- Lectura de modelo en `surgical` solo vía consulta acotada read-only; prohibida la lectura completa en ese intent.

## 4. Cómo medir (próxima pasada del skill)
- Por sesión: nº llamadas por intent, tokens in/out por intent, re-validaciones completas vs diferenciales, tamaño
  medio de contexto en `surgical`.
- Gate: `surgical` mediano por encima del umbral o `verify` con log completo ⇒ pasada `wasteful` con ejemplo.
- Benchmark: baseline (antes) vs primera promoción que aplique slices + baseline (después), en cualquier plantilla.

## 5. ¿Extender al resto de proyectos?
- Sí en modo barato (`sweep`: summaries + conteo por código de error). Deep-dive solo ante código no cubierto por
  A1–A10 del doc hermano. El coste es bajo y dice si los casos analizados son representativos u outliers.
