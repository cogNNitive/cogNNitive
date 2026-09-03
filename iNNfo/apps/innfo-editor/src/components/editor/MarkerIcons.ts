import { h } from 'vue'
import type { Component } from 'vue'

// Solid Completion Icon: Filled circle with a white checkmark
export const SolidCompletionIcon = (props: any, { attrs }: any) => {
  return h(
    'svg',
    {
      ...attrs,
      viewBox: '0 0 24 24',
      fill: 'none',
      class: attrs.class,
    },
    [
      h('circle', { cx: '12', cy: '12', r: '10', fill: 'currentColor' }),
      h('path', {
        d: 'M8.5 12.5l2.5 2.5 4.5-4.5',
        stroke: 'white',
        'stroke-width': '2.5',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        fill: 'none',
      }),
    ],
  )
}

// Solid Certainty Icon: Filled circle with a white question mark
export const SolidCertaintyIcon = (props: any, { attrs }: any) => {
  return h(
    'svg',
    {
      ...attrs,
      viewBox: '0 0 24 24',
      fill: 'none',
      class: attrs.class,
    },
    [
      h('circle', { cx: '12', cy: '12', r: '10', fill: 'currentColor' }),
      h('path', {
        d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3',
        stroke: 'white',
        'stroke-width': '2',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        fill: 'none',
      }),
      h('circle', { cx: '12', cy: '17', r: '1.25', fill: 'white' }),
    ],
  )
}

// Solid Priority Icon: Filled Flag
export const SolidPriorityIcon = (props: any, { attrs }: any) => {
  return h(
    'svg',
    {
      ...attrs,
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      class: attrs.class,
    },
    [
      h('path', { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' }),
      h('line', { x1: '4', y1: '22', x2: '4', y2: '15' }),
    ],
  )
}

// Solid Rating Icon: Filled Star
export const SolidRatingIcon = (props: any, { attrs }: any) => {
  return h(
    'svg',
    {
      ...attrs,
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      class: attrs.class,
    },
    [
      h('polygon', {
        points:
          '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2',
      }),
    ],
  )
}

// Solid Weight Icon: Filled Weight
export const SolidWeightIcon = (props: any, { attrs }: any) => {
  return h(
    'svg',
    {
      ...attrs,
      viewBox: '0 0 24 24',
      fill: 'currentColor',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      class: attrs.class,
    },
    [
      h('circle', { cx: '12', cy: '5', r: '3' }),
      h('path', { d: 'M4.5 12h15' }),
      h('path', { d: 'M4.5 12a3 3 0 0 0-3 3v4a2 2 0 0 0 2 2h17a2 2 0 0 0 2-2v-4a3 3 0 0 0-3-3' }),
    ],
  )
}

/** Canonical marker names used when no metamodel markers are declared. */
export const DEFAULT_MARKER_NAMES = [
  'completion',
  'certainty',
  'priority',
  'rating',
  'weight',
] as const

/**
 * Static, human-readable definition of a marker: its symbol, icon, color,
 * description, evaluation criteria (guidelines), and reference examples.
 * Structural superset of `MarkerInfo` used by `MarkerTooltip`.
 */
export interface MarkerDefinition {
  name: string
  symbol: string
  icon: string
  color: string
  description: string
  guidelines: string
  examples_high_score: string
  examples_low_score: string
}

const MARKER_DEFINITIONS: Record<string, MarkerDefinition> = {
  completion: {
    name: 'completion',
    symbol: '>',
    icon: 'check',
    color: 'emerald',
    description:
      'How complete this element is. Cycle the icon to mark progress from not started to fully done.',
    guidelines: [
      '0 — Not set: no progress information recorded',
      '1 — Low: just started or an early draft',
      '2 — Medium: partially complete',
      '3 — High: finished and reviewed',
    ].join('\n'),
    examples_high_score: [
      '* Fully drafted and reviewed content',
      '* All linked references and fields resolved',
    ].join('\n'),
    examples_low_score: [
      '* Bare heading with no content',
      '* Placeholder or TODO text',
    ].join('\n'),
  },
  certainty: {
    name: 'certainty',
    symbol: '?',
    icon: 'help-circle',
    color: 'blue',
    description:
      "Confidence level of the element's content. Signals how sure you are that the information is correct.",
    guidelines: [
      '0 — Not set: no confidence recorded',
      '1 — Low: guess or unverified assumption',
      '2 — Medium: plausible, partially verified',
      '3 — High: verified and corroborated',
    ].join('\n'),
    examples_high_score: [
      '* Claim backed by a cited source',
      '* Cross-checked with an expert or measurement',
    ].join('\n'),
    examples_low_score: [
      '* Unverified estimate',
      '* Marked as an open question or assumption',
    ].join('\n'),
  },
  priority: {
    name: 'priority',
    symbol: '!',
    icon: 'flag',
    color: 'rose',
    description:
      'Urgency or importance flag. Marks how quickly this element needs attention.',
    guidelines: [
      '0 — Not set: no priority assigned',
      '1 — Low: can wait',
      '2 — Medium: address soon',
      '3 — High: act now',
    ].join('\n'),
    examples_high_score: [
      '* Blocking issue for the current milestone',
      '* Critical dependency for other elements',
    ].join('\n'),
    examples_low_score: [
      '* Nice-to-have, no deadline',
      '* Backlog item with no urgency',
    ].join('\n'),
  },
  rating: {
    name: 'rating',
    symbol: '+',
    icon: 'star',
    color: 'amber',
    description:
      'Quality rating for the element. A quick score of how good or valuable the content is.',
    guidelines: [
      '0 — Not set: unrated',
      '1 — Low: poor or needs work',
      '2 — Medium: acceptable',
      '3 — High: excellent',
    ].join('\n'),
    examples_high_score: [
      '* Comprehensive, well-structured content',
      '* Strong value for the intended audience',
    ].join('\n'),
    examples_low_score: [
      '* Sparse or unclear content',
      '* Needs significant revision',
    ].join('\n'),
  },
  weight: {
    name: 'weight',
    symbol: '*',
    icon: 'scale',
    color: 'indigo',
    description:
      'Relative importance score. Higher weight means the element is more relevant to the overall model.',
    guidelines: [
      '0 — Not set: no weight assigned',
      '1 — Low: marginal importance',
      '2 — Medium: notable importance',
      '3 — High: core to the model',
    ].join('\n'),
    examples_high_score: [
      '* Drives several other elements',
      '* Directly tied to the main objective',
    ].join('\n'),
    examples_low_score: [
      '* Peripheral or contextual detail',
      '* No downstream impact',
    ].join('\n'),
  },
}

/** Resolve the full definition (including tooltip copy) for a marker name. */
export const getMarkerDefinition = (markerName: string): MarkerDefinition =>
  MARKER_DEFINITIONS[markerName] ?? MARKER_DEFINITIONS.certainty

/** Ordered list of marker definitions rendered by marker toolbars. */
export const getMarkerDefinitions = (): MarkerDefinition[] =>
  DEFAULT_MARKER_NAMES.map((name) => getMarkerDefinition(name))

/** Resolve the glyph component for a marker by its canonical name. */
export const getMarkerIcon = (markerName: string): Component => {
  switch (markerName) {
    case 'completion':
      return SolidCompletionIcon
    case 'certainty':
      return SolidCertaintyIcon
    case 'priority':
      return SolidPriorityIcon
    case 'rating':
      return SolidRatingIcon
    case 'weight':
      return SolidWeightIcon
    default:
      return SolidCertaintyIcon
  }
}

/** Base color (no opacity) for a marker's glyph by name. */
const MARKER_COLORS: Record<string, string> = {
  completion: 'text-emerald-600 dark:text-emerald-400',
  certainty: 'text-blue-600 dark:text-blue-400',
  priority: 'text-rose-600 dark:text-rose-400',
  rating: 'text-amber-500 dark:text-amber-400',
  weight: 'text-indigo-500 dark:text-indigo-400',
}

/**
 * Resolve the full class string for a marker glyph given its 0-3 score.
 * Higher score → higher opacity; score 0 renders as a faint placeholder.
 */
export const getMarkerClasses = (
  markerName: string,
  score: number,
  sizeClass = 'w-4 h-4',
): string => {
  const base = `transition-all duration-200 ease-in-out inline-flex items-center justify-center cursor-pointer shrink-0 overflow-hidden ${sizeClass}`

  if (score <= 0) {
    return `${base} text-slate-400 dark:text-slate-600 opacity-20 hover:opacity-40`
  }

  const opacity =
    score === 1
      ? 'opacity-40 hover:opacity-60'
      : score === 2
        ? 'opacity-70 hover:opacity-85'
        : 'opacity-100'

  const color = MARKER_COLORS[markerName] || 'text-slate-500'
  return `${base} ${color} ${opacity}`
}
