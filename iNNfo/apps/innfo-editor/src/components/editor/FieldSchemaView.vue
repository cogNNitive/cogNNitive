<template>
  <div data-testid="field-schema-view" class="field-schema-view">
    <div
      v-for="def in fieldDefinitions"
      :key="def.name"
      data-testid="field-schema-entry"
      class="py-2.5 first:pt-0 last:pb-0 border-b border-slate-100 dark:border-slate-700/60 last:border-b-0"
    >
      <!-- Field name + type badge -->
      <div class="flex items-center justify-between gap-3">
        <span
          class="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200 break-all"
          >{{ def.name }}</span
        >
        <span data-testid="field-type-badge" class="shrink-0">
          <Pill kind="instance" :color="typeBadgeColor(def.type)" :name="def.type" hide-empty />
        </span>
      </div>

      <!-- Metadata groups: only render groups that carry data -->
      <div v-if="hasMetadata(def)" class="mt-2 flex flex-col gap-1.5">
        <div v-if="def.options && def.options.length > 0" class="flex items-start gap-2">
          <span
            class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-14 shrink-0 pt-0.5"
            >Options</span
          >
          <div class="flex flex-wrap gap-1">
            <span
              v-for="opt in def.options"
              :key="opt"
              class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
            >
              {{ opt }}
            </span>
          </div>
        </div>

        <div
          v-if="def.target_concepts && def.target_concepts.length > 0"
          class="flex items-start gap-2"
        >
          <span
            class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-14 shrink-0 pt-0.5"
            >Targets</span
          >
          <div class="flex flex-wrap gap-1">
            <span
              v-for="t in def.target_concepts"
              :key="t"
              class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700"
            >
              [[{{ t }}]]
            </span>
          </div>
        </div>

        <div v-if="hasDefault(def)" class="flex items-start gap-2">
          <span
            class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 w-14 shrink-0 pt-0.5"
            >Default</span
          >
          <code class="text-[11px] font-medium text-slate-600 dark:text-slate-300 break-all">
            {{ formatDefault(def.default) }}
          </code>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <p
      v-if="fieldDefinitions.length === 0"
      class="text-xs text-slate-400 dark:text-slate-500 italic"
    >
      No fields defined for this concept.
    </p>
  </div>
</template>

<script setup lang="ts">
import Pill from './Pill.vue'

interface FieldSchema {
  name: string
  type: string
  options?: string[]
  target_concepts?: string[]
  default?: unknown
}

withDefaults(
  defineProps<{
    fieldDefinitions: FieldSchema[]
  }>(),
  {
    fieldDefinitions: () => [],
  },
)

/**
 * Color-coded Pill per field type, grouped by role. Unknown types fall
 * back to the neutral slate group so new widget types never render
 * unstyled. `black` is reserved for the Artifact identity color and
 * deliberately unused here.
 */
const TYPE_BADGE_COLORS: Record<string, string> = {
  string: 'slate',
  text: 'slate',
  category: 'slate',
  code: 'slate',
  mermaid: 'slate',
  diagram: 'slate',
  weight: 'slate',
  number: 'blue',
  url: 'blue',
  boolean: 'green',
  select: 'violet',
  multiselect: 'violet',
  tags: 'violet',
  togglegroup: 'violet',
  reference: 'indigo',
  date: 'amber',
  timestamp: 'amber',
  rating: 'amber',
  scale: 'amber',
  cycle: 'amber',
  color: 'orange',
  image: 'yellow',
  image_url: 'yellow',
  asset: 'yellow',
  file: 'yellow',
  video: 'yellow',
  audio: 'yellow',
  markdown: 'red',
  markdown_inline: 'red',
  markdown_file: 'red',
}

function typeBadgeColor(type: string): string {
  return TYPE_BADGE_COLORS[type] ?? 'slate'
}

function hasDefault(def: FieldSchema): boolean {
  return def.default !== undefined && def.default !== null && def.default !== ''
}

function formatDefault(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value === null || value === undefined) return ''
  return String(value)
}

function hasMetadata(def: FieldSchema): boolean {
  return Boolean(def.options?.length) || Boolean(def.target_concepts?.length) || hasDefault(def)
}
</script>
