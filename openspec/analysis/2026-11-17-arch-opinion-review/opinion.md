---
title: "External architecture opinion under review (verbatim)"
status: source
---

# Source note (written by the orchestrator, not part of the opinion)

The text below is the verbatim architecture opinion the maintainer received from an
external AI, and it is the **object of this review**. It is not a specification and it is
not evidence.

Two properties matter when reading it:

1. Its `master.md` and `master.md+ 1` strings are that source's own citation markers, not
   part of the argument. Ignore them as citations; treat the prose as the claim.
2. It cites the documentation, not the code. So a claim it makes about how the system
   behaves is a claim about what `docs/documentation/master.md` says the system does.

The six numbered proposals in section 3 are referred to as **proposal A** through
**proposal F** throughout this review.

---

# Verdict of solidity and improvement proposals (verbatim)

La arquitectura de **cogNNitive** es conceptualmente muy sólida y resuelve de forma brillante el mayor problema de los flujos de trabajo actuales con agentes de IA: **la deriva (drift) y las alucinaciones silenciosas sobre archivos locales**.

## 1. Veredicto de solidez: ¿Qué está muy bien resuelto?

* **Separación estricta entre Evidencia Inmutable y Modelo:** La regla de que los archivos en `sources/import/` jamás se tocan ni se renombran y que la normalización ocurre en un *sidecar* (`_sidecar_NN.md`) es excelente. Garantiza auditoría real mediante hashes SHA-256 sin destruir el documento original.

* **Event Sourcing ligero mediante Changesets (`changes/`):** El modelo de *«el cambio es la única procedencia»* es un acierto arquitectónico mayor. En lugar de ensuciar los documentos Markdown con etiquetas de citas en cada línea (lo que rompe la legibilidad y genera conflictos constantes en Git), el documento mantiene solo el estado actual limpio y el historial/procedencia se deriva del log de cambios atómicos.

* **Motor único como fuente de verdad (`@cognnitive/nn-core`):** Centralizar el *parser*, *validator* y *resolver* en una librería pura y hacer que tanto el servidor MCP, el CLI y la consola HTML sean meros clientes evita que la lógica de negocio se fragmente.

* **Direccionamiento semántico en lugar de números de línea:** Usar `<id>@<slug>&<campo>` y anclas por encabezados (`@## Heading`) o punteros JSON/CSV hace que las citas sobrevivan a ediciones previas en el archivo.

* **La Consola Estática (`domaiNN_console.html`):** Generar un HTML autocontenido sin servidor ni dependencias para revisar *diffs* y navegar el grafo es una decisión pragmática estupenda para entornos locales y archivado.

## 2. Puntos débiles y focos de complejidad excesiva

* **Vocabulario inventado y barrera cognitiva altísima:** La convención estética de la doble `NN` (`domaiNN`, `kNNowledge`, `bluepriNNt`, `iNNfo`, `defiNNition`, `ageNNt`, `coNNtent`, `traNNsform`) junto con 4 niveles de metamodelado (L0 a L3) y docenas de reglas rígidas hace que la curva de aprendizaje sea vertical. Para un usuario o desarrollador externo, distinguir entre *defiNNition*, *iNNfo*, *bluepriNNt*, *kNNowledge* y *domaiNN* genera fricción innecesaria.

* **Rigidez extrema en las migraciones y evoluciones:** La filosofía de *«no hay migración in-place; si el layout es viejo o está roto, crea un dominio nuevo e importa el anterior como source»*, sumada a la prohibición de borrar modelos de instancia (`MODEL_WITHOUT_FILE` sin operación `remove_model`) y a la exigencia de uniformidad estricta de versiones de *bluepriNNts* en todo el dominio (`BLUEPRINT_VERSION_SKEW`), convierte el mantenimiento evolutivo en un proceso muy pesado.

* **Duplicidad de canales de ejecución (MCP vs. CLI de Skills):** Aunque la documentación justifica separar MCP (interactivo) de CLI (`nn-sources/scripts/index.js` para *batch*), en la práctica obliga al agente a gestionar dos paradigmas distintos, pasar rutas manualmente entre herramientas MCP y comandos de shell, y mantener sincronizados 24 tools MCP con múltiples scripts CLI.

* **Exceso de ceremonia en los Skills (Gates y Preflights):** Tener 8 skills con un *Front Controller* (`nn`), un *Preflight Gate* de 3 niveles (`nn-preflight`), un gestor de estado propio (`~/.agents/bootstrap-state.json`) y reglas estrictas sobre qué skill puede cargarse junto a otro consume una cantidad enorme de ventana de contexto del LLM antes de hacer trabajo útil.

* **Simulación de base de datos relacional sobre Markdown:** Al introducir almacenamiento distribuido (`storage:: distributed`), patrones de carpetas (`placement::`), claves foráneas (`reference`), integridad referencial estricta en movimientos (`move_model` rechazando referencias colgantes) y consultas (`query_units`), el sistema está reimplementando un motor de base de datos relacional sobre archivos de texto plano, asumiendo toda su complejidad pero sin transacciones ACID nativas del sistema de archivos.

## 3. Propuestas de mejora y simplificación

Si el objetivo es mantener la **trazabilidad, la validación determinista y la compatibilidad con Git**, pero haciendo el sistema mucho más ligero, mantenible y fácil de adoptar, aplicaría estas simplificaciones:

### A. Colapsar la jerarquía de 4 niveles a 2 niveles (Schema + Data)

* **Cómo está hoy:** Nivel 0 (`defiNNition`) → Nivel 1 (`iNNfo`) → Nivel 2 (`bluepriNNt`) → Nivel 3 (`kNNowledge`).

* **Simplificación:** Eliminar L0 y L1 como documentos dinámicos que se resuelven por URL en tiempo de ejecución. La gramática base del sistema (qué es un Concepto, un Campo o una Matriz) debe estar codificada directamente en el motor (`nn-core`) mediante **JSON Schema o Zod**.

* **Resultado:** Te quedas solo con **Esquemas (Blueprints)** y **Documentos (Knowledge)**. Eliminas el *Resolver* de cadenas de padres remotas, los fallos de red/caché (`TEMPLATE_CACHE_STALE`, `BLUEPRINT_UNRESOLVED`) y la mitad de la complejidad del validador.

### B. Sustituir el DSL propio de Markdown por Frontmatter YAML + Markdown estándar

* **Cómo está hoy:** Una sintaxis propietaria dentro del cuerpo Markdown (`# NN Concept`, `## NN Element: Title`, `slug:: value`, `key:: value`) que requiere un *parser* AST a medida y reglas de formato estricto (como `.gitattributes` con `* -text` para que los saltos de línea no rompan hashes).

* **Simplificación:** Usar **YAML Frontmatter estándar** para todos los datos estructurados (metadatos, campos, referencias, relaciones) y dejar el cuerpo del archivo `.md` exclusivamente para prosa libre en Markdown estándar.

* **Resultado:** Cualquier librería estándar de YAML/Markdown (o herramientas externas como Obsidian, Pandoc o GitHub) puede leer y editar los datos sin romper la sintaxis. Además, el *hashing* para detectar *drift* puede hacerse sobre el objeto JSON serializado canónicamente (Canonical JSON) en lugar de sobre los bytes crudos del archivo, eliminando para siempre los problemas de saltos de línea (`CRLF` vs `LF`) entre Windows y Linux.

### C. Simplificar el almacenamiento: Un archivo = Una entidad (o carpeta = colección)

* **Cómo está hoy:** Modos `compact` vs `distributed` por concepto, reglas `placement:: "{container}/assets/{slug}/"`, operaciones `extract_instance`, y una matriz gigante de errores de layout (`PLACEMENT_MISMATCH`, `INSTANCE_NAME_MISMATCH`, `MIXED_INSTANCE_MODEL`).

* **Simplificación:** Adoptar una convención única basada en rutas del sistema de archivos (similar a Next.js App Router o Astro Content Collections):

  * El ID de un documento es **siempre su ruta relativa** sin extensión (ej. `series/villabotijos/intro`).

  * Si un concepto tiene sub-elementos simples, van dentro de su YAML. Si son entidades complejas con ciclo de vida propio, son archivos `.md` dentro de una subcarpeta.

  * Permitir `remove_model` (borrado lógico o archivado en `_archive/` mediante changeset) para cerrar el ciclo CRUD completo.

### D. Unificar MCP y CLI en un solo binario/servidor

* **Cómo está hoy:** 24 herramientas en `nn-mcp` + scripts dispersos en `skills/nn-sources/scripts/index.js` + `skills/nn-update/scripts/...`.

* **Simplificación:** Exponer las operaciones de ingesta (`scan`, `cognitivize`, `sync`) directamente como herramientas de `nn-mcp` (o hacer que el MCP invoque internamente a `nn-core` para todo) y reducir las herramientas MCP de 24 a unas **8–10 primitivas ortogonales** (`domain_status`, `source_ingest`, `read`, `query`, `propose_change`, `apply_change`, `validate`, `render_console`).

### E. Reducir los 8 Agent Skills a 2 o 3 Skills enfocados en intención

* **Cómo está hoy:** 8 skills con un enrutador (`nn`), un preflight obligatorio y un gestor de dependencias propio (`skills-manager.js`) que reinventa `npm`.

* **Simplificación:**

  1. **Eliminar el gestor de skills propio:** Distribuir el paquete como un único paquete `npm` (`npx @cognnitive/cli` o servidor MCP global) que ya incluya todo lo necesario.

  2. **Consolidar los Skills:**

     * `cognnitive-core` (Ingesta de fuentes, modelado, changesets y validación).

     * `cognnitive-ui` (Generación de consola, sitios Docsify y presets visuales).

  3. **Preflight silencioso:** Que el servidor MCP ejecute las comprobaciones de entorno al arrancar y devuelva advertencias solo si algo falla, ahorrando al LLM tener que ejecutar scripts de diagnóstico y saludos protocolarios en cada sesión.

### F. Normalizar el vocabulario

* Abandonar la marca `NN` dentro de los nombres técnicos de archivos y conceptos (`kNNowledge`, `bluepriNNt`, `domaiNN`, `_NN.md`). Usar nombres estándar de la industria (`domain.md`, `schemas/`, `knowledge/`, `sources/`, `changes/`). Esto reduce drásticamente las alucinaciones de los LLMs al escribir rutas o nombres de claves (los modelos tienden a autocorregir `kNNowledge` a `knowledge` o `domaiNN` a `domain` si no se les recuerda constantemente en el *prompt*).

## Summary of impact (verbatim table, flattened)

| Aspect | Current architecture | Simplified architecture |
|---|---|---|
| Levels of abstraction | 4 dynamic levels (L0–L3) | 2 levels (JSON/YAML schema + MD data) |
| Data format | Custom DSL (`key:: value`, `# NN`) | Standard YAML frontmatter + Markdown |
| Change detection | Raw byte hash (CRLF sensitive) | AST / canonical JSON hash |
| Tool surface | 24 MCP tools + several CLIs | ~10 MCP tools unified in `nn-core` |
| Agent orchestration | 8 skills + preflight gate + own lockfile | 2 skills + automatic validation in MCP |
| LLM friction | High (`NN` spelling, rigid path rules) | Low (standard conventions, paths as ids) |
