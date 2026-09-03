---
title: "Web Design Guide — cogNNitive Skill"
description: "Light-mode design system with Morado Nazareno palette, systematic typography, and 8px grid"
html_url: https://actionn.cognnitive.com/docs/#/skills/web-design-guide
generator: https://actionn.cognnitive.com/nn-design-presets
---

# Web Design Guide

## Purpose

Complete design system for **strict light mode** with Morado Nazareno palette, systematic typography, 8px grid, and specific guidelines for commercial layouts and technical documentation.

## Palette

| Token | Hex | Usage |
|---|---|---|
| **Canvas Base** | `#FFFFFF` | Main backgrounds |
| **Canvas Inert** | `#FAFAFC` | Code, cards, inner containers |
| **Brand Primary** | `#4D0E4E` | Morado Nazareno — headings, CTAs, navigation |
| **Border Soft** | `#F2F2F7` | Structural boundaries, dividers |
| **Ink Primary** | `#111112` | High contrast main text |
| **Ink Muted** | `#636366` | Labels, metadata, breadcrumbs |

## Typography

| Style | Font | Size | Weight |
|---|---|---|---|
| H1 | Plus Jakarta Sans | 48px | 800 (Extra Bold) |
| H2 | Plus Jakarta Sans | 32px | 700 (Bold) |
| H3 | Plus Jakarta Sans | 22px | 600 (Semi Bold) |
| Body | Plus Jakarta Sans | 16px | 400 (Regular) |
| Caption | Plus Jakarta Sans | 13px | 500 (Medium) |
| Editorial Accent | Playfair Display *italic* | — | 400 or 600 |
| Code | Geist Mono / JetBrains Mono | 14px | 400 or 500 |

## Spacing

System based on **8px** grid:

| Token | Value | Usage |
|---|---|---|
| `space-xs` | 4px | Labels, micro tags |
| `space-sm` | 8px | Text in cards, small inputs |
| `space-md` | 16px | Container gutters |
| `space-lg` | 24px | Horizontal spacing between rows |
| `space-xl` | 48px | Mobile outer margins |
| `space-xxl` | 64–96px | Spacing between major sections |

## Layouts

### Commercial (tweakcn.com style)

- Flat white canvas, **no grids, no watermarks**
- Block separation with vertical `space-xxl` and `#F2F2F7` borders
- Primary CTAs: solid `#4D0E4E` with white text
- Secondary CTAs: 1px `#4D0E4E` border, transparent background
- Cards: white background, `#F2F2F7` border, 8–12px radius

### Technical Documentation (Docsify)

Docsify native CSS variable injection:

```css
:root {
  --theme-color: #4D0E4E;
  --base-background: #FFFFFF;
  --textColor: #111112;
  --sidebar-background: #FFFFFF;
  --sidebar-border-color: #F2F2F7;
  --code-background: #FAFAFC;
  --code-color: #4D0E4E;
}
```

- Sidebar: white background, active route in bold + `#4D0E4E` + vertical marker
- Code: on `#FAFAFC`, 1px `#F2F2F7` border, no adornments

## AI Image Styles

| Style | Description |
|---|---|
| **Alpha** · Flat Vector | 2D without shadows, semi-desaturated colors on neutral background |
| **Beta** · Doodle Line Art | Hand-drawn, black and white, thick marker lines |
| **Gamma** · Isometric 3D | 30° projection, geometric blocks, bright gradients |
| **Delta** · Cell-Shaded Pop | Modern comic, black lines, flat color, no blending |

## Files

```
skills/nn-design-presets/
  SKILL.md
```
