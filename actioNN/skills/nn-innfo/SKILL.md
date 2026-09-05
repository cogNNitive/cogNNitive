---
name: nn-innfo
version: "V_0-1-1"
last_updated: 2026-09-03
metadata:
  source_type: "original"
  mcp: "innfo-mcp"
license: MIT
bundled_templates:
  - name: workspace_spec_NN
    path: templates/workspace_spec_NN.md
description: |
  Domain skill for creating, editing, validating, scaffolding, or discussing iNNfo models, templates, specializations, samples, or specification files. Includes the conversational Model Creation Wizard and Architecture Coach. Triggers: innfo, iNNfo, /nn-innfo, model, template, *_NN.md, procedures_V_0-1-0_NN.md.
  This includes but is not limited to:
  - Creating a new model step-by-step using templates (Business, Procedures, Organization, Blank)
  - Creating or editing any file matching *_NN.md
  - Authoring or modifying business models, procedure models, or any model following an iNNfo template
  - Creating, editing, or modifying templates or specializations under docs/templates/
  - Discussing the iNNfo V_0-2-0 specification, meta-templates, primitives, matrices, or naming conventions
  - Any conversation about how iNNfo works, how to use it, or how to structure iNNfo files
  - Executing procedures declared in a model
---

# iNNfo Skill

## 0. Activation Gate
Execute the canonical activation gate defined in `nn-preflight` (session greeting + deterministic preflight integrity check).

---

## Activation Contract

Activates when the user invokes `/nn-innfo`, mentions domain keywords `innfo`, `iNNfo`, `model`, `template`, references files matching `*_NN.md` or `procedures_V_0-1-0_NN.md`, or explicitly asks to:
- Create a new model step-by-step using templates (Business, Procedures, Organization, Blank).
- Create or edit any file matching `*_NN.md`.
- Author or modify business models, procedure models, or any model following an iNNfo template.
- Create, edit, or modify templates or specializations under `docs/templates/`.
- Discuss the iNNfo V_0-2-0 specification, meta-templates, primitives, matrices, or naming conventions.
- Execute procedures declared in a model.

This skill guides LLMs and agents in authoring, creating from scratch (wizard), editing, auditing, and validating **iNNfo-compliant files** (V_0-2-0 Meta-template specification with unified `NN` syntax: `# NN`, `## NN`, and `key:: value`).

**Resolution, validation, and mutation are delegated to the `innfo-mcp` server** — a deterministic engine wrapping `@cognnitive/innfo-core`. The agent does NOT hand-resolve spec chains, hand-validate models, or guess syntax when the MCP is available. See §1 (MCP Operating Model) and §7 (Delegation Contract).

> 🛡️ **Single Source of Truth & Zero Workspace Pollution**:
> 1. `iNNfo` repository is the **Single Source of Truth** for all templates and specs. Do NOT duplicate template files across repositories.
> 2. When resolving templates/specs without MCP: if a git fallback clone is required, the agent MUST clone into the system temporary directory (`$env:TEMP/innfo_tmp` or `~/.agents/tmp/`), read the required file, and **immediately delete the temporary folder**. The agent MUST NEVER clone git repositories or leave checkouts inside the user's workspace directory.
> 3. **Windows Network Resilience**: In Windows environments, do NOT execute bare `curl` in PowerShell (which aliases to `Invoke-WebRequest` and fails SSL handshakes). Use `curl.exe` explicitly, Node.js native fetch (`node -e "fetch(...)"`), or git archive.
> 4. **Web GUI & Preview Integration**: When asked to preview a model or element in Web GUI environments, prefer generating structured Markdown cards with interactive deep links (`https://cognnitive.com/innfo/app/workspace?view=editor&model={model_id}#{element_id}`) or inline SVG diagrams instead of un-sanitizable `<iframe>` tags.

---

## 0. Entry Menu & Conversational Model Creation Wizard

### 0a. Entry Menu (initial options)

When the skill is activated or the user is undecided about what to do, present the entry menu:

- **[a] (Recommended)** Create a new model (Conversational Wizard)
- **[b]** Edit / extend an existing model
- **[c]** Validate a model with MCP
- **[d]** Analyze consistency and robustness (Architecture Coach) — audit the model across formal, logical, semantic, and solidity layers (§8c)
- **[x]** Execute a model procedure — list procedures declared in the model and execute the chosen one
- **[y]** Cancel / help

*Notice: You can select one option or a combination (e.g. A and B).*

### 0a-bis. Active Model Context & Selection Gate (MANDATORY for [b], [c], [d], [x])

Before executing options **[b]**, **[c]**, **[d]**, or **[x]**, the agent MUST ensure there is an active model in context (`active_model_path`).

1. **Verify Session Context:** Check if a model is currently being edited/active in the session.
2. **Dynamic Discovery:** If no model is active, call `innfo-mcp_list_models` to scan the workspace:
   - **If 0 models found:** Inform the user that no models exist in `models/` and suggest creating one (redirecting to option **[a]**).
   - **If 1 model found:** Present it and ask for confirmation: *"I detected a single model: `models/{ModelName}_NN.md`. Do you want to work with this one?"*. Upon confirmation, set it as the active model (`active_model_path`) and proceed.
   - **If multiple models found:** Present a numbered list of all models found and ask the user to select one: *"Multiple models detected. Please select which one you want to work with:"*. Set the selected file as `active_model_path` and proceed.
3. **Session Persistence:** Once a model is selected or created, save its path in context. Subsequent actions (validation, edits, audits) MUST default to this active model. To switch models, the user can explicitly ask to "switch model" or select the change option in the quick actions menu.

---

### 0b. Proactive Discovery (Option A)

If the user wants to create a model but is unsure which template fits best:

1. Ask 2-3 brief diagnostic questions:
   - Is the goal to structure a business model / value proposition, a step-by-step operational process, or an organizational / team structure?
   - Do you have source documents in `sources/nn/` to extract information from, or are we starting from scratch?
2. Recommend the optimal template with a 1-sentence technical justification and mark option `[a]` with `(Recommended)`.

---

### 0c. Model Creation Wizard: Phase A (Template) + Phase B (Model)

When the user asks to "create a new model", "start a model from scratch", or selects option [a]:

Creating **any** model — with a canonical template, custom template, or without a template — always follows two separate phases. First, the **Template (Level 2)** is designed and approved (Phase A), then the **Model (Level 3)** is designed and approved (Phase B). No file is written until the user confirms the plan for the corresponding phase.

#### Phase A — Template Design (Level 2)

**A1. Base Selection:**
- **[a] (Recommended)** Business Model 🏢
- **[b]** Procedures Model 📋
- **[c]** Organization Model 👥
- **[d]** Blank / 100% custom design from scratch
- **[x]** Cancel
*(Notice: You can select one option or a combination (e.g. A and B))*.

**A2a. If a canonical template was selected ([a]/[b]/[c]):**
Resolve the template with `innfo-mcp_get_template` and display an informative summary of the Concepts, Fields, Matrices, and Markers it already defines. Then offer:
- **[a] (Recommended)** Use template as-is, without modifications
- **[b]** Customize it (create specialization — see §9)
- **[x]** Cancel

> ⚠️ If the user chooses to customize, warn explicitly: **modifying a canonical template is not recommended unless the reason is very clear** — modifying it unnecessarily reduces compatibility with the rest of the iNNfo ecosystem which assumes that template unchanged.

**A2b. If [d] Blank was selected, or the user confirmed customization in A2a [b]:**
Design from scratch, in this order, consulting `innfo-mcp_get_spec` for the exact grammar of each primitive (never invent it):

1. **Concepts**: which Concepts the template will have (the root categories of the model).
2. **Fields per Concept**, with their `type::` — apply the **Type Heuristic** (below) before assigning `string` to any field.
3. **Matrices**: which relationships between Concepts warrant a matrix — apply the **Matrix Heuristic** (below). Each Matrix Definition can declare `values::` (set of allowed cell values), `widget::` (`boolean` | `cycle` | `scale` | `set` | `text`), and `widget_config::` (JSON object: `scale`→`{min,max,step}`, `cycle`→`{order}`, `set`→`{max_selections}`, `text`→`{max_length}`). `widget:: scale` without `min`/`max` in `widget_config` is a validation ERROR.
4. **Markers**: ask explicitly — *"Does this template need Markers (reusable tags/states, e.g. for matrix cells or cross-cutting Element classification)? If so, which ones?"* Do not assume they are not needed just because the user did not mention them. Each Marker Definition declares:
   - `applies_to:: [Element]` (default), `[Concept]`, or `[Element, Concept]` — which entities can be scored. Scoring a row whose scope is not in `applies_to` is a validation ERROR.
   - `values:: / widget:: / widget_config::` — same vocabulary as Matrix Definition (omit `values` for an open numeric marker bounded only by `widget_config`).
   - `symbol / icon / color / weight` — presentational; `weight` is NOT a score.
5. **`includes` (additive composition, optional)**: if the template should reuse Concepts/Fields/Markers/Matrices from other *peer* templates, declare them in frontmatter as `includes:` with entries `{ name, url }`. This is horizontal composition (template ∪ template), additive: NOTHING is overridden or deleted, and a name collision between two sources is an ERROR. This is a different axis from `parent_spec` (vertical chain to L1) and `specializes` (inert). See §9.

##### Type Heuristic (String vs. Reference)

Before assigning `type:: string` to a field, ask: **does the value of this field identify or point to another Element or Concept in the model (existing or to be created)?**
- If yes → `type:: reference`, never `string`.
- Red flag in field name: `owner::`, `client::`, `lead::`, `category::`, `location::`, `vendor::`, `assigned_to::`, and similar — names that point to an entity, rather than describing an inherent attribute of the Element itself.
- If the referenced entity is not yet a modeled Concept/Element, do not hide it as `string`: propose creating the corresponding Concept/Element before typing the field.

##### Matrix Heuristic (Matrix vs. Reference)

- 1:N relationship with no cross-attributes → a `reference` field suffices.
- N:M relationship (both sides repeat) → matrix.
- Any relationship where each cross-point needs its own state/type/attribute (e.g. `X` / `-` / `primary`) → matrix, typically with Markers.
- Quick test: if you can count the same Element more than once on each side of the relationship, it is a strong signal for a matrix.

**A3. Consolidated Template Plan (mandatory gate):**
Before writing the template file, present EVERYTHING together in a single block — Concepts, Fields with types, Matrices, Markers — and ask if anything needs adjustment:

```markdown
📋 Proposed Template Plan:
- Concepts: Stakeholders, Segments, Offerings
- Fields:
  - Stakeholders: name (string), owner (reference), budget (number)
  - Offerings: name (string), category (reference), price (number)
- Matrices: Stakeholders × Offerings (N:M, markers: interested/buyer/dismissed)
- Markers: interested, buyer, dismissed

Confirm this design, or would you like to adjust anything before creating the template?
- [a] (Recommended) Confirm and create template
- [b] Adjust Concepts/Fields/Matrices/Markers
- [x] Cancel
```

Only upon confirming [a] is the template file written: `<Template>_V_0-1-0_spec_NN.md` if completely new, or `<Model>_<Template>_V_x-y-z_spec_NN.md` if specializing an existing base (see §9).

---

#### Phase B — Model Design (Level 3)

Once the Phase A template is approved (or confirmed as-is):

**B1. Elements and Crossings Plan (mandatory gate):**
Present what Elements will be created for each Concept, and what matrix crossings will be populated, BEFORE writing content:

```markdown
📋 Proposed Model Plan:
- Stakeholders: Enterprise Customer, Pilot Customer
- Offerings: Basic Plan, Premium Plan
- Matrix Stakeholders × Offerings: Enterprise Customer↔Premium Plan (buyer), Pilot Customer↔Basic Plan (interested)

Confirm this structure, or would you like to adjust any Element or crossing?
- [a] (Recommended) Confirm and continue
- [b] Adjust Elements or crossings
- [x] Cancel
```

**B2. Co-creation Mode (Incremental vs Batch)**:
With structure approved, offer the drafting mode:
- **[a] (Recommended) Step-by-Step Co-creation:** We interact concept by concept, Element by Element.
- **[b] Full Generation:** The agent drafts the complete draft in a single file for subsequent audit, following the plan approved in B1.

**B3. Model Naming & Scaffolding**:
Prompt for `{ModelName}` and create `{ModelName}_V_0-1-0_{Template}_NN.md` with workspace structure (`models/`, `sources/nn/`, `procedures/`, `artifacts/`, `index.md`). When creating a new workspace, emit `workspace_id: "<folder-slug>"` in the entrypoint's frontmatter (a stable slug derived from the workspace folder name, so the workspace keeps a correlatable identity across renames/moves). This field is optional and unvalidated — omit it for existing workspaces rather than retrofitting one.

**B4. Validation & Visual Checklist**:
Validate via `innfo-mcp_validate_model` and output the Visual Expectation Checklist (§12).

---

## Greeting Protocol (MANDATORY)

When this skill is activated, the agent MUST print exactly:

```
🔧 You're using skill: nn-innfo (🧠)
```

as its very first output — before any questions, analysis, or tool calls. Session-scoped: only once per conversation. After the greeting, proceed with the capabilities relevant to the current request.

---

## Core Concepts & Single Source of Truth

> [!NOTE]
> **El servidor MCP (`innfo-mcp`) y las especificaciones canónicas son la ÚNICA fuente de verdad (SSOT) para la sintaxis y tipos de datos.** El agente NO duplica reglas gramaticales de memoria; las consulta dinámicamente vía MCP (`innfo-mcp_get_spec` / `innfo-mcp_get_template`).

### Resumen de Niveles iNNfo (V_0-2-0)

| Nivel | Rol | Sintaxis y Estructura |
|---|---|---|
| **0** | Meta-especificación (`defiNNe`) | Define las meta-reglas de especificación. |
| **1** | Especificación Concreta (`iNNfo`) | Metaplantilla Nivel 1. Define las 4 primitivas raíz (`Concept Definition`, `Field Definition`, `Matrix Definition`, `Marker Definition`). |
| **2** | Plantilla (Template / Especialización) | Documento iNNfo con frontmatter ligero (`level: 2`). El cuerpo instancia las 4 primitivas raíz como elementos Markdown. **PROHIBIDO poner `concepts: []` o `fields: []` en el YAML frontmatter.** |
| **3** | Modelo de Datos | Instancia los conceptos y campos definidos por su plantilla madre (`parent_spec`). |

---

## 1. MCP Operating Model

El servidor `innfo-mcp` expone 13 herramientas deterministas basadas en `@cognnitive/innfo-core`.

| Herramienta | Propósito |
|---|---|
| `list_models` | Escanea el directorio buscando modelos iNNfo válidos. |
| `read_model` | Parsea un modelo a AST / JSON estructurado. |
| `get_spec` | Resuelve dinámicamente la especificación Nivel 1. |
| `get_template` | Resuelve dinámicamente la plantilla Nivel 2 y sus primitivas. |
| `validate_model` | Ejecuta la validación sintáctica y de esquema determinista (con diagnostico `(searched: ...)` cuando la cadena de padres no resuelve). |
| `validate_model_url` | Valida un modelo desde una URL sin escribirlo en disco. |
| `validate_template` | Valida una plantilla Nivel 2 contra su especificación Nivel 1 madre. |
| `apply_change` | Ejecuta mutaciones deterministas (agregar campo, renombrar, `bump_version`, etc.). |
| `list_templates` | Lista plantillas Nivel 2 en workspace, caché global y skills instalados. |
| `hydrate_template` | Copia de forma atómica e inmutable una plantilla Nivel 2 al workspace. |
| `prune_orphaned_specs` | Analiza alcanzabilidad y purga specs huérfanas con respaldo en zip. |
| `list_template_procedures` | Descubre procedimientos SOP transitivamente a través del árbol de `includes` (profundidad 10). |
| `list_template_skills` | Descubre skills de agente transitivamente a través del árbol de `includes` (profundidad 10). |

**Regla de Oro:** La URL de la especificación/plantilla siempre proviene de `parent_spec.url` o del usuario. Nunca hardcodear ni inventar URLs.

---

## 2. Indicación Canónica de Especificaciones

URLs estables de referencia (la versión va en el nombre del archivo — `main` ya está content-pinned):
- **iNNfo (Nivel 1):** `https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-2-0_NN.md`
- **Business (Nivel 2):** `https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/business/business_V_0-2-0_NN.md`
- **Procedures (Nivel 2):** `https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/procedures/procedures_V_0-2-0_NN.md`
- **Organization (Nivel 2):** `https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/organization/organization_V_0-2-0_NN.md`

### Regla de `parent_spec.url` en Modelos Nivel 3

1. `parent_spec.url` de un modelo Nivel 3 debe ser una URL **ESTABLE (http/https)** que apunte a la plantilla Nivel 2, o un **path relativo al workspace** (ej. `specs/MiPlantilla_V_0-1-0_spec_NN.md`).
2. **PROHIBIDO usar paths absolutos de Windows** (ej. `C:/Users/.../MiPlantilla_spec_NN.md`): rompen la resolución en el Modeler (fetch sobre ruta local) y en el MCP. El resolver de `innfo-mcp` (`resolver-node.ts`) busca la plantilla únicamente en `specs/` (recursivo) del workspace; la forma canónica es la URL http estable.
3. Después de fijar `parent_spec.url`, verificar SIEMPRE la resolución (ver §5, pre-chequeo de cadena de padres) antes de dar por listo el modelo.
4. **Los paths relativos se resuelven contra la raíz del servidor MCP** (la variable de entorno `INNFO_MODELS_DIR` o el cwd del proceso al iniciar el server), NO contra la carpeta del archivo del modelo. Por lo tanto, para validar un workspace con paths relativos, la raíz del MCP DEBE ser la raíz del workspace; los overrides `root:` solo aplican donde la herramienta los acepta (`validate_model` con `root`, `get_spec`/`get_template` con `url`).
5. **El resolver AUTO-CACHEA cada padre resuelto** (local o remoto) en `<workspace>/specs/`, bajo el nombre de archivo canónico versionado del propio documento (write-once: si ya existe un archivo con ese nombre, nunca lo sobreescribe). No hay un directorio de caché separado — `specs/` es la única búsqueda local, recursiva, relativa al `root` del servidor MCP. (Nota: `.spec-cache/` y `.specs/` solo los escanea, como heurística adicional para un aviso de versión, el editor en el navegador — no forman parte de la resolución real del MCP; no copies archivos ahí esperando que el MCP los use.) Si una resolución falla, se debe verificar que el `root` del MCP apunte a la raíz del workspace para que resuelva los paths relativos correctamente. NUNCA copies archivos a mano en `specs/`, deja que el resolver los sincronice.

---

## 4. Protocolo de Proveniencia (`sources::`)

1. **Carácter Opcional:** `sources::` es una propiedad de trazabilidad **OPCIONAL**. No invalida sintácticamente un modelo de Nivel 3 si no está presente.
2. **Fuentes de Origen:** Las fuentes ingeridas se almacenan en la carpeta `sources/nn/` (mismas subcarpetas que `sources/original/`, sin aplanar). No existe carpeta `raw/` ni sistema de IDs `src-xxx`.
3. **Gramática exacta:**
   ```
   sources:: <ref>
   sources:: [<ref>, <ref>, ...]

   <ref>  ::= sources/nn/<ruta-relativa>.md( #<ancla> )?
   <ancla> ::= L<n> | L<n>-L<m>
   ```
   - `<ref>` es SIEMPRE una ruta que empieza con `sources/nn/` y termina en `.md` — es la misma ruta que el archivo normalizado, nunca una ruta a `sources/original/` ni al documento fuente sin normalizar.
   - El ancla de línea es opcional. `L<n>` es una línea puntual, `L<n>-L<m>` un rango inclusive (ambos extremos incluidos), 1-indexado sobre el archivo `.md` citado — la misma numeración que ve un humano abriendo el archivo en un editor.
   - Sin ancla, la cita apunta al archivo completo. **Preferí citar el archivo completo antes que inventar un rango de líneas que no verificaste** — nunca adivines números de línea.
4. **Un solo valor va sin corchetes.** Los corchetes `[...]` se usan ÚNICAMENTE cuando hay 2 o más referencias — no envuelvas un valor único en `[...]`, es ruido visual innecesario:
   ```markdown
   ## NN Stakeholders: Cliente Enterprise
   sources:: [sources/nn/entrevista_cliente.md#L15-L30, sources/nn/notas.md#L4]
   relationship_model:: B2B Long-term

   ## NN Stakeholders: Cliente Piloto
   sources:: sources/nn/notas.md#L20-L25
   relationship_model:: Trial
   ```
5. **Granularidad: a nivel de elemento, no de afirmación individual.** `sources::` cubre el conjunto de fuentes que respaldan TODO el elemento (todos sus campos en conjunto) — no hay mecanismo de cita por campo o por frase dentro de un modelo de dominio. Si distintos campos de un mismo elemento vienen de fuentes distintas, listá la unión de todas en el único `sources::` del elemento. La cita a nivel de afirmación individual (mediante footnotes estándar `[^1]` o formatos bibliográficos) es un mecanismo aparte, usado solo dentro de artefactos generados a partir del modelo (ver `nn-trannsform/SKILL.md` §4) — nunca dentro de un `*_NN.md`.
6. **Sin duplicados ni referencias vacías.** No repitas la misma `<ref>` dos veces en la misma lista. Si no hay ninguna fuente real que citar, omití el campo entero — no escribas `sources:: []` ni un valor placeholder.
7. **Instrucción Conversacional:** Si el proyecto cuenta con archivos en `sources/nn/`, el agente debe sugerir incluir `sources::`. Si es un modelo greenfield/creativo desde cero, el agente NO solicita ni exige proveniencia. En ambos casos aplica la regla general del skill: nunca inventés ni un `<ref>` ni un contenido que no esté verificablemente presente en el archivo citado.

---

## 5. Instrucciones de Operación y Flujo MCP

1. Obtener la plantilla con `innfo-mcp_get_template({ url })`.
2. Present concepts to the user using the format with `[a] (Recommended)`.
3. Redactar el cuerpo usando la sintaxis unificada `# NN <Concept>`, `## NN <Concept>: <Element>`, `key:: value`.
4. Validar el modelo con `innfo-mcp_validate_model({ content })`.
5. **Pre-chequeo de cadena de padres (OBLIGATORIO antes de reportar listo):** resolver la cadena de padres con `innfo-mcp_get_template({ model_id })` (o `{ url }`) ANTES de declarar el modelo como listo. Si la plantilla NO se resuelve (`Template could not be resolved` / `PARENT_RESOLUTION_FAILED`):
   - NO reportar el modelo como listo.
   - Avisar que el template quedó sin resolver, mostrando el `parent_spec.url` problemático.
   - Leer el nuevo diagnóstico accionable `(searched: ...)` que devuelven `validate_model` / `get_template`: lista los directorios donde el resolver buscó el padre. Si los directorios buscados se ven mal (por ej. no apuntan a la raíz del workspace), el problema es la **raíz del MCP** (`INNFO_MODELS_DIR` o cwd del server), no el modelo: corregir la raíz/URL y revalidar (ver §2, regla 4).
   - Ofrecer corregirlo: URL estable http/https o path relativo al workspace (nunca path absoluto de Windows — ver §2).
6. Al finalizar, mostrar el **Checklist de Expectativa Visual (§12)** y la sección de **Atajos de Navegación Contextual (§13)**.

#### Version bump atómico

Para subir la versión de un modelo Nivel 3 y su plantilla asociada (parent_spec), usar la operación `bump_version` del MCP — NO editar el frontmatter a mano:

```
innfo-mcp_apply_change({
  id: "<model_id>",
  op: "bump_version",
  args: { 
    version: "V_0-5-0",
    parent_version: "V_0-5-0" // Optional: to re-version and rename the associated template
  }
})
```

- **Automated Behavior**:
  1. Updates `model_version` in the frontmatter and renames the model file atomically.
  2. If `parent_version` is provided, physically renames the local template file, updates its `spec_version` (in frontmatter), updates `parent_spec.name`/`url` in the model frontmatter, and copies the renamed template to the `specs/` directory.
  3. Consistently updates references in workspace `index.md`.
  4. Everything is validated via pre-check before performing any write (if validation fails, aborts without writing).
- **Remaining manual checklist**: If the template was remote, remember to push it to its corresponding server or repository.

---

## 6. Seguridad en Renombrados e Integridad Referencial

Cuando se requiere renombrar un Concepto o Elemento:
* **Delegación al MCP:** El agente NO realiza reemplazos manuales por búsqueda y sustitución a ciegas. Utiliza la herramienta `innfo-mcp_apply_change` con la operación de renombrado correspondiente (`rename_concept` o `rename_element`) para garantizar la actualización determinista de WikiLinks `[[Concepto]]`, matrices y referencias cruzadas.

---

## 7. Contrato de Delegación y Fallback

* **Con MCP disponible:** NUNCA resolver especificaciones a mano ni validar manualmente. Delegar en `innfo-mcp_get_spec`, `innfo-mcp_validate_model` y `innfo-mcp_apply_change`.
* **Modo Fallback (Sin MCP):** Inspeccionar archivos locales en disco y validar que se cumpla la sintaxis `# NN`, `## NN`, `key:: value` y el frontmatter YAML ligero de Nivel 3.

---

## 8. Protocolo de Creación de Campos y Preview de Cambios (Opción D)

Todo campo debe declarar un `type` explícito (`string`, `select`, `reference`, `markdown_inline`, `number`, `date`, `file`, `image`, `video`, `audio`).

> ⚠️ **Sintaxis de listas — NUNCA uses comillas sin corchetes.** Para cualquier campo con múltiples valores (`reference`, `sources::`, o cualquier otro tipo de lista), el único formato válido es `[a, b, c]` — sin comillas alrededor de cada valor. El formato `"a", "b"` (comillas individuales, sin corchetes envolventes) **corrompe el parseo silenciosamente**: el validador lo trata como un único string ilegible en vez de una lista, y termina reportando una referencia colgada genérica sin explicar la causa real. Si ves ese error y el campo tiene comillas sueltas sin `[...]`, la causa casi seguro es esta.

### Preview de Cambios con Diff (Opción D)
Antes de ejecutar cualquier cambio o mutación en el modelo, el agente DEBE presentar un breve resumen en lenguaje natural del cambio propuesto:

```markdown
📋 Preview del Cambio Propuesto:
- Concepto objetivo: Stakeholders
- Campo nuevo: presupuesto (tipo: number)
- Rationale: Almacenar el presupuesto asignado anualmente

¿Procedemos a aplicar esta modificación?
- [a] (Recommended) Confirm and apply change
- [b] Modify data type or configuration
- [x] Cancel
```

Al confirmar el usuario, ejecutar la mutación vía `innfo-mcp_apply_change` y re-validar con `innfo-mcp_validate_model`.

---

## 8b. Protocolo de Campos de Activos e Imágenes

* **Tipo Explícito:** Usar siempre `type:: image` para rutas o URLs de imágenes (nunca `string`).
* **Reglas de Especificación:** La regla de resolución de imagen principal (Rule 1) y la gramática del campo companion libre `<campo>_metadata` con citaciones CSL-JSON en una sola línea están normadas oficialmente en la Especificación Nivel 1 (`iNNfo_NN.md`).
* **Interacción del Agente:** Si el usuario incluye imágenes o activos con información de atribución, el agente sugiere incluir el campo `<campo>_metadata` con la cita CSL-JSON correspondiente.

---

## 8c. Análisis de Coherencia y Solidez — Modo "Coach de Arquitectura" (Opción C)

Cuando el usuario elige la opción `[d]` (Analizar coherencia), el agente asume el rol de **Coach de Arquitectura**:

1. Carga el modelo (`read_model`) y su plantilla (`get_template`).
2. Evalúa las 4 capas: **Corrección Formal**, **Coherencia Lógica**, **Coherencia Semántica** y **Solidez/Robustez**.
3. **Presentación con Impacto Funcional (Coach Mode):**
   No solo lista errores técnicos; explica el **riesgo de negocio/funcional** y ofrece la **solución en 1 clic**:

```markdown
🧠 Diagnóstico del Coach de Arquitectura:

1. ⚠️ [Coherencia Lógica] Referencia Rota
   - Hallazgo: El elemento `Cliente Enterprise` referencia a `DirectorComercial` que no existe.
   - Impacto Funcional: Romperá los enlaces del árbol de navegación en iNNfo Modeler.
   - Solución sugerida: Crear el elemento `DirectorComercial` o corregir el nombre.

Would you like me to apply the recommended fix automatically?
- [a] (Recommended) Apply suggested fix
- [b] View details of other findings
- [x] Ignore for now
```

---

## 8d. Protocolo de Relaciones y Sintaxis WikiLink en Campos Referenciales

Existen **4 formas formales de relación** en iNNfo (`hierarchy`, `evaluable_matrix`, `graph_edge`, `sequence`) y dos mecanismos de vinculación cruzada (campos `reference` y menciones contextuales):

1. **Jerarquía Taxonómica (`hierarchy`)**: Se declara **únicamente** mediante el anidamiento de listas con WikiLinks en el `# NN index` (`* [[Padre]]` -> `  * [[Hijo]]`).
2. **Campos Referenciales (`reference`)**: Cuando un campo tiene `type:: reference` en su definición de plantilla, su valor en el modelo Nivel 3 **DEBE encerrarse obligatoriamente entre corchetes WikiLink `[[...]]`** (ej. `location:: [[Salón-Comedor]]`). NUNCA escribir el valor como texto plano (`location:: Salón-Comedor`), ya que impide la detección del enlace entrante (*incoming reference*) en el editor.
3. **Relaciones N-a-M Evaluables (`evaluable_matrix`)**: Se expresan en bloques `# NN matrices:` para relaciones complejas o puntuadas entre conceptos.
4. **Menciones Contextuales**: Se escriben como WikiLinks `[[Elemento]]` dentro de la descripción en prosa Markdown.

**Instrucción al Wizard / Co-creación**: Durante la creación o edición de un modelo, el agente DEBE orientar o consultar al usuario según cómo desee estructurar las relaciones (jerarquía en `# NN index`, campo referencial `[[...]]` o matriz N-a-M).

---

## 8e. Protocolo de Etiquetas Libres (`tags::`)

1. **Etiquetado Ad-hoc en Nivel 3**: Todo Elemento o Concepto en un modelo Nivel 3 puede declarar la propiedad `tags::` para categorización libre *on the fly* sin necesidad de modificar la plantilla Nivel 2 ni definir un `Marker Definition` previo.
2. **Sintaxis de Listas**: Se escribe como una lista inline `tags:: [urgente, sprint-1, cliente-vip]` (o `tags:: urgente` para una sola etiqueta). Para múltiples valores, la sintaxis con corchetes `[...]` es OBLIGATORIA.
3. **Uso por el Agente**: Cuando el usuario solicite "filtrá o actuá solo sobre los elementos con la etiqueta X", el agente DEBE inspeccionar los campos `tags::` de cada Element/Concept para restringir su alcance únicamente a las entidades coincidentes.
4. **Coexistencia con Markers**: Los `tags::` son etiquetas livianas de texto plano. Si el usuario requiere icono, color, peso o participación en matrices comparativas, el tag se puede promover a un `Marker Definition` formal a Nivel 2.

---

## 9. Estrategia de Especializaciones

Cuando un modelo requiere conceptos o campos personalizados fuera de la plantilla base:
1. **NUNCA modificar** especificaciones publicadas en `specs/`.
2. Crear un archivo de plantilla de especialización `<Modelo>_<Plantilla>_V_x-y-z_spec_NN.md` con `level: 2`.
3. Apuntar la propiedad `parent_spec.url` del modelo Nivel 3 hacia el archivo de especialización.
4. **El `index.md` del workspace lista SOLO modelos Nivel 3.** Un archivo `_spec_NN.md` (plantilla Nivel 2 / especialización) NO debe listarse como modelo en `index.md`: se resuelve como plantilla vía `parent_spec.url` y se renderiza como nodo `spec:`, nunca como modelo del árbol de navegación.

> **Nota — Plantilla 100% nueva (sin base a especializar):** Cuando la Fase A (§0c) resulta en un diseño desde cero, sin ninguna plantilla canónica como base, el archivo se nombra `<Plantilla>_V_0-1-0_spec_NN.md` (sin prefijo `<Modelo>_`, porque no hay base que especializar). El resto del flujo —`parent_spec.url` del modelo Nivel 3, `index.md` listando solo modelos Nivel 3— aplica igual.

### 9-bis. `includes` vs. especialización

Son mecanismos distintos:

| | `includes` (composición) | Especialización (`parent_spec` a un `_spec_NN.md`) |
|---|---|---|
| Qué hace | Une aditivamente Definitions de plantillas *pares* | El modelo apunta a una plantilla propia que reemplaza a la canónica |
| Override | Prohibido (choque de nombres = ERROR) | La especialización redefine el cuerpo completo |
| Cuándo | Necesitás combinar varias plantillas canónicas tal cual | Necesitás cambiar/extender una plantilla concreta para un modelo |

Una plantilla **composite** (la que declara `includes`) es la que el modelo nombra en su `parent_spec`; las incluidas son plantillas standalone usadas como ingredientes, no una categoría inferior. `includes` solo es válido en Nivel 2 — un modelo Nivel 3 compone a través del `includes` de *su* plantilla, nunca del propio. Combinar `projects` + `organization` vía `includes` es ERROR mientras ambas declaren el Concept `Roles` (hay que renombrar en un lado).

---

## 10. Validación y Versionado Post-Edición

Tras editar un modelo:
1. Ejecutar `innfo-mcp_validate_model()`.
2. Present result and version menu:
   - **[a] (Recommended)** Bump Patch (`V_x-y-z+1`)
   - **[b]** Keep current version (`V_x-y-z`)
   - **[c]** Bump Minor (`V_x-y+1-0`)
   - **[x]** Cancel
3. Update links in `index.md` if the physical file name changes.

---

## 11. Decisión de Escalado de Arquitectura (1 a N Modelos)

When the project scales to multiple sub-models, present the **4 Architectural Alternatives**:

```markdown
💡 Architecture Scaling Selection (1 to N Models):

  [a] (Recommended) Option 4: Hybrid Master Aggregator with `file_ref::` references
      - Files: `models/Master_V_0-1-0_NN.md` and `models/subsystems/`
      - iNNfo code: The main model references subsystems via `file_ref:: ./subsystems/auth_V_0-1-0_NN.md`

  [b] Option 1: Single Monolithic Model
      - File: `models/System_V_0-1-0_NN.md`

  [c] Option 2: Independent Models in the same directory
      - Files: `models/DomainA_V_0-1-0_NN.md`, `models/DomainB_V_0-1-0_NN.md`

  [d] Option 3: Multi-Folder Hybrid per Project
      - Files: `projects/domainA/models/index.md`, `projects/domainB/models/index.md`

  [x] Cancel

*(Notice: You can select one option or a combination (e.g. A and B))*
```

---

## 12. Checklist de Expectativa Visual (App Verification)

Upon completing the creation or modification of a model, the agent MUST print the Visual Checklist with dynamic deep links instead of the generic `https://cognnitive.com/innfo/app/`.

### Deep URL construction instruction:
- **Base URL**: `https://cognnitive.com/innfo/app/workspace?view=editor`
- **Model Query Parameter**: `&model=<model_id>` (where `<model_id>` is the model identifier/filename without extension, e.g. `arenzano_V_1-2-0_business`).
- **Concept Deep Link (Hash)**: `#@<ConceptName>` (URL-encoded if containing spaces, e.g. `#@Market%20trends`).
- **Element Deep Link (Hash)**: `#<ConceptName>.<ElementName>` (e.g. `#Products.CogNNitive`).

If there is an active model in context, use its `model_id` and show interactive links to its main sections.

Example of dynamic checklist to generate:
```markdown
📋 Visual Expectation Checklist in iNNfo Modeler (assuming workspace is already open):

- [ ] 🌳 [**Navigation Sidebar Tree**](https://cognnitive.com/innfo/app/workspace?view=editor&model=<model_id>):
      Hierarchical structure based on `# NN index` with fluid navigation across concepts and elements.
- [ ] 📋 [**Concept Field Panels** (e.g. <Concept>)](https://cognnitive.com/innfo/app/workspace?view=editor&model=<model_id>#@<Concept_url_encoded>):
      Detailed view rendered for each `key:: value` (properties, types, and references).
- [ ] 🎴 [**Element Cards** (e.g. <Element>)](https://cognnitive.com/innfo/app/workspace?view=editor&model=<model_id>#<Concept_url_encoded>.<Element_url_encoded>):
      Interactive cards for each `## NN <Concept>: <Element>` block showing metadata and descriptions.
- [ ] 📊 [**Comparative Matrix Tables**](https://cognnitive.com/innfo/app/workspace?view=matrices&model=<model_id>):
      N-to-M relationship tables and `item-markers matrix` rendered with interactive cells (`X` / `-`).
```

---

## 13. Atajos de Navegación Contextual / Quick Actions (Opción E)

Upon concluding the generation or editing of a model, the agent MUST include logical shortcuts based on current context. When finishing a new model, the first option MUST be guided review:

```markdown
📌 Suggested next steps:
- [a] (Recommended) Guided review of generated concepts and elements
- [b] Run Architecture Coach audit ([d])
- [c] Edit or add a new concept/element
- [m] Switch active model (select another model)
```

**Dynamic Procedure Listing:**
* **Only if** the active model actually contains declared procedures (e.g. sections `## NN Procedure: ...`), append the following block:
```markdown
📌 Available procedures in model:
- [p1] Execute: <Procedure 1>
- [pn] ... (if the model declares master.html procedure, it will appear here as "Generate master.html")
```
* If the model does not declare any procedures, omit the "Available procedures in model" block completely to avoid broken shortcuts or noise.

---

## 15. Descubrimiento de Procedimientos y Skills del Modelo

Los procedimientos ejecutables y skills de agente son contenido declarado dinámicamente en los modelos y plantillas (no un catálogo fijo del skill). Se descubren invocando las herramientas MCP `list_template_procedures` y `list_template_skills`, las cuales recorren transitivamente la jerarquía `parent_spec` y el árbol de composición `includes` hasta una profundidad de 10 niveles, deduplicando procedimientos por `id` y skills por `name`.

Además, los procedimientos se descubren consultando las secciones `## NN Procedure: ...` del modelo activo y la carpeta `procedures/` del workspace (`*_procedures_V_0-1-0_NN.md`).

El procedimiento de master.html (anteriormente showroom) es reconocible: si el usuario solicita un "master.html", "master", "showroom", "galería" o "framework visual" de un modelo, se ofrece generarlo (sin modificar cómo se genera ni alterar el comportamiento del generador actual).

---

## Core Rules

1. **Meta-plantilla Estricta V_0-2-0:** Las plantillas Nivel 2 definen primitivas en el cuerpo (`# NN Concept Definition`). NUNCA colocar `concepts: [...]` o `fields: [...]` en el YAML frontmatter de Nivel 2.
2. **Sintaxis Unificada NN:** Usar `# NN <Concept>`, `## NN <Concept>: <Element>`, `key:: value`. No usar viñetas obsoletas `_NN` ni bloques de código ````yaml`.
3. **Proveniencia Opcional y Actualizada:** `sources::` es opcional y apunta a archivos en `sources/nn/` (admite lista `[a, b]` para múltiples valores; sin IDs `src-xxx` ni carpeta `raw/`).
4. **Cero Mutación Unilateral:** Nunca renombrar ni mover archivos sin confirmación explícita.
5. **Recommended Option First:** Always prefix option `[a]` with `(Recommended)`.
6. **Multi-Selection Notice:** Include `"You can select one option or a combination (e.g. A and B)"` when applicable.
7. **Preview de Cambios con Diff:** Mostrar resumen en lenguaje natural antes de aplicar cualquier mutación con el MCP.
8. **Modo Coach de Arquitectura:** En la auditoría `[d]`, explicar riesgos de negocio/funcionales y ofrecer soluciones en 1 clic.
9. **Atajos Contextuales:** Finalizar cada respuesta ofreciendo 2-3 acciones siguientes sugeridas (Quick Actions).
10. **Delegación Total al MCP:** Consultar tipos, esquemas y validación al servidor `innfo-mcp`; no adivinar ni duplicar la gramática.
11. **Index Block Solo Concepts:** El `# NN index` lista SOLO Concepts (tipos declarados por la plantilla), NUNCA Elements (instancias de Concepts). Los Elements se declaran dentro de sus secciones de Concept con `## NN <Concept>: <Element>`. La relación Elements↔Concepts es por estructura de sección y campos `reference`, no por jerarquía en el index.
12. **Sintaxis WikiLink Obligatoria en Referencias:** En todo campo referencial (`type:: reference`), el valor DEBE ser formateado usando la sintaxis WikiLink (`key:: [[Elemento]]`). Queda prohibido usar texto plano sin corchetes WikiLink.
13. **Descripción de Elementos en Prosa:** La descripción/explicación de un elemento en un modelo Nivel 3 NUNCA debe escribirse como un campo de tipo `description::`. Debe ir siempre como texto libre en prosa Markdown debajo de la lista de campos `key:: value`, separada por una línea en blanco.
14. **Active Model Selection Gate:** Never perform editing, validation, audits, or model procedure execution without a validated active model in context. Run workspace discovery first if none is set.
15. **Dynamic Quick Actions:** Only list procedure shortcuts in next steps if the model contains declared procedures.
16. **Etiquetas Libres (`tags::`)**: Todo Elemento o Concepto en un modelo Nivel 3 puede declarar `tags:: [tag1, tag2]` para categorización libre sin necesidad de modificar la plantilla Nivel 2. La sintaxis de múltiples etiquetas exige el uso de corchetes `[...]`. Los agentes deben usar este campo para filtrar y acotar acciones sobre elementos etiquetados.

---

## Generación del Index Block

### Regla Fundamental

El `# NN index` define la jerarquía de **navegación** entre Concepts. Los Elements NO
aparecen en el index — se descubren al expandir un Concept en el árbol lateral.

### Formato Correcto

```markdown
# NN index
* [[Market]]
  * [[Stakeholders]]
  * [[Segments]]
* [[Solutions]]
  * [[Offerings]]
  * [[Features]]
* [[Finance]]
  * [[Revenue]]
  * [[Costs]]
```

### Formato INCORRECTO (mezcla Concepts y Elements)

```markdown
# NN index
* [[Market]]
  * [[Stakeholders]]    ← Element, NO va en el index
    * [[Juan Pérez]]    ← Element de Stakeholders, NO va en el index
  * [[Segments]]        ← Element, NO va en el index
```

### Generación Automática

Al crear o editar un modelo, el agente debe:

1. **Leer la plantilla** (`get_template`) para obtener los Concepts definidos
2. **Identificar los Concepts raíz** (primer nivel del index)
3. **Identificar sub-Concepts** (si existen jerarquías en la plantilla)
4. **Generar el index** listando SOLO Concepts, NO Elements
5. **Validar** con `validate_model` que el index no contenga Elements

### Relación Elements↔Concepts

Los Elements se relacionan con sus Concepts por:

1. **Estructura de sección:** `## NN <Concept>: <Element>` declara que Element pertenece a ese Concept
2. **Campos reference:** `location:: [[Element Name]]` establece relaciones entre Elements
3. **Matrices:** Las matrices cruzan Elements de distintos Concepts

NUNCA por jerarquía en el index.
