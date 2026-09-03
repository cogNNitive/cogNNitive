# Morado Nazareno (Brand Classic)

Identidad visual principal del ecosistema cogNNitive. Canvas blanco impecable con acentos morado nazareno `#4D0E4E`, tipografía limpia de alta legibilidad y detalles editoriales en serif.

## Core Tokens

```yaml
mode: STRICT_LIGHT_MODE
palette:
  canvas_base: "#FFFFFF"
  canvas_inert: "#FAFAFC"
  brand_primary: "#4D0E4E"
  brand_secondary: "#7A1C7C"
  border_soft: "#E5E5EA"
  ink_primary: "#111112"
  ink_muted: "#636366"
typography:
  sans_ui: "'Plus Jakarta Sans', system-ui, sans-serif"
  serif_editorial: "'Playfair Display', Georgia, serif"
  mono_technical: "'JetBrains Mono', 'JetBrains Mono', monospace"
shadows:
  card: "0 4px 20px rgba(77, 14, 78, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)"
  glow: "0 0 16px rgba(77, 14, 78, 0.2)"
radii:
  sm: "6px"
  md: "12px"
  lg: "20px"
```

## Spacing Grid (8px Base)

| Token | px | Usage |
|-------|----|-------|
| space-xs | 4px | Labels, micro badges |
| space-sm | 8px | Padding interno de tarjetas y botones |
| space-md | 16px | Gutters, separación entre elementos |
| space-lg | 24px | Espaciado entre filas y bloques |
| space-xl | 48px | Márgenes de viewport |
| space-xxl | 64px | Separación entre secciones |

## Reglas de Aplicación

- **Canvas Principal**: `#FFFFFF` para fondear componentes y contenido principal.
- **Tarjetas y Elevación**: Fondo blanco con borde delgado `#E5E5EA` y sombra suave morada.
- **Botones Primarios**: Relleno sólido `#4D0E4E` con texto blanco y hover `#631264`.
- **Destacados Editoriales**: Uso de *Playfair Display* en itálica para palabras clave en encabezados principales.
