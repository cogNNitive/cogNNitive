# Relaciones y Conexiones en iNNfo

El modelo de datos de **iNNfo** no se limita a almacenar bloques jerárquicos o páginas independientes: constituye una **Red de Conocimiento (Knowledge Graph)** donde las entidades interactúan entre sí.

En iNNfo, las relaciones entre elementos y conceptos se clasifican en **4 niveles formales** (alineados con la Especificación Nivel 1 `iNNfo_V_0-2-0_NN.md`), dependiendo de su origen y grado de estructuración.

---

## Los 4 Niveles de Relaciones

```
                                  ┌─────────────────────────────────────────┐
                                  │          RED DE CONOCIMIENTO            │
                                  └────────────────────┬────────────────────┘
                                                       │
         ┌───────────────────────────────┬─────────────┴───────────────┬───────────────────────────────┐
         ▼                               ▼                             ▼                               ▼
┌───────────────────┐         ┌───────────────────┐         ┌───────────────────┐         ┌───────────────────┐
│ 1. JERÁRQUICA     │         │ 2. ESTRUCTURAL    │         │ 3. ATRIBUTO       │         │ 4. CONTEXTUAL     │
│    (Taxonomía)    │         │    (Matriz)       │         │    (Campo)        │         │    (Mención)      │
└────────┬──────────┘         └────────┬──────────┘         └────────┬──────────┘         └────────┬──────────┘
         │                             │                             │                             │
  Anidamiento de árbol        Matriz de Dominio             Campo referencial             Wikilink libre
  (# NN index)                (ej. WORK → ROLES)            (key:: [[target]])            ([[Target Element]])
```

### 1. Relaciones Jerárquicas / Taxonómicas (`hierarchy`)
* **Origen**: Bloque `# NN index` al inicio del modelo Nivel 3.
* **Sintaxis**: Listas Markdown anidadas usando sintaxis WikiLink (`* [[Padre]]` → `  * [[Hijo]]`).
* **Icono Visual**: 🌳 `FolderTree` / Árbol lateral
* **Ejemplo**: `Salón-Comedor` anidado dentro de `Casa`.

### 2. Relaciones Estructurales (`evaluable_matrix`)
* **Origen**: Celdas de intersección declaradas en matrices formales del metamodelo (ej. `WORK → ROLES` o `WORK → ARTIFACT`).
* **Sintaxis**: Declaración centralizada en cabecera de metamodelo (`matrices`) o bloques `# NN matrices:` e intersecciones en bloques.
* **Icono Visual**: 📊 `LayoutGrid`
* **Ejemplo**: Un procedimiento `Solicitud de Visado` asignado con el rol `Responsible` hacia `Inés (viajera)`.

### 3. Relaciones por Atributo (Campos Referenciales)
* **Origen**: Campos estructurados en los bloques cuyos valores hacen referencia explícita a otro elemento mediante corchetes WikiLink.
* **Sintaxis**: `campo:: [[nombre_del_elemento]]` (campos con `type:: reference` en su definición).
* **Icono Visual**: 🏷️ `Tag`
* **Ejemplo**: `location:: [[Salón-Comedor]]` o `depends_on:: [[Verificación de Pasaporte]]`.
* **Nota importante**: Los campos referenciales NUNCA deben escribirse como texto plano (`location:: Salón-Comedor`); el uso de `[[...]]` es obligatorio para que el motor de iNNfo resuelva la conexión en la red.

### 4. Relaciones Contextuales (Menciones & Wikilinks)
* **Origen**: Menciones informales y enlaces de hipertexto escritos libremente en el cuerpo Markdown de la descripción de un bloque.
* **Sintaxis**: `[[Nombre del Elemento]]` dentro del texto explicativo.
* **Icono Visual**: 📝 `FileText`
* **Ejemplo**: *"...para completar este paso es necesario revisar el [[Formulario DS-2019]] emitido por el patrocinador."*

---

## Direccionalidad de las Conexiones

Todas las relaciones en el editor se presentan con un indicador claro de dirección según la posición del elemento actual:

### Conexión Saliente (`outgoing`)
Indica que el elemento actual **inicia o apunta** la relación hacia un elemento destino:
$$\text{> ( Rol / Campo ) > [Píldora Destino]}$$

* **Ejemplo**: `> ( 🏷️ location ) > [Salón-Comedor]`

### Conexión Entrante (`incoming`)
Indica que otro elemento fuente **apunta o referencia** al elemento actual (Backlinks / Participación como destino):
$$\text{[Píldora Fuente] < ( Rol / Campo ) <}$$

* **Ejemplo**: `[Sofás salón] < ( 🏷️ location ) <`

### Conexión Completa (`full`)
En vistas globales, reportes de validación o tablas completas:
$$\text{[Píldora Fuente] — ( Rol / Campo ) → [Píldora Destino]}$$

---

## Componente `ConnectionPill`

La interfaz visual de iNNfo estandariza todas estas relaciones mediante el componente **`ConnectionPill`**, el cual reúne:
1. El **icono del tipo de relación** (📊 Matriz, 🏷️ Campo, 📝 Mención).
2. El **rol o nombre de la relación** en un badge destacado.
3. El **bloque interactivo (`BlockPill`)** del nodo conectado con su icono de concepto, color y soporte de navegación al hacer click.

