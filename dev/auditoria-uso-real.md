# Auditoría de uso real — sesiones de usuarios iNNfo (semana 2026-09-02 → 2026-09-09)

> Living doc. Se amplía en cada pasada del skill `nn-usage-audit`.
> Convención: solo la línea `Evidencia:` puede citar worlds, modelos, archivos y casos concretos con IDs Engram `#NNN`.
> Todo lo demás (títulos, severidad, mejoras, refactor) está redactado en términos genéricos: Nivel 1 (spec),
> Nivel 2 (plantilla), Nivel 3 (modelo), cualquier world. Ninguna mejora depende de un modelo o space concreto.
> Fuentes: Engram `all_projects` (58 sesiones / 993 obs).

## Alcance analizado (evidencia concreta — único lugar con nombres propios)

- **Proyecto 1 – finanzas/proyección** (deep-dive principal): modelo financiero Nivel 2 + Nivel 3 y artefacto HTML
  de proyección a N meses; evolución en 6+ iteraciones (charts, tabs, colapso, pills, MODEL_DATA, CSV, heat scale,
  columnas mínimas); summary y procedimiento + scaffold validados.
- **Proyecto 2 – tutorías** (segundo modelo): importación de ~40 transcripciones como fuentes trazables, mapeo a
  ~16 elementos del modelo maestro, borrado de fuente obsoleta + entrada de proveniencia.
- **Puente uso→producto**: promoción de un workspace de usuario a plantilla oficial (spec + procedure + assets +
  harness portable + sample canónico), cableado en plantillas compuestas y alta en el wizard.
- **Huecos de observabilidad**: ciertos proyectos solo aparecen como nombres dentro de otros (sin summaries propios);
  algunos flujos (pipelines, coach) no tienen memorias — es un dato en sí.

## A. Bugs / problemas de APLICACIÓN (genéricos; evidencia entre paréntesis)

### A1. Scaffold de modelo emite frontmatter de versión distinta a la del spec padre
- **Evidencia**: workspace en versión menor, `init_model` generó frontmatter de versión mayor; corrección manual (#910).
- **Severidad**: media-alta. Rompe el primer paso del happy path crear-modelo, en cualquier plantilla.
- **Estado**: no consta fix; probable parche manual recurrente.
- **Mejora integrada**: el scaffold infiere la versión del spec padre o la acepta explícita; jamás emite una versión
  distinta a la resuelta. Tests: scaffold contra specs de ambas versiones.

### A2. Campo `reference` multivalor: pérdida silenciosa de datos
- **Evidencia**: claves repetidas sobrescritas (solo queda la última); sintaxis con doble WikiLink rechazada; único
  formato válido array inline sin dobles corchetes; `[[A]], [[B]]` tratado como un solo nombre dangling (#910, #990).
- **Severidad**: alta. Pérdida silenciosa + mensaje que no explica la alternativa (matriz N:M).
- **Estado**: documentado, no consta fix de parser.
- **Mejora integrada**: una sola sintaxis canónica multivalor aceptada en TODOS los campos reference de cualquier
  Nivel 3; el validador falla con código + hint ("usá array inline o matriz N:M") y sugiere migración automática.

### A3. Marca BOM / escritura con encoding incorrecto rompe el frontmatter
- **Evidencia**: archivos con BOM rompen el validador; escritura con encoding por defecto corrompe acentos; flag sin
  salto de línea une líneas (#910).
- **Severidad**: media. Footgun de toolchain, independiente del modelo.
- **Estado**: workaround "usar siempre la herramienta de escritura" — parche de proceso, no fix.
- **Mejora integrada**: validador/MCP tolera BOM (strip + warning, no error duro); las skills definen un único comando
  canónico de escritura para `.md`; fixture con BOM en tests.

### A4. Validación de procedimientos: errores crípticos, reglas dispersas
- **Evidencia**: colisión de nombres Tool/Artifact; `tool::` apuntando a tipo incorrecto; matrices con value sets
  cerrados por par; aviso informativo que confunde como error (#967).
- **Severidad**: media. Frena el flujo "conversación → procedimiento → plantilla" en cualquier plantilla.
- **Estado**: aprendido por iteración, no consta mejora de mensajes.
- **Mejora integrada**: cada regla con código + fix sugerido inline; avisos informativos degradados a `info`.

### A5. Plantilla sin procedimientos ejecutables declarados
- **Evidencia**: plantilla canónica sin bloque ejecutable (solo Concept descriptivo); `list_template_procedures` vacío (#966).
- **Severidad**: media. El usuario descubre tarde que "no hay nada ejecutable".
- **Estado**: abierto (un experimento movió un procedimiento a contenido declarativo, #874).
- **Mejora integrada**: toda plantilla declara su bloque de procedimientos aunque sea vacío explícito + hint; el wizard
  lo anuncia. Aplica a cualquier Nivel 2.

### A6. El resolver escribe caché dentro del árbol del repo
- **Evidencia**: padres auto-cacheados bajo el árbol de la plantilla; borrado manual antes de commitear (#990).
- **Severidad**: media. Contaminación + riesgo de commitear basura en cualquier workspace.
- **Mejora integrada**: caché a directorio temporal por defecto; escritura in-place solo con flag explícito; el gate
  de integridad lo detecta, pero el MCP no debería generarlo ahí.

### A7. Reglas L1/L3 confusas (válido pero mal ubicado vs reservado)
- **Evidencia**: tipos L1 válidos rechazados por ubicación; campos reservados L3 usados como campos normales; mensajes
  que no distinguen ambos casos (#990).
- **Severidad**: media-baja. Afecta a cualquier modelo.
- **Mejora integrada**: mensaje que distingue ambas clases con ejemplo de fix inline.

### A8. Ruido de validación pre-existente que oculta errores reales
- **Evidencia**: mismos errores de frontmatter ajenos al cambio, sesión tras sesión; choques de composición y
  colisiones de slugs pre-existentes; hunks ajenos en manifest (#870, #990).
- **Severidad**: alta para confianza. El usuario aprende a ignorar el validador.
- **Mejora integrada**: baseline de errores conocidos — solo los NUEVOS entran al output; lo pre-existente va a
  backlog linkeado. Vale para cualquier world.

### A9. Artefacto generado por evolución iterativa acumula parches sin scaffold
- **Evidencia**: 6+ parches sueltos sobre un artefacto HTML (~600 líneas): nº de series del gráfico vs datos
  (`TypeError length`), motor de utilidades CSS que no procesa funciones de tema/variables en `<style>` plano,
  preflight que fuerza `display:block` en SVGs, inputs con ancho por defecto que ensanchan columnas, escalas de
  color y formato compacto añadidos a posteriori, regla de evolución que deshabilita un input según modo (#921,
  #927, #944, #939, #937, #966); resueltos puntualmente + scaffold ad-hoc con datos abstraídos y harness (#967).
- **Severidad**: media. Cada fix es correcto; el problema es la ausencia de scaffold reutilizable.
- **Mejora integrada (genérica, vale para cualquier artefacto derivado de cualquier modelo)**: todo artefacto nace
  de un scaffold oficial — datos abstraídos en un único bloque versionado + badge de frescura, tokens de diseño
  literales (sin funciones del motor CSS en estilos planos), paleta con fallbacks documentados, harness de
  verificación parametrizado (root/archivo/puerto) con exit 0 como gate. Ningún artefacto nuevo sin pasar por
  ese scaffold.

### A10. Mapeo manual N fuentes → M elementos: frágil y no repetible
- **Evidencia**: ~40 fuentes importadas/normalizadas/mapeadas a mano con confianza alta/baja, dudosas excluidas en
  silencio, 1 elemento sin fuente, varias fuentes sin elemento (#864, #870).
- **Severidad**: media. Patrón recurrente en cualquier world con fuentes externas.
- **Mejora integrada**: comando genérico de mapeo con scores que propone pares y deja las dudosas en cola de
  revisión en vez de excluirlas en silencio.

## B. Problemas de DESARROLLO (genéricos; evidencia entre paréntesis)

### B1. Sesiones concurrentes comparten working tree
- **Evidencia**: hunks ajenos en manifest/MCP de agentes hermanos; rama robada, stash ajeno, `main` que avanza
  mid-task (#990; motivo de existencia del skill de guarda).
- **Estado**: mitigado (consent gate, nunca staging global, stash solo propio), no eliminado.
- **Mejora**: disciplina de rama de integración + commits `wip:` en vez de dirty tree multisesión; barrido de ramas
  fantasma antes de cada release. Independiente del contenido del cambio.

### B2. Rot pre-existente bloquea promociones limpias
- **Evidencia**: choques de composición y colisiones de slugs que quedan para "cambios separados" (#990).
- **Mejora**: nunca mezclar fix-rot con promoción de plantilla; issues separados con repro mínimo.

### B3. Paridad manifest/registry/tags frágil
- **Evidencia**: versiones publicadas, catálogo y manifiesto deben moverse juntos; URLs remotas solo resuelven tras
  el merge (#990).
- **Mejora**: un solo comando release atómico (todo o nada) como único camino a `main`.

### B4. Deploy solo vía CI + entorno local con conflictos
- **Evidencia**: puertos ocupados, despliegue solo vía pipeline (#966 e instrucciones de sesiones hermanas).
- **Mejora**: documentado en skill; harness con puerto parametrizable. Sin código específico.

## C. Casos ya resueltos (evidencia — instancias, no norma)
- Promoción de workspace de usuario a plantilla oficial (spec + procedure + assets + harness + sample canónico).
- Alta de la nueva plantilla en el wizard.
- Procedimiento de generación de artefacto validado + scaffold reutilizable.
- Truco pre-publish aislado (copiar spec + sample a dir temporal y validar con root temporal).

## D. Refactor de parches → solución cohesiva (priorizada, genérica)
1. **P0 — Validador con mensajes accionables + baseline** (cubre A2, A4, A7, A8).
2. **P0 — Frontmatter robusto** (A1, A3): scaffold version-aware + BOM-strip + escritura canónica.
3. **P1 — Caché del resolver a temporal** (A6) + modo aislado como flag oficial.
4. **P1 — Scaffold oficial de artefactos** (A9): datos abstraídos + harness como gate.
5. **P2 — Mapeo con scores + cola de revisión** (A10) + declaración de procedimientos en toda plantilla (A5).
6. **Proceso**: guarda de integración + gate de integridad + release como único camino a `main`.

## E. Pregunta abierta (para el cierre)
- ¿Extender al resto de proyectos? Sí en modo barato (summaries + conteo por código de error); deep-dive solo ante
  un código no cubierto por A1–A10. Detalle en `dev/eficiencia-llm.md`.
