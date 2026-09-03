# Delta: Widget Registry — 14 New Widget Types

## Purpose

Add 14 new widget types to the format-editor's widget registry (`shared/widgets/registry.ts`), each with read and edit modes, following the existing `v-model` contract (`modelValue` / `update:modelValue`). Every widget MUST be importable from `shared/widgets/` and registered in `UNIFIED_WIDGET_REGISTRY`.

## Requirements

### R-WR-00: Widget Contract (All Widgets)

Every widget MUST follow the established contract:

- **Prop**: `modelValue` — the current value (type varies by widget)
- **Emit**: `update:modelValue` — fired on user interaction with the new value
- **Prop**: `fieldDefinition` (optional) — `{ name, type, options?, target_concepts? }` for context-aware rendering
- **Modes**: Each widget MUST support a `readonly` prop. When `true`, the widget renders in non-interactive display mode. When `false` (default), interactive edit controls render.

#### Scenario: Widget emits update on interaction

- GIVEN a DateWidget with `modelValue: "2025-03-15"`
- WHEN the user changes the date to "2025-03-16"
- THEN `update:modelValue` fires with `"2025-03-16"`

### R-WR-01: Date Widget (`DateWidget.vue`)

Renders a date picker input (`<input type="date">`) in edit mode. In read mode, displays the formatted date as text. Accepts ISO 8601 date strings (`YYYY-MM-DD`). Registered as `'date'`.

#### Scenario: DateWidget renders date picker

- GIVEN `modelValue: "2025-06-15"`
- WHEN in edit mode
- THEN an `<input type="date">` shows "Jun 15, 2025" with a date picker
- WHEN in read mode
- THEN text "Jun 15, 2025" renders (or the raw value if unparseable)

### R-WR-02: URL Widget (`UrlWidget.vue`)

Renders a clickable hyperlink in read mode and a URL input in edit mode. Accepts a URL string. Validates the URL format on input (must start with `http://`, `https://`, or `mailto:`). Shows validation error text if the URL is malformed. Registered as `'url'`.

#### Scenario: URLWidget renders clickable link

- GIVEN `modelValue: "https://example.com"`
- WHEN in read mode
- THEN an `<a href="https://example.com">` renders, opening in a new tab
- WHEN in edit mode
- THEN an `<input type="url">` renders with the URL as value

### R-WR-03: Color Widget (`ColorWidget.vue`)

Renders a color swatch with hex value in read mode, and a `<input type="color">` picker in edit mode. Accepts hex color strings (`#RRGGBB`). The swatch shows a 20×20px circle filled with the color. Registered as `'color'`.

#### Scenario: ColorWidget shows swatch

- GIVEN `modelValue: "#4D0E4E"`
- WHEN in read mode
- THEN a 20×20px circle filled with `#4D0E4E` and the text `#4D0E4E` render
- WHEN in edit mode
- THEN a native color picker shows with `#4D0E4E` pre-selected

### R-WR-04: MultiSelect Widget (`MultiSelectWidget.vue`)

Renders selected options as removable chips in edit mode, and as static chips in read mode. Accepts a string array (`string[]`). Options come from `fieldDefinition.options[]`. Unselected options appear in a dropdown list. Registered as `'multiselect'`.

#### Scenario: MultiSelectWidget shows selected chips

- GIVEN `modelValue: ["js", "ts"]` and `fieldDefinition.options: ["js", "ts", "py", "go"]`
- WHEN in read mode
- THEN two static chips show: "js" and "ts"
- WHEN in edit mode
- THEN two removable chips show with an "×" to remove each
- AND a dropdown lists the unselected options ["py", "go"]

### R-WR-05: Tags Widget (`TagsWidget.vue`)

Renders free-form text tags as chips in both modes. Accepts a string array (`string[]`). In edit mode, an input field allows typing new tags (pressing `Enter` or `,` adds the tag). Tags are removable via "×". Tags are automatically trimmed and deduplicated. Empty tags are ignored. Registered as `'tags'`.

#### Scenario: TagsWidget adds tags via Enter key

- GIVEN `modelValue: ["frontend", "vue"]`
- WHEN the user types "router" and presses Enter in edit mode
- THEN `update:modelValue` fires with `["frontend", "vue", "router"]`

### R-WR-06: Rating Widget (`RatingWidget.vue`)

Renders a star rating (1–5) in both modes. Accepts a number (`1 | 2 | 3 | 4 | 5`). In read mode, filled/empty star icons display. In edit mode, star icons are clickable and highlight on hover. The widget shows `n/5` text next to the stars. Registered as `'rating'`.

#### Scenario: RatingWidget shows 3 stars of 5

- GIVEN `modelValue: 3`
- WHEN rendered
- THEN 3 filled stars and 2 empty stars display
- AND "3/5" text renders next to the stars

### R-WR-07: Scale Widget (`ScaleWidget.vue`)

Renders a numeric slider or clickable scale (1–10) in both modes. Accepts a number (`1` to `10`). In edit mode, a horizontal slider or clickable step indicators render. The current value displays as a badge. Range configurable via `fieldDefinition.options` (e.g., `["1","2","3","4","5"]`) or defaults to 1–10. Registered as `'scale'`.

#### Scenario: ScaleWidget renders slider with badge

- GIVEN `modelValue: 7` with `fieldDefinition.options: ["1","2","3","4","5","6","7","8","9","10"]`
- WHEN rendered
- THEN a horizontal scale with clickable steps shows, with step 7 highlighted
- AND a badge shows "7"

### R-WR-08: ToggleGroup Widget (`ToggleGroupWidget.vue`)

Renders a segmented button group for binary/enum selection. Accepts a string value. Options come from `fieldDefinition.options[]`. Each option renders as a segment button. The active segment is highlighted. Registered as `'togglegroup'`.

#### Scenario: ToggleGroupWidget shows active segment

- GIVEN `modelValue: "medium"` and `options: ["low", "medium", "high"]`
- WHEN rendered
- THEN three segment buttons show, with "medium" highlighted
- AND clicking "high" fires `update:modelValue` with `"high"`

### R-WR-09: Cycle Widget (`CycleWidget.vue`)

Renders a single pill that cycles through values on click. Accepts a string value. Options come from `fieldDefinition.options[]`. Each click advances to the next option, wrapping around. The current value renders with concept-aware coloring. Registered as `'cycle'`.

#### Scenario: CycleWidget advances on click

- GIVEN `modelValue: "draft"` and `options: ["draft", "review", "final"]`
- WHEN the user clicks the pill
- THEN `update:modelValue` fires with `"review"`

### R-WR-10: Code Widget (`CodeWidget.vue`)

Renders a read-only code block in read mode and a monospace textarea with line numbers in edit mode. Accepts a string. Uses a monospace font. The widget's `fieldDefinition.type` determines language hint for display (e.g., `json`, `javascript`, `yaml`). Registered as `'code'`.

#### Scenario: CodeWidget renders syntax block

- GIVEN `modelValue: '{"key": "value"}'` with `fieldDefinition.type: "json"`
- WHEN in read mode
- THEN a `<pre><code>` block renders with JSON content and a "json" language badge
- WHEN in edit mode
- THEN a monospace textarea shows the raw content with line numbers

### R-WR-11: Mermaid Widget (`MermaidWidget.vue`)

Renders a Mermaid diagram in read mode using a lightweight Mermaid renderer (or an `<iframe>` sandbox). Accepts a Mermaid definition string. In edit mode, a textarea shows the raw Mermaid source. On blur or Ctrl+Enter, the diagram re-renders. Registered as `'mermaid'`.

#### Scenario: MermaidWidget renders flowchart

- GIVEN `modelValue: "graph TD; A-->B;"`
- WHEN in read mode
- THEN a rendered flowchart image or SVG displays
- WHEN in edit mode
- THEN a textarea shows `"graph TD; A-->B;"`
- AND editing the text and pressing Ctrl+Enter re-renders the diagram

### R-WR-12: Diagram Widget (`DiagramWidget.vue`)

Renders an inline SVG diagram from a simple box-and-arrow DSL. Accepts a string with lines like `Process > Task > Step`. Each `>` creates a directional arrow. Renders as an inline SVG with rounded boxes and arrow lines. In edit mode, a textarea allows editing the DSL. Registered as `'diagram'`.

#### Scenario: DiagramWidget renders box-arrow flow

- GIVEN `modelValue: "Plan > Execute > Review"`
- WHEN rendered
- THEN three rounded boxes with "Plan", "Execute", "Review" connected by arrows render as an inline SVG

### R-WR-13: Timestamp Widget (`TimestampWidget.vue`)

Renders a formatted timestamp. Accepts an ISO 8601 string. In read mode, shows a human-readable date/time (locale-formatted). In edit mode, shows a `<input type="datetime-local">`. Also accepts a Unix timestamp (number). Auto-detects between string and number input. Registered as `'timestamp'`.

#### Scenario: TimestampWidget shows locale-formatted datetime

- GIVEN `modelValue: "2025-06-15T14:30:00Z"`
- WHEN in read mode
- THEN "Jun 15, 2025, 2:30 PM" (or locale-equivalent) renders
- WHEN in edit mode
- THEN a `<input type="datetime-local">` shows the parsed datetime

### R-WR-14: Markdown Widget (`MarkdownWidget.vue`)

Renders rendered Markdown in read mode and a textarea in edit mode. Accepts a Markdown string. In read mode, renders via `marked` (same as R-SC-01). In edit mode, a full-height textarea with toolbar buttons (bold, italic, list, heading) renders. Registered as `'markdown'`.

#### Scenario: MarkdownWidget renders in read mode

- GIVEN `modelValue: "**bold** and *italic*"`
- WHEN in read mode
- THEN `<strong>bold</strong>` and `<em>italic</em>` render
- WHEN in edit mode
- THEN a textarea shows the raw markdown with formatting toolbar

### R-WR-15: Registry Registration

Each new widget MUST be imported and registered in `shared/widgets/registry.ts` under `UNIFIED_WIDGET_REGISTRY`. The corresponding `WidgetType` union type MUST include the new string literal. The `resolveWidgetComponent` function in `shared/widgets/index.ts` MUST resolve the new types without modification (it already reads from the registry dynamically).

The 14 new entries are:

| Type String | Component | Widget Name |
|-------------|-----------|-------------|
| `'date'` | `DateWidget` | DateWidget.vue |
| `'url'` | `UrlWidget` | UrlWidget.vue |
| `'color'` | `ColorWidget` | ColorWidget.vue |
| `'multiselect'` | `MultiSelectWidget` | MultiSelectWidget.vue |
| `'tags'` | `TagsWidget` | TagsWidget.vue |
| `'rating'` | `RatingWidget` | RatingWidget.vue |
| `'scale'` | `ScaleWidget` | ScaleWidget.vue |
| `'togglegroup'` | `ToggleGroupWidget` | ToggleGroupWidget.vue |
| `'cycle'` | `CycleWidget` | CycleWidget.vue |
| `'code'` | `CodeWidget` | CodeWidget.vue |
| `'mermaid'` | `MermaidWidget` | MermaidWidget.vue |
| `'diagram'` | `DiagramWidget` | DiagramWidget.vue |
| `'timestamp'` | `TimestampWidget` | TimestampWidget.vue |
| `'markdown'` | `MarkdownWidget` | MarkdownWidget.vue |

#### Scenario: All 14 widgets resolve from registry

- GIVEN the updated registry
- WHEN `resolveWidgetComponent('date')` is called
- THEN it returns `DateWidget`
- WHEN `resolveWidgetComponent('markdown')` is called
- THEN it returns `MarkdownWidget`
- WHEN `resolveWidgetComponent('unknown-type')` is called
- THEN it returns `undefined` (fallback to `FallbackWidget`)

### R-WR-16: Scope Guard — Existing Widgets Unchanged

The existing 12 widget types (`text`, `weight`, `category`, `string`, `boolean`, `number`, `select`, `reference`, `image`, `file`, `video`, `audio`) MUST continue to work identically. Their component files MUST NOT be modified.

#### Scenario: Existing widgets still resolve

- GIVEN the updated registry
- WHEN `resolveWidgetComponent('string')` is called
- THEN it returns `FieldString` (unchanged)
- WHEN `resolveWidgetComponent('image')` is called
- THEN it returns `FieldAsset` (unchanged)
